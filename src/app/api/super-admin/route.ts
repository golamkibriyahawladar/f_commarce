import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAILS = [
  'dev@autozy.app',
  'golamkibriya1200@gmail.com',
  'golamkibriyahawladar@gmail.com',
  'admin@aichat.com'
];

function getSupabaseService() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getSupabaseAnon() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Helper to authenticate user and check if they are a whitelisted Super Admin
async function authenticateSuperAdmin(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Unauthorized: Missing Authorization header' };
    }

    const token = authHeader.split(' ')[1];
    const supabaseAnon = getSupabaseAnon();
    
    // Verify the JWT token and get user info
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return { authenticated: false, error: 'Unauthorized: Invalid token' };
    }

    // Retrieve user profile using Service Role Client to bypass RLS and verify email
    const supabaseService = getSupabaseService();
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { authenticated: false, error: 'Unauthorized: Profile not found' };
    }

    if (!SUPER_ADMIN_EMAILS.includes(profile.email)) {
      return { authenticated: false, error: 'Forbidden: You do not have Super Admin access' };
    }

    return { authenticated: true, user, profile };
  } catch (err: any) {
    return { authenticated: false, error: err.message || 'Internal authentication error' };
  }
}

// GET: Load all administration dashboard data
export async function GET(req: Request) {
  const auth = await authenticateSuperAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.error?.includes('Forbidden') ? 403 : 401 });
  }

  try {
    const supabase = getSupabaseService();

    // 1. Ensure a "system-admin" company exists to house system-wide settings
    let { data: systemCompany, error: systemCompanyError } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', 'system-admin')
      .maybeSingle();

    if (systemCompanyError) {
      throw systemCompanyError;
    }

    if (!systemCompany) {
      // Create system company
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'AiChat System Admin',
          slug: 'system-admin',
          settings: {
            global_openai_key: '',
            global_facebook_secret: '',
            global_courier_key: ''
          }
        })
        .select()
        .single();
      
      if (createError) throw createError;
      systemCompany = newCompany;
    }

    // 2. Fetch all companies, profiles, and integrations
    const [companiesRes, profilesRes, integrationsRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('integrations').select('*').order('created_at', { ascending: false })
    ]);

    if (companiesRes.error) throw companiesRes.error;
    if (profilesRes.error) throw profilesRes.error;
    if (integrationsRes.error) throw integrationsRes.error;

    return NextResponse.json({
      success: true,
      companies: companiesRes.data || [],
      profiles: profilesRes.data || [],
      integrations: integrationsRes.data || [],
      systemSettings: systemCompany.settings || {}
    });

  } catch (error: any) {
    console.error('Super Admin GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Handle writes (AI Agents, Global Credentials, and Merchant Status Updates)
export async function POST(req: Request) {
  const auth = await authenticateSuperAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.error?.includes('Forbidden') ? 403 : 401 });
  }

  try {
    const supabase = getSupabaseService();
    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    switch (action) {
      case 'saveGlobalCredentials': {
        const { openaiKey, fbSecret, courierKey } = payload;
        
        // Fetch current settings first
        const { data: systemCompany, error: fetchErr } = await supabase
          .from('companies')
          .select('id, settings')
          .eq('slug', 'system-admin')
          .single();
        
        if (fetchErr) throw fetchErr;

        const updatedSettings = {
          ...systemCompany.settings,
          global_openai_key: openaiKey,
          global_facebook_secret: fbSecret,
          global_courier_key: courierKey
        };

        const { error: updateError } = await supabase
          .from('companies')
          .update({ settings: updatedSettings })
          .eq('id', systemCompany.id);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, message: 'Global credentials saved successfully.' });
      }

      case 'toggleCompanyStatus': {
        const { companyId, isPaused } = payload;
        
        const { data: company, error: fetchErr } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', companyId)
          .single();
          
        if (fetchErr) throw fetchErr;

        const updatedSettings = {
          ...(company.settings || {}),
          is_paused: isPaused
        };

        const { error: updateError } = await supabase
          .from('companies')
          .update({ settings: updatedSettings })
          .eq('id', companyId);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, message: `Company status updated to ${isPaused ? 'paused' : 'active'}` });
      }

      case 'saveAgent': {
        const { agentId, companyId, name, systemPrompt, openaiKey, assignedIntegrations, status } = payload;
        
        const credentials = {
          name: name.trim(),
          system_prompt: systemPrompt.trim(),
          openai_key: openaiKey?.trim(),
          assigned_integrations: assignedIntegrations || []
        };

        if (agentId) {
          // Update agent
          const { error: updateError } = await supabase
            .from('integrations')
            .update({
              credentials,
              status: status || 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', agentId);

          if (updateError) throw updateError;
          return NextResponse.json({ success: true, message: 'AI Agent updated successfully.' });
        } else {
          // Insert agent
          const { error: insertError } = await supabase
            .from('integrations')
            .insert({
              company_id: companyId,
              provider: 'ai_agent',
              type: 'webhook',
              credentials,
              status: status || 'active'
            });

          if (insertError) throw insertError;
          return NextResponse.json({ success: true, message: 'AI Agent created successfully.' });
        }
      }

      case 'deleteAgent': {
        const { agentId } = payload;
        const { error: deleteError } = await supabase
          .from('integrations')
          .delete()
          .eq('id', agentId);

        if (deleteError) throw deleteError;
        return NextResponse.json({ success: true, message: 'AI Agent deleted successfully.' });
      }

      case 'assignAgent': {
        const { agentId, channelIds } = payload;
        
        // Fetch current credentials
        const { data: agent, error: fetchErr } = await supabase
          .from('integrations')
          .select('credentials')
          .eq('id', agentId)
          .single();
          
        if (fetchErr) throw fetchErr;

        const updatedCredentials = {
          ...(agent.credentials || {}),
          assigned_integrations: channelIds || []
        };

        const { error: updateError } = await supabase
          .from('integrations')
          .update({ credentials: updatedCredentials })
          .eq('id', agentId);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, message: 'AI Agent channels reassigned successfully.' });
      }

      default:
        return NextResponse.json({ error: `Action '${action}' is not supported.` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Super Admin POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
