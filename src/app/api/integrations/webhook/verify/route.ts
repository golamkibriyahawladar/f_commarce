import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url, token } = await req.json();

    if (!url || !token) {
      return NextResponse.json(
        { error: 'Webhook URL and verification token are required.' },
        { status: 400 }
      );
    }

    // Parse and validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid Webhook URL format.' },
        { status: 400 }
      );
    }

    // Generate random challenge string
    const challenge = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Set search parameters
    targetUrl.searchParams.set('hub.mode', 'subscribe');
    targetUrl.searchParams.set('hub.challenge', challenge);
    targetUrl.searchParams.set('hub.verify_token', token);

    // Call the user's webhook with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    try {
      console.log(`Verifying webhook: ${targetUrl.toString()}`);
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Autozy-Webhook-Verifier/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Verification failed. Webhook returned status code ${response.status}.` },
          { status: 400 }
        );
      }

      const responseText = await response.text();
      const trimmedResponse = responseText.trim();

      if (trimmedResponse === challenge) {
        return NextResponse.json({
          success: true,
          message: 'Webhook verified successfully.',
        });
      } else {
        // Truncate response in error message if it's too long
        const preview = trimmedResponse.length > 50 
          ? trimmedResponse.substring(0, 50) + '...' 
          : trimmedResponse;
        
        return NextResponse.json(
          { 
            error: 'Verification failed. The webhook did not return the challenge string verbatim.',
            details: {
              expected: challenge,
              received: preview || '(empty response)'
            }
          },
          { status: 400 }
        );
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Verification timed out. The webhook endpoint took too long to respond (limit: 6s).' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Connection failed: ${fetchErr.message || 'Unable to reach the webhook URL.'}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Webhook verification route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
