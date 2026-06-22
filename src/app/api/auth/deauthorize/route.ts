import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    // Decode signed request
    const [encodedSig, payload] = signedRequest.split('.');
    const secret = process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET || '';

    // Verify signature
    const decodedSig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (decodedSig !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    );

    const userId = data.user_id;
    console.log('Facebook user deauthorized app:', userId);

    // E.g., deactivate integrations linked to this facebook user if needed
    // const supabase = getSupabase();
    // await supabase.from('integrations').update({ status: 'inactive' })...

    return NextResponse.json({ status: 'success', userId });
  } catch (error) {
    console.error('Error handling deauthorize callback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
