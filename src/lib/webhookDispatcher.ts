import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface WebhookEventPayload {
  event: string;
  company_id: string;
  timestamp: string;
  data: any;
}

/**
 * Triggers outgoing webhooks for a specific company when an event occurs.
 * 
 * @param companyId The ID of the company
 * @param event The event type (e.g. 'message.created')
 * @param data The payload data containing event details
 */
export async function triggerCompanyWebhooks(
  companyId: string,
  event: string,
  data: any
) {
  try {
    if (!companyId) return;

    const supabase = getSupabase();

    // Fetch active webhook integrations for this company
    const { data: webhooks, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('provider', 'webhook')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching company webhooks:', error);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`No active webhooks configured for company ${companyId}.`);
      return;
    }

    const payload: WebhookEventPayload = {
      event,
      company_id: companyId,
      timestamp: new Date().toISOString(),
      data
    };

    const payloadString = JSON.stringify(payload);

    // Dispatch webhook calls concurrently
    const dispatchPromises = webhooks.map(async (webhook) => {
      const url = webhook.webhook_url;
      const secret = webhook.webhook_secret || '';

      if (!url) return;

      // Compute HMAC-SHA256 signature
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      try {
        console.log(`Dispatching webhook event '${event}' to ${url}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'User-Agent': 'Autozy-Webhook-Dispatcher/1.0'
          },
          body: payloadString
        });

        if (response.ok) {
          console.log(`Webhook dispatched successfully to ${url}. Status: ${response.status}`);
        } else {
          console.error(`Webhook delivery failed to ${url}. Status: ${response.status}`);
        }
      } catch (deliveryErr: any) {
        console.error(`Error delivering webhook to ${url}:`, deliveryErr.message || deliveryErr);
      }
    });

    // Run deliveries in the background without blocking the main request cycle
    Promise.all(dispatchPromises).catch(err => {
      console.error('Webhook dispatch thread error:', err);
    });

  } catch (error) {
    console.error('Failed to trigger company webhooks:', error);
  }
}
