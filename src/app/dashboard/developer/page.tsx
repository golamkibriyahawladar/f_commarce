'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import {
  Code2,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Loader2,
  Terminal,
  Braces,
  Shield,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Zap,
  Users,
  MessageSquare,
  FileText
} from 'lucide-react';

interface WebhookToken {
  id: string;
  company_id: string;
  token: string;
  name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const APP_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://f-commarce.vercel.app';

export default function DeveloperPage() {
  const { profile, user } = useAuthStore();

  // State
  const [tokens, setTokens] = useState<WebhookToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [showTokenIds, setShowTokenIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<'message' | 'lead' | 'customer'>('message');
  const [selectedTokenForCurl, setSelectedTokenForCurl] = useState<string>('');
  const [expandedSchema, setExpandedSchema] = useState<string | null>('message');
  const [initializingIntegration, setInitializingIntegration] = useState(false);

  // Outgoing Webhook State
  const [outgoingUrl, setOutgoingUrl] = useState('');
  const [outgoingSecret, setOutgoingSecret] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; tokenId: string; tokenName: string }>({ open: false, tokenId: '', tokenName: '' });
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({ message: '', type: 'info', visible: false });
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  }, []);

  // Get auth header
  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  };

  // Initialize developer integration (auto-create if not exists)
  const initializeDeveloperIntegration = useCallback(async () => {
    if (!profile?.company_id) return;
    setInitializingIntegration(true);
    try {
      // Check if developer_api integration already exists
      const { data: existing, error: fetchErr } = await supabase
        .from('integrations')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('provider', 'developer_api')
        .single();

      if (existing) {
        setIntegrationId(existing.id);
      } else {
        // Auto-create the developer_api integration
        const { data: newInt, error: createErr } = await supabase
          .from('integrations')
          .insert({
            company_id: profile.company_id,
            provider: 'developer_api',
            type: 'webhook',
            credentials: { name: 'Developer API Endpoint' },
            webhook_url: '',
            webhook_secret: '',
            status: 'active'
          })
          .select('id')
          .single();

        if (createErr) throw createErr;
        if (newInt) setIntegrationId(newInt.id);
      }
    } catch (err: any) {
      console.error('Error initializing developer integration:', err);
      // Don't show toast for expected "no rows" error
    } finally {
      setInitializingIntegration(false);
    }
  }, [profile?.company_id]);

  // Fetch tokens
  const fetchTokens = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const token = await getAuthHeader();
      const res = await fetch('/api/webhook-tokens', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTokens(data.tokens || []);
        // Auto-select first token for cURL
        if (data.tokens?.length > 0 && !selectedTokenForCurl) {
          setSelectedTokenForCurl(data.tokens[0].token);
        }
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  // Fetch outgoing webhook
  const fetchOutgoingWebhook = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const token = await getAuthHeader();
      const res = await fetch('/api/integrations/webhook', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.webhook) {
        setOutgoingUrl(data.webhook.webhook_url || '');
        setOutgoingSecret(data.webhook.webhook_secret || '');
      }
    } catch (err) {
      console.error('Error fetching outgoing webhook:', err);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id) {
      initializeDeveloperIntegration();
      fetchTokens();
      fetchOutgoingWebhook();
    }
  }, [profile?.company_id, initializeDeveloperIntegration, fetchTokens, fetchOutgoingWebhook]);

  // Save outgoing webhook
  const handleSaveOutgoingWebhook = async () => {
    setSavingWebhook(true);
    try {
      const authToken = await getAuthHeader();
      const res = await fetch('/api/integrations/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ webhook_url: outgoingUrl, webhook_secret: outgoingSecret })
      });
      if (res.ok) {
        showToast('Outgoing webhook saved successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save webhook.', 'error');
      }
    } catch (err) {
      showToast('Failed to save webhook.', 'error');
    } finally {
      setSavingWebhook(false);
    }
  };

  // Generate token
  const handleGenerateToken = async () => {
    if (!newTokenName.trim()) {
      showToast('Please enter a token name.', 'error');
      return;
    }
    setGenerating(true);
    try {
      const authToken = await getAuthHeader();
      const res = await fetch('/api/webhook-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: newTokenName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Token generated successfully!', 'success');
        setNewTokenName('');
        fetchTokens();
        // Auto-select the new token
        if (data.token?.token) {
          setSelectedTokenForCurl(data.token.token);
        }
      } else {
        showToast(data.error || 'Failed to generate token.', 'error');
      }
    } catch (err: any) {
      showToast('Failed to generate token.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Delete token
  const handleDeleteToken = async () => {
    setDeleting(true);
    try {
      const authToken = await getAuthHeader();
      const res = await fetch('/api/webhook-tokens', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token_id: deleteModal.tokenId })
      });
      if (res.ok) {
        showToast('Token revoked successfully.', 'success');
        setTokens(prev => prev.filter(t => t.id !== deleteModal.tokenId));
        if (selectedTokenForCurl && tokens.find(t => t.id === deleteModal.tokenId)?.token === selectedTokenForCurl) {
          const remaining = tokens.filter(t => t.id !== deleteModal.tokenId);
          setSelectedTokenForCurl(remaining[0]?.token || '');
        }
        setDeleteModal({ open: false, tokenId: '', tokenName: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to revoke token.', 'error');
      }
    } catch (err) {
      showToast('Failed to revoke token.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle token visibility
  const toggleShowToken = (id: string) => {
    setShowTokenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Webhook URL
  const webhookUrl = integrationId ? `${APP_BASE_URL}/api/webhooks/custom/${integrationId}` : '';

  // cURL command builder
  const buildCurl = (scope: 'message' | 'lead' | 'customer') => {
    const token = selectedTokenForCurl || '<YOUR_TOKEN>';
    const url = webhookUrl || '<WEBHOOK_URL>';

    const payloads: Record<string, string> = {
      message: JSON.stringify({
        type: 'message',
        sender_psid: 'user_12345',
        sender_name: 'John Doe',
        message_text: 'Hello, I want to order 2 products!'
      }, null, 2),
      lead: JSON.stringify({
        type: 'lead',
        name: 'Jane Smith',
        phone: '+8801712345678',
        email: 'jane@example.com',
        source: 'website_form',
        campaign_name: 'Summer Sale 2025'
      }, null, 2),
      customer: JSON.stringify({
        type: 'customer',
        name: 'Ahmed Rahman',
        phone: '+8801812345678',
        email: 'ahmed@example.com',
        shipping_address: 'House 12, Road 5, Dhanmondi, Dhaka'
      }, null, 2)
    };

    return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '${payloads[scope]}'`;
  };

  // JSON Schemas
  const schemas: Record<string, { title: string; icon: React.ReactNode; description: string; fields: { name: string; type: string; required: boolean; description: string }[]; example: object }> = {
    message: {
      title: 'Message',
      icon: <MessageSquare className="w-4 h-4" />,
      description: 'Send a customer message that creates a conversation in the Inbox.',
      fields: [
        { name: 'type', type: 'string', required: true, description: '"message"' },
        { name: 'sender_psid', type: 'string', required: true, description: 'Unique sender identifier (your customer ID)' },
        { name: 'sender_name', type: 'string', required: false, description: 'Customer display name (default: "Webhook User")' },
        { name: 'message_text', type: 'string', required: true, description: 'The message content/text' }
      ],
      example: { type: 'message', sender_psid: 'user_12345', sender_name: 'John Doe', message_text: 'Hello!' }
    },
    lead: {
      title: 'Lead',
      icon: <FileText className="w-4 h-4" />,
      description: 'Create a new lead entry in your Meta Leads pipeline.',
      fields: [
        { name: 'type', type: 'string', required: true, description: '"lead"' },
        { name: 'name', type: 'string', required: true, description: 'Lead name' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'email', type: 'string', required: false, description: 'Email address' },
        { name: 'source', type: 'string', required: false, description: 'Lead source (e.g. "website", "landing_page")' },
        { name: 'campaign_name', type: 'string', required: false, description: 'Marketing campaign name' }
      ],
      example: { type: 'lead', name: 'Jane Smith', phone: '+8801712345678', email: 'jane@example.com', source: 'website_form' }
    },
    customer: {
      title: 'Customer',
      icon: <Users className="w-4 h-4" />,
      description: 'Create or update a customer profile in your CRM.',
      fields: [
        { name: 'type', type: 'string', required: true, description: '"customer"' },
        { name: 'name', type: 'string', required: true, description: 'Customer full name' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'email', type: 'string', required: false, description: 'Email address' },
        { name: 'shipping_address', type: 'string', required: false, description: 'Shipping/delivery address' },
        { name: 'meta_data', type: 'object', required: false, description: 'Any additional custom data' }
      ],
      example: { type: 'customer', name: 'Ahmed Rahman', phone: '+8801812345678', shipping_address: 'Dhanmondi, Dhaka' }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Apps & API</h1>
          <p className="text-sm text-zinc-500 mt-1">Connect and manage your social channels, messaging apps, and custom webhooks.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-zinc-200 mb-8">
        <Link href="/dashboard/integrations" className="text-zinc-500 hover:text-zinc-700 font-medium pb-3 px-1 text-sm transition-colors">
          Integrations
        </Link>
        <Link href="/dashboard/developer" className="border-b-2 border-emerald-600 text-emerald-700 font-semibold pb-3 px-1 text-sm">
          Developer API
        </Link>
        <Link href="/dashboard/credentials" className="text-zinc-500 hover:text-zinc-700 font-medium pb-3 px-1 text-sm transition-colors">
          Credentials
        </Link>
        <Link href="/dashboard/knowledge-base" className="text-zinc-500 hover:text-zinc-700 font-medium pb-3 px-1 text-sm transition-colors">
          Knowledge Base
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Column: Tokens + Webhook URL */}
        <div className="xl:col-span-1 space-y-6">

          {/* Webhook Endpoint URL Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" />
                Webhook Endpoint
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Your unique incoming webhook URL</p>
            </div>
            <div className="p-5">
              {initializingIntegration ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Initializing endpoint...
                </div>
              ) : webhookUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-zinc-50 px-3 py-2.5 rounded-xl border border-zinc-200">
                    <code className="text-[10px] font-mono text-zinc-700 truncate flex-1 select-all">{webhookUrl}</code>
                    <button
                      onClick={() => copyToClipboard(webhookUrl, 'webhook-url')}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedId === 'webhook-url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Endpoint Active
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Failed to initialize endpoint. Please reload.</p>
              )}
            </div>
          </div>

          {/* Auth Tokens Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                Authorization Tokens
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Generate Bearer tokens for API authentication</p>
            </div>
            <div className="p-5 space-y-4">

              {/* Generate Token Form */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="Token name (e.g. Production)"
                  className="flex-1 min-w-0 px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-zinc-800"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateToken()}
                />
                <button
                  onClick={handleGenerateToken}
                  disabled={generating || !newTokenName.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {generating ? '' : 'Generate'}
                </button>
              </div>

              {/* Token List */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="p-3 bg-zinc-50 rounded-full border border-zinc-100 inline-flex mb-3">
                    <Key className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">No tokens generated yet</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Create your first token to start using the API</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tokens.map((tk) => (
                    <div
                      key={tk.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        selectedTokenForCurl === tk.token
                          ? 'border-violet-300 bg-violet-50/50 ring-1 ring-violet-200'
                          : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setSelectedTokenForCurl(tk.token)}
                          className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 hover:text-violet-700 transition-colors cursor-pointer"
                          title="Select this token for cURL command"
                        >
                          {selectedTokenForCurl === tk.token && <CheckCircle className="w-3 h-3 text-violet-600" />}
                          {tk.name}
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, tokenId: tk.id, tokenName: tk.name })}
                          className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Revoke token"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Token value */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200 mb-2">
                        <code className="text-[10px] font-mono text-zinc-600 truncate flex-1">
                          {showTokenIds.has(tk.id) ? tk.token : `atk_${'•'.repeat(24)}${tk.token.slice(-6)}`}
                        </code>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => toggleShowToken(tk.id)} className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                            {showTokenIds.has(tk.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => copyToClipboard(tk.token, tk.id)} className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                            {copiedId === tk.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-[9px] text-zinc-400">
                        <span>Created: {new Date(tk.created_at).toLocaleDateString()}</span>
                        {tk.last_used_at && <span>Last used: {new Date(tk.last_used_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Schema + cURL */}
        <div className="xl:col-span-2 space-y-6">

          {/* JSON Schema Reference */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Braces className="w-4 h-4 text-blue-500" />
                Payload Schema Reference
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Accepted JSON schemas for each data type</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {Object.entries(schemas).map(([key, schema]) => (
                <div key={key}>
                  <button
                    onClick={() => setExpandedSchema(expandedSchema === key ? null : key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg border ${
                        key === 'message' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        key === 'lead' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                        'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                        {schema.icon}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-zinc-800">{schema.title}</span>
                        <p className="text-[10px] text-zinc-500">{schema.description}</p>
                      </div>
                    </div>
                    {expandedSchema === key ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                  </button>

                  {expandedSchema === key && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Fields table */}
                      <div className="rounded-xl border border-zinc-200 overflow-hidden mb-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                              <th className="text-left px-3 py-2 font-bold text-zinc-600 uppercase tracking-wider text-[9px]">Field</th>
                              <th className="text-left px-3 py-2 font-bold text-zinc-600 uppercase tracking-wider text-[9px]">Type</th>
                              <th className="text-left px-3 py-2 font-bold text-zinc-600 uppercase tracking-wider text-[9px]">Required</th>
                              <th className="text-left px-3 py-2 font-bold text-zinc-600 uppercase tracking-wider text-[9px]">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {schema.fields.map((field) => (
                              <tr key={field.name} className="hover:bg-zinc-50/50">
                                <td className="px-3 py-2 font-mono text-violet-700 font-medium">{field.name}</td>
                                <td className="px-3 py-2 text-zinc-500">{field.type}</td>
                                <td className="px-3 py-2">
                                  {field.required ? (
                                    <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">REQUIRED</span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">OPTIONAL</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-zinc-600">{field.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Example JSON */}
                      <div className="rounded-xl border border-zinc-200 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 text-zinc-400 text-[9px] font-mono">
                          <span>Example Payload</span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(schema.example, null, 2), `schema-${key}`)}
                            className="hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === `schema-${key}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <pre className="p-3 bg-zinc-900 text-xs font-mono text-emerald-400 overflow-x-auto">
                          {JSON.stringify(schema.example, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live cURL Command */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    Live cURL Command
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Copy & paste — uses your real credentials</p>
                </div>
                {!selectedTokenForCurl && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                    <AlertCircle className="w-3 h-3" />
                    Generate a token first
                  </div>
                )}
              </div>
            </div>

            {/* Scope Tabs */}
            <div className="flex border-b border-zinc-100">
              {(['message', 'lead', 'customer'] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setSelectedScope(scope)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                    selectedScope === scope
                      ? 'text-violet-600 border-violet-600 bg-violet-50/30'
                      : 'text-zinc-500 border-transparent hover:text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {schemas[scope].icon}
                  {scope.charAt(0).toUpperCase() + scope.slice(1)}
                </button>
              ))}
            </div>

            {/* cURL Block */}
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 text-zinc-400 text-[9px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">POST</span>
                  <span className="text-zinc-500">•</span>
                  <span>{selectedScope === 'message' ? 'Send Message' : selectedScope === 'lead' ? 'Create Lead' : 'Create Customer'}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(buildCurl(selectedScope), 'curl')}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-2 py-1 rounded hover:bg-zinc-700"
                >
                  {copiedId === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'curl' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 bg-zinc-900 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
                <span className="text-amber-400">curl</span>{' '}
                <span className="text-zinc-500">-X</span>{' '}
                <span className="text-emerald-400">POST</span>{' '}
                <span className="text-sky-400">&quot;{webhookUrl || '<WEBHOOK_URL>'}&quot;</span>{' '}
                <span className="text-zinc-600">\</span>{'\n'}
                {'  '}<span className="text-zinc-500">-H</span>{' '}
                <span className="text-orange-300">&quot;Content-Type: application/json&quot;</span>{' '}
                <span className="text-zinc-600">\</span>{'\n'}
                {'  '}<span className="text-zinc-500">-H</span>{' '}
                <span className="text-orange-300">&quot;Authorization: Bearer{' '}
                  <span className={selectedTokenForCurl ? 'text-emerald-400' : 'text-red-400'}>
                    {selectedTokenForCurl || '<YOUR_TOKEN>'}
                  </span>
                &quot;</span>{' '}
                <span className="text-zinc-600">\</span>{'\n'}
                {'  '}<span className="text-zinc-500">-d</span>{' '}
                <span className="text-violet-300">&apos;{JSON.stringify(
                  selectedScope === 'message'
                    ? { type: 'message', sender_psid: 'user_12345', sender_name: 'John Doe', message_text: 'Hello, I want to order 2 products!' }
                    : selectedScope === 'lead'
                    ? { type: 'lead', name: 'Jane Smith', phone: '+8801712345678', email: 'jane@example.com', source: 'website_form', campaign_name: 'Summer Sale 2025' }
                    : { type: 'customer', name: 'Ahmed Rahman', phone: '+8801812345678', email: 'ahmed@example.com', shipping_address: 'House 12, Road 5, Dhanmondi, Dhaka' }
                , null, 2)}&apos;</span>
              </pre>
            </div>
          </div>

          {/* Response Reference */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-500" />
                Response Reference
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
              {/* Success */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  200 — Success
                </div>
                <pre className="p-3 bg-zinc-900 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`{
  "success": true,
  "message": { ... },
  "lead": { ... },
  "customer": { ... }
}`}
                </pre>
              </div>
              {/* Error */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  401 — Unauthorized
                </div>
                <pre className="p-3 bg-zinc-900 rounded-xl text-[10px] font-mono text-red-400 overflow-x-auto">
{`{
  "error": "Unauthorized. Invalid 
    or missing Bearer token."
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Outgoing Webhook Settings */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" />
                Outgoing Webhook (Receive Events)
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Enter a URL to receive real-time HTTP POST requests when an agent or AI replies to your customers.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  value={outgoingUrl}
                  onChange={(e) => setOutgoingUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Webhook Secret (Optional)</label>
                <input
                  type="password"
                  placeholder="Secret key to verify payload signature"
                  value={outgoingSecret}
                  onChange={(e) => setOutgoingSecret(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-shadow"
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSaveOutgoingWebhook}
                  disabled={savingWebhook}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Save Webhook
                </button>
              </div>
            </div>
          </div>

          {/* Auth Info Banner */}
          <div className="p-4 bg-violet-50/60 rounded-2xl border border-violet-100 flex items-start gap-3">
            <Info className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <div className="text-xs text-violet-800 leading-relaxed">
              <p className="font-bold text-violet-900 mb-1">Authentication</p>
              <p>All API requests must include the <code className="bg-violet-100 px-1 py-0.5 rounded font-mono text-[10px]">Authorization: Bearer &lt;token&gt;</code> header. Tokens are scoped to your workspace and never expire until manually revoked.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, tokenId: '', tokenName: '' })}
        onConfirm={handleDeleteToken}
        title="Revoke API Token"
        message="This will permanently revoke this token. Any system using this token will immediately lose access to your webhook endpoint."
        itemName={deleteModal.tokenName}
        confirmWord={deleteModal.tokenName}
        loading={deleting}
      />

      {/* Toast */}
      <div
        className={`fixed bottom-6 right-6 z-[100] max-w-md transition-all duration-500 ease-out ${
          toast.visible
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-50' :
          toast.type === 'error' ? 'bg-red-950/90 border-red-700/50 text-red-50' :
          'bg-zinc-900/90 border-zinc-700/50 text-zinc-50'
        }`}>
          <div className={`p-1 rounded-full shrink-0 mt-0.5 ${
            toast.type === 'success' ? 'bg-emerald-500/20' :
            toast.type === 'error' ? 'bg-red-500/20' :
            'bg-zinc-500/20'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
          </div>
          <p className="text-sm font-semibold leading-relaxed flex-1">{toast.message}</p>
          <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      </div>
    </div>
  );
}
