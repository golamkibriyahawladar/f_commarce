export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseService() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Fetch global API settings
async function getGlobalSettings(supabase: any) {
  const { data } = await supabase
    .from('companies')
    .select('settings')
    .eq('slug', 'system-admin')
    .maybeSingle();
  return data?.settings || {};
}

export async function POST(req: Request) {
  try {
    const { provider, apiKey, companyId, agentId } = await req.json();

    if (!provider || !companyId) {
      return NextResponse.json({ error: 'Missing required parameters: provider and companyId' }, { status: 400 });
    }

    const supabase = getSupabaseService();
    let resolvedKey = '';

    // If key is provided and not masked, use it
    if (apiKey && apiKey !== '••••••••' && apiKey.trim() !== '') {
      resolvedKey = apiKey.trim();
    } else {
      // 1. If agentId is provided, try loading agent's credentials
      if (agentId) {
        const { data: agent } = await supabase
          .from('integrations')
          .select('credentials')
          .eq('id', agentId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (agent?.credentials) {
          resolvedKey = provider === 'openai' 
            ? agent.credentials.openai_key 
            : agent.credentials.gemini_key;
        }
      }
      
      // 2. If no agent custom key, check user's company settings key
      if (!resolvedKey && companyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', companyId)
          .maybeSingle();
        
        if (company?.settings) {
          resolvedKey = provider === 'openai'
            ? (company.settings.openai_key || company.settings.openaiKey)
            : (company.settings.gemini_key || company.settings.geminiKey);
        }
      }

      // 3. Fall back to system admin settings key
      if (!resolvedKey) {
        const globalSettings = await getGlobalSettings(supabase);
        resolvedKey = provider === 'openai'
          ? globalSettings.global_openai_key
          : globalSettings.global_gemini_key;
      }
    }

    if (!resolvedKey) {
      return NextResponse.json({ error: `No API key configured for ${provider}. Please enter a key.` }, { status: 400 });
    }

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${resolvedKey}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        return NextResponse.json({ error: errData.error?.message || 'OpenAI API request failed' }, { status: response.status });
      }

      const data = await response.json();
      // Filter chat/completion models
      const models = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => 
          id.startsWith('gpt-') || 
          id.startsWith('o1-') || 
          id.startsWith('o3-')
        )
        .sort();

      return NextResponse.json({ success: true, models });
    } else if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${resolvedKey}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return NextResponse.json({ error: errData.error?.message || 'Gemini API request failed' }, { status: response.status });
      }

      const data = await response.json();
      // Filter generation models
      const models = (data.models || [])
        .map((m: any) => m.name.replace('models/', ''))
        .filter((id: string) => 
          id.includes('gemini-') && 
          !id.includes('embed') && 
          !id.includes('translation') && 
          !id.includes('bidi')
        )
        .sort();

      return NextResponse.json({ success: true, models });
    } else {
      return NextResponse.json({ error: 'Unsupported provider: ' + provider }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Fetch models error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 550 });
  }
}
