import { NextResponse } from 'next/server';
import crypto from 'crypto';

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
    console.log('Facebook user data deletion requested:', userId);

    // Generate a unique tracking confirmation code
    const confirmationCode = `del_${userId}_${Date.now()}`;

    // Here you would typically trigger user data cleanup in your database

    return NextResponse.json({
      url: `https://f-commarce.vercel.app/privacy-policy?deletion_code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  } catch (error) {
    console.error('Error handling data deletion callback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
