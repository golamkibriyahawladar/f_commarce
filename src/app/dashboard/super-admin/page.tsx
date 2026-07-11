'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  Users, 
  Bot, 
  Plug, 
  Layers, 
  Key, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  PauseCircle, 
  PlayCircle, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Globe,
  Facebook,
  Instagram,
  MessageCircle,
  Webhook,
  Activity,
  Server,
  Terminal,
  HelpCircle,
  X
} from 'lucide-react';

const SUPER_ADMIN_EMAILS = [
  'dev@autozy.app',
  'golamkibriya1200@gmail.com',
  'golamkibriyahawladar@gmail.com',
  'admin@aichat.com'
];

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: {
    is_paused?: boolean;
    [key: string]: any;
  };
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'manager' | 'agent';
  company_id: string | null;
  created_at: string;
}

interface Integration {
  id: string;
  company_id: string;
  provider: string;
  type: string;
  credentials: {
    name?: string;
    system_prompt?: string;
    openai_key?: string;
    assigned_integrations?: string[];
    [key: string]: any;
  };
  webhook_url?: string;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuthStore();
  
  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [globalOpenaiKey, setGlobalOpenaiKey] = useState('');
  const [globalFbSecret, setGlobalFbSecret] = useState('');
  const [globalCourierKey, setGlobalCourierKey] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'credentials' | 'agents'>('overview');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Agent Modal State
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Integration | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('');
  const [agentOpenaiKey, setAgentOpenaiKey] = useState('');
  const [agentAssignedIntegrations, setAgentAssignedIntegrations] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<'active' | 'inactive'>('active');
  
  // Queue Settings
  const [queueWorkers, setQueueWorkers] = useState(1);
  const [queueBatchSize, setQueueBatchSize] = useState(10);
  const [queueDelayMs, setQueueDelayMs] = useState(1000);

  const [showKey, setShowKey] = useState(false);
  const [showGlobalKeys, setShowGlobalKeys] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning'; visible: boolean }>({ message: '', type: 'success', visible: false });
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No session token available.');

      const res = await fetch('/api/super-admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch admin data.');
      }

      const result = await res.json();
      setCompanies(result.companies);
      setProfiles(result.profiles);
      setIntegrations(result.integrations);
      
      const settings = result.systemSettings || {};
      setGlobalOpenaiKey(settings.global_openai_key || '');
      setGlobalFbSecret(settings.global_facebook_secret || '');
      setGlobalCourierKey(settings.global_courier_key || '');

      // Set default selected company for AI agents tab if none set
      if (result.companies.length > 0 && !selectedCompanyId) {
        // Skip the system-admin company if possible
        const firstMerchant = result.companies.find((c: Company) => c.slug !== 'system-admin');
        setSelectedCompanyId(firstMerchant?.id || result.companies[0].id);
      }

    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, showToast]);

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (SUPER_ADMIN_EMAILS.includes(profile.email)) {
        fetchAdminData();
      }
    }
  }, [authLoading, user, profile, fetchAdminData]);

  // Guard Clause
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-zinc-500 font-medium text-sm">Authenticating Admin Session...</p>
      </div>
    );
  }

  if (!profile || !SUPER_ADMIN_EMAILS.includes(profile.email)) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-white border border-red-200 rounded-2xl shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Access Denied</h2>
        <p className="text-sm text-zinc-500 mt-2">
          Your account ({profile?.email || 'Guest'}) does not have permission to view the Super Admin Hub.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Return to Workspace Overview
        </button>
      </div>
    );
  }

  // --- Handlers ---
  const handleSaveGlobalCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'saveGlobalCredentials',
          payload: {
            openaiKey: globalOpenaiKey,
            fbSecret: globalFbSecret,
            courierKey: globalCourierKey
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save global credentials.');
      }

      showToast('Global Credentials Saved Successfully', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCompany = async (companyId: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'toggleCompanyStatus',
          payload: {
            companyId,
            isPaused: !currentStatus
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to toggle status.');
      }

      showToast(`Merchant ${!currentStatus ? 'Paused' : 'Activated'} Successfully`, 'success');
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  const handleOpenCreateAgent = () => {
    if (!selectedCompanyId) {
      showToast('Please select a company/merchant first.', 'warning');
      return;
    }
    setSelectedAgent(null);
    setAgentName('');
    setAgentSystemPrompt('You are an AI assistant designed to handle customer queries.');
    setAgentOpenaiKey('');
    setAgentAssignedIntegrations([]);
    setAgentStatus('active');
    
    // Reset Queue Settings
    setQueueWorkers(1);
    setQueueBatchSize(10);
    setQueueDelayMs(1000);

    setShowKey(false);
    setAgentModalOpen(true);
  };

  const handleOpenEditAgent = (agent: Integration) => {
    setSelectedAgent(agent);
    setAgentName(agent.credentials.name || '');
    setAgentSystemPrompt(agent.credentials.system_prompt || '');
    setAgentOpenaiKey(agent.credentials.openai_key ? '••••••••' : '');
    setAgentAssignedIntegrations(agent.credentials.assigned_integrations || []);
    setAgentStatus(agent.status === 'active' ? 'active' : 'inactive');
    
    // Load Queue Settings
    const qs = agent.credentials.queue_settings || {};
    setQueueWorkers(qs.workers || 1);
    setQueueBatchSize(qs.batch_size || 10);
    setQueueDelayMs(qs.delay_ms !== undefined ? qs.delay_ms : 1000);

    setShowKey(false);
    setAgentModalOpen(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentSystemPrompt.trim()) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let finalKey = agentOpenaiKey;
      if (selectedAgent && agentOpenaiKey === '••••••••') {
        finalKey = selectedAgent.credentials.openai_key || '';
      }

      const res = await fetch('/api/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'saveAgent',
          payload: {
            agentId: selectedAgent?.id || null,
            companyId: selectedCompanyId,
            name: agentName,
            systemPrompt: agentSystemPrompt,
            openaiKey: finalKey,
            assignedIntegrations: agentAssignedIntegrations,
            status: agentStatus,
            queue_settings: {
              workers: queueWorkers,
              batch_size: queueBatchSize,
              delay_ms: queueDelayMs
            }
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save AI Agent.');
      }

      showToast(selectedAgent ? 'Agent updated successfully' : 'Agent created successfully', 'success');
      setAgentModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this AI Agent? This cannot be undone.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'deleteAgent',
          payload: { agentId }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete AI Agent.');
      }

      showToast('AI Agent deleted successfully.', 'success');
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  const handleToggleAgentChannel = (channelId: string) => {
    setAgentAssignedIntegrations(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  // --- Helpers for Display ---
  const getChannelDetails = (channel: Integration) => {
    let title = channel.provider.toUpperCase();
    let icon = <Globe className="w-4 h-4 text-zinc-500" />;

    if (channel.provider === 'facebook') {
      title = channel.credentials?.page_name || 'Facebook Page';
      icon = <Facebook className="w-4 h-4 text-blue-600 shrink-0" />;
    } else if (channel.provider === 'instagram') {
      title = channel.credentials?.page_name || 'Instagram DM';
      icon = <Instagram className="w-4 h-4 text-pink-600 shrink-0" />;
    } else if (channel.provider === 'whatsapp') {
      title = 'WhatsApp Business';
      icon = <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
    } else if (channel.provider === 'webhook') {
      title = channel.credentials?.name || 'Custom Webhook';
      icon = <Webhook className="w-4 h-4 text-indigo-500 shrink-0" />;
    }

    return { title, icon };
  };

  // --- Filtering Calculations ---
  const systemCompany = companies.find(c => c.slug === 'system-admin');
  const merchantsList = companies.filter(c => c.slug !== 'system-admin');
  
  const filteredMerchants = merchantsList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const companyChannels = integrations.filter(i => i.company_id === selectedCompanyId && i.provider !== 'ai_agent');
  const companyAgents = integrations.filter(i => i.company_id === selectedCompanyId && i.provider === 'ai_agent');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            Super Admin Control Suite
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Global platform metrics, tenant supervision, secret gate controls, and agent deployments.</p>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 text-xs bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 duration-200 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Refresh Database
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'overview' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-zinc-650 hover:text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('merchants')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'merchants' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-zinc-650 hover:text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Merchant Manager
          </div>
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'agents' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-zinc-650 hover:text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Deployer
          </div>
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'credentials' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-zinc-650 hover:text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Global Keys Vault
          </div>
        </button>
      </div>

      {/* Loading Overlay */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-24 text-center shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Loading platform records...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-28">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Total Merchants</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{merchantsList.length}</h3>
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-28">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Total Active Users</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{profiles.length}</h3>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-28">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Active Channels</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                      {integrations.filter(i => i.provider !== 'ai_agent').length}
                    </h3>
                    <Plug className="w-5 h-5 text-amber-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-28">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Deployed AI Agents</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                      {integrations.filter(i => i.provider === 'ai_agent').length}
                    </h3>
                    <Bot className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Server Stats Terminal */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-lg text-zinc-200 font-mono text-xs space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>SYSTEM SHELL MONITOR</span>
                  </div>
                  <span className="text-[10px] bg-zinc-850 px-2 py-0.5 rounded border border-zinc-800 text-emerald-400">ONLINE</span>
                </div>
                <div className="space-y-1.5 leading-relaxed text-zinc-350">
                  <p><span className="text-emerald-400">root@aichat:~$</span> get-platform-diagnostics --verbose</p>
                  <p className="text-zinc-450">[Info] Database: Supabase PostgreSQL 16.2 Clusters online.</p>
                  <p className="text-zinc-450">[Info] Real-time Layer: WebSockets connections running.</p>
                  <p className="text-zinc-450">[Info] Autopilot routing: openai/gpt-4o-mini active via agent executor.</p>
                  <p className="text-zinc-450">[Info] Tenant separation RLS: Enabled & enforces active check boundaries.</p>
                  <p className="text-zinc-400 mt-2 font-semibold">Active Tenants Status:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {merchantsList.slice(0, 3).map(m => (
                      <li key={m.id}>
                        Merchant Slug: <span className="text-white">{m.slug}</span> — status: <span className={m.settings.is_paused ? 'text-amber-500' : 'text-emerald-400'}>{m.settings.is_paused ? 'PAUSED' : 'ACTIVE'}</span>
                      </li>
                    ))}
                    {merchantsList.length > 3 && <li>...and {merchantsList.length - 3} other merchant workspaces.</li>}
                  </ul>
                </div>
              </div>

            </div>
          )}

          {/* MERCHANT MANAGER TAB */}
          {activeTab === 'merchants' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search merchant name or slug..."
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 text-xs">
                  <thead className="bg-zinc-50 font-bold text-zinc-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5 text-left">Merchant Info</th>
                      <th className="px-6 py-3.5 text-left">Workspace ID</th>
                      <th className="px-6 py-3.5 text-left">Created Date</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800">
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-zinc-400 font-semibold">
                          No merchants match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((merchant) => {
                        const isPaused = merchant.settings?.is_paused === true;
                        
                        return (
                          <tr key={merchant.id} className={isPaused ? 'bg-zinc-50/50 opacity-80' : ''}>
                            <td className="px-6 py-4">
                              <div className="font-bold text-zinc-950 text-sm">{merchant.name}</div>
                              <div className="text-[10px] text-zinc-500 font-semibold font-mono mt-0.5">/{merchant.slug}</div>
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-zinc-500">
                              {merchant.id}
                            </td>
                            <td className="px-6 py-4 text-zinc-500">
                              {new Date(merchant.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border border-current ${
                                isPaused ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {isPaused ? 'PAUSED' : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleToggleCompany(merchant.id, isPaused)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                                  isPaused 
                                    ? 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-700' 
                                    : 'bg-amber-50 hover:bg-amber-100/70 border-amber-200 text-amber-700'
                                }`}
                              >
                                {isPaused ? (
                                  <>
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    Activate Merchant
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    Pause Merchant
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* AI DEPLOYER TAB */}
          {activeTab === 'agents' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Select Merchant */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Merchant Company</label>
                  <p className="text-[10px] text-zinc-400">Choose which merchant workspace you want to deploy, assign, or edit AI Agents for.</p>
                </div>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full max-w-md px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs font-semibold text-zinc-800 transition-colors"
                >
                  {merchantsList.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.slug})</option>
                  ))}
                </select>
              </div>

              {/* Agent and Channel Management Interface */}
              {selectedCompanyId && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: List AI Agents */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-zinc-950">
                        AI Agents in {selectedCompany?.name} ({companyAgents.length})
                      </h3>
                      <button
                        onClick={handleOpenCreateAgent}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create AI Agent
                      </button>
                    </div>

                    {companyAgents.length === 0 ? (
                      <div className="bg-white border border-zinc-200 rounded-2xl p-16 text-center shadow-sm">
                        <Bot className="w-12 h-12 text-zinc-300 mx-auto mb-2 animate-pulse" />
                        <h4 className="font-bold text-zinc-800 text-sm">No AI Agents Configured</h4>
                        <p className="text-zinc-500 text-[10px] mt-0.5">Create an AI Agent configuration for this company to automate their replies.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {companyAgents.map((agent) => {
                          const assignedIds = agent.credentials?.assigned_integrations || [];
                          return (
                            <div key={agent.id} className="bg-white rounded-2xl border border-zinc-250 p-5 shadow-sm flex flex-col justify-between h-64 overflow-hidden relative group">
                              <div className="space-y-3 flex-1 overflow-hidden">
                                <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-zinc-950 text-sm truncate max-w-[130px]">{agent.credentials.name || 'AI Assistant'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => handleOpenEditAgent(agent)}
                                      className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteAgent(agent.id)}
                                      className="p-1 rounded hover:bg-red-50 text-zinc-500 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">System Prompt</span>
                                  <p className="text-[10px] text-zinc-500 line-clamp-3 bg-zinc-50 border border-zinc-100 p-2 rounded-lg italic">
                                    "{agent.credentials.system_prompt}"
                                  </p>
                                </div>
                              </div>

                              {/* Footer: assigned integrations list */}
                              <div className="border-t border-zinc-100 pt-3 mt-3">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Assigned Channels ({assignedIds.length})</span>
                                {assignedIds.length === 0 ? (
                                  <span className="text-[10px] italic text-zinc-400">No channels assigned</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                                    {assignedIds.map((id) => {
                                      const chan = companyChannels.find(c => c.id === id);
                                      if (!chan) return null;
                                      const details = getChannelDetails(chan);
                                      return (
                                        <div key={id} className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded text-[9px] font-semibold text-zinc-700">
                                          {details.icon}
                                          <span>{details.title}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: List Merchant Channels */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950">Active Communication Channels</h3>
                    
                    {companyChannels.length === 0 ? (
                      <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-center shadow-sm">
                        <Plug className="w-8 h-8 text-zinc-300 mx-auto mb-1" />
                        <p className="text-zinc-500 text-[10px]">No active communication integrations (FB Pages, Webhooks) are linked to this workspace yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companyChannels.map((channel) => {
                          const details = getChannelDetails(channel);
                          // Find which agent is currently assigned to this channel
                          const assignedAgent = companyAgents.find(a => 
                            a.credentials?.assigned_integrations?.includes(channel.id)
                          );

                          return (
                            <div key={channel.id} className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-sm flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg">
                                  {details.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-zinc-900 text-xs truncate">{details.title}</div>
                                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5 truncate">{channel.id}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {assignedAgent ? (
                                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <Bot className="w-3 h-3" />
                                    {assignedAgent.credentials.name || 'AI Agent'}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-zinc-400 font-bold border border-zinc-200 px-2 py-0.5 rounded-full bg-zinc-50">
                                    NO AGENT
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* GLOBAL CREDENTIALS TAB */}
          {activeTab === 'credentials' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">System API secret vault</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Encrypt and register tokens used as platform-wide parameters when tenants lack keys.</p>
                </div>

                <form onSubmit={handleSaveGlobalCredentials} className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Global OpenAI API Key</label>
                      <span className="text-[10px] text-zinc-400">Provides backup key for AI agent responses</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showGlobalKeys ? 'text' : 'password'}
                        placeholder="sk-proj-..."
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono text-zinc-800"
                        value={globalOpenaiKey}
                        onChange={(e) => setGlobalOpenaiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGlobalKeys(!showGlobalKeys)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-750 cursor-pointer"
                      >
                        {showGlobalKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Global Facebook App Secret</label>
                    <input
                      type="password"
                      placeholder="e.g. 0ac7..."
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono text-zinc-800"
                      value={globalFbSecret}
                      onChange={(e) => setGlobalFbSecret(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Global Courier (Steadfast) API Key</label>
                    <input
                      type="text"
                      placeholder="e.g. sf_api_..."
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono text-zinc-800"
                      value={globalCourierKey}
                      onChange={(e) => setGlobalCourierKey(e.target.value)}
                    />
                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-md hover:shadow-emerald-600/10 cursor-pointer flex items-center gap-2"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Global Configuration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* CREATE / EDIT AGENT MODAL */}
      {agentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form 
            onSubmit={handleSaveAgent}
            className="bg-white w-full max-w-xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-150 shrink-0 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <Bot className="w-5.5 h-5.5 text-emerald-600" />
                <h3 className="text-lg font-bold text-zinc-900">
                  {selectedAgent ? 'Edit Tenant AI Agent' : 'Create Tenant AI Agent'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setAgentModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
              
              {/* Agent Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">AI Agent Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sales Copilot"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-250 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-zinc-800 text-xs placeholder-zinc-400 transition-colors"
                  required
                />
              </div>

              {/* System Instructions / Prompt */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">System Instructions / Prompt</label>
                  <span className="text-[10px] text-zinc-400 font-semibold">Sets the agent's behavior</span>
                </div>
                <textarea 
                  rows={4}
                  placeholder="E.g. 'You are a helpdesk agent. Answer queries nicely...'"
                  value={agentSystemPrompt}
                  onChange={(e) => setAgentSystemPrompt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-250 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-zinc-800 text-xs placeholder-zinc-400 transition-colors resize-none font-mono"
                  required
                />
              </div>

              {/* OpenAI Key */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Custom OpenAI API Key (Optional)</label>
                  <span className="text-[10px] text-zinc-400 font-medium">Falls back to server system key if empty</span>
                </div>
                <div className="relative">
                  <input 
                    type={showKey ? 'text' : 'password'} 
                    placeholder="sk-..."
                    value={agentOpenaiKey}
                    onChange={(e) => setAgentOpenaiKey(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-zinc-250 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-zinc-800 text-xs placeholder-zinc-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-zinc-450 hover:text-zinc-750"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Channels Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Deploy to Communication Channels</label>
                
                {companyChannels.length === 0 ? (
                  <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 text-center">
                    <p className="text-zinc-500 text-xs">No active social or webhook channels configured for this merchant.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                    {companyChannels.map((chan) => {
                      const details = getChannelDetails(chan);
                      const isSelected = agentAssignedIntegrations.includes(chan.id);

                      return (
                        <button
                          key={chan.id}
                          type="button"
                          onClick={() => handleToggleAgentChannel(chan.id)}
                          className={`flex items-center justify-between p-2.5 border rounded-xl transition-all text-left active:scale-[0.98] duration-150 cursor-pointer ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50/15'
                              : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg border ${
                              isSelected ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-zinc-50 border-zinc-100 text-zinc-500'
                            }`}>
                              {details.icon}
                            </div>
                            <span className="font-semibold text-xs text-zinc-800 truncate pr-2">{details.title}</span>
                          </div>

                          <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Selector */}
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-850 uppercase tracking-wider">Agent Status</label>
                  <p className="text-zinc-400 text-[10px] mt-0.5">Toggle whether this agent is active.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAgentStatus('active')}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      agentStatus === 'active'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentStatus('inactive')}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      agentStatus === 'inactive'
                        ? 'bg-zinc-800 border-zinc-850 text-white shadow-sm'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              {/* Queue Orchestrator Settings */}
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-2">
                <div className="w-full">
                  <h4 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Worker & Queue Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Workers</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={queueWorkers}
                        onChange={e => setQueueWorkers(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-900"
                      />
                      <p className="text-[9px] text-zinc-500">Parallel API calls</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Batch Size</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={queueBatchSize}
                        onChange={e => setQueueBatchSize(parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-900"
                      />
                      <p className="text-[9px] text-zinc-500">Messages per run</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Delay (ms)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={queueDelayMs}
                        onChange={e => setQueueDelayMs(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-900"
                      />
                      <p className="text-[9px] text-zinc-500">Gap between LLM calls</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-150 shrink-0 flex gap-3 bg-zinc-50/50">
              <button 
                type="button" 
                onClick={() => setAgentModalOpen(false)}
                className="flex-1 py-2 px-4 border border-zinc-300 text-xs font-bold text-zinc-700 rounded-lg hover:bg-zinc-50 bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-600/10 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Saving...' : selectedAgent ? 'Save Changes' : 'Create Agent'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      <div 
        className={`fixed bottom-6 right-6 z-[100] max-w-md transition-all duration-500 ease-out ${
          toast.visible 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
          toast.type === 'success' ? 'bg-zinc-950/90 border-emerald-700/50 text-emerald-50' :
          toast.type === 'error' ? 'bg-red-950/90 border-red-700/50 text-red-50' :
          'bg-zinc-900/90 border-zinc-700/50 text-zinc-50'
        }`}>
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      </div>

    </div>
  );
}
