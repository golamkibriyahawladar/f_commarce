'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Webhook, 
  Plus,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Settings2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Trash2,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

// FB SDK typing no longer needed — using server-side OAuth redirect

interface Integration {
  id: string;
  company_id: string;
  provider: string;
  type: string;
  credentials: any;
  webhook_url?: string;
  webhook_secret?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [fbConnecting, setFbConnecting] = useState(false);
  const [igConnecting, setIgConnecting] = useState(false);
  const { profile } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Modal & Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'facebook' | 'instagram' | 'whatsapp' | 'webhook' | null>(null);
  
  // WhatsApp Form
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappAccountId, setWhatsappAccountId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [submittingWhatsapp, setSubmittingWhatsapp] = useState(false);

  // Webhook Form
  const [webhookName, setWebhookName] = useState('');
  const [submittingWebhook, setSubmittingWebhook] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<{ url: string; secret: string } | null>(null);

  // UI Utilities
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSecretId, setShowSecretId] = useState<string | null>(null);

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({ message: '', type: 'info', visible: false });
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  // Confirm Dialog System
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; title: string; message: string; itemName: string; onConfirm: () => void }>({ visible: false, title: '', message: '', itemName: '', onConfirm: () => {} });
  const [confirmInput, setConfirmInput] = useState('');

  const showConfirm = useCallback((title: string, message: string, itemName: string, onConfirm: () => void) => {
    setConfirmInput('');
    setConfirmDialog({ visible: true, title, message, itemName, onConfirm });
  }, []);

  // Fetch all active integrations
  const fetchIntegrations = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', profile.company_id);
      
      if (error) throw error;
      setIntegrations(data || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchIntegrations();
    }
  }, [profile?.company_id]);

  // Handle Facebook OAuth callback result from URL params
  useEffect(() => {
    const fbSuccess = searchParams.get('fb_success');
    const fbError = searchParams.get('fb_error');

    if (fbError) {
      showToast(decodeURIComponent(fbError), 'error');
      router.replace('/dashboard/integrations');
      return;
    }

    if (fbSuccess) {
      showToast(`Successfully connected ${fbSuccess} page(s)!`, 'success');
      fetchIntegrations();
      router.replace('/dashboard/integrations');
    }
  }, [searchParams]);

  const handleConnectFacebook = () => {
    if (!profile?.company_id || !profile?.id) {
      showToast('Please log in first.', 'warning');
      return;
    }
    setFbConnecting(true);
    window.location.href = `/api/integrations/facebook/connect?type=facebook&companyId=${profile.company_id}&userId=${profile.id}`;
  };

  const handleConnectInstagram = () => {
    if (!profile?.company_id || !profile?.id) {
      showToast('Please log in first.', 'warning');
      return;
    }
    setIgConnecting(true);
    window.location.href = `/api/integrations/facebook/connect?type=instagram&companyId=${profile.company_id}&userId=${profile.id}`;
  };

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappPhoneId || !whatsappAccountId || !whatsappToken) {
      showToast('Please fill out all fields.', 'warning');
      return;
    }

    setSubmittingWhatsapp(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .insert({
          company_id: profile?.company_id,
          provider: 'whatsapp',
          type: 'social',
          credentials: {
            phone_number_id: whatsappPhoneId.trim(),
            whatsapp_business_account_id: whatsappAccountId.trim(),
            access_token: whatsappToken.trim()
          },
          status: 'active'
        });

      if (error) throw error;
      
      showToast('WhatsApp Business account connected successfully!', 'success');
      fetchIntegrations();
      closeModal();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to connect WhatsApp: ' + err.message, 'error');
    } finally {
      setSubmittingWhatsapp(false);
    }
  };

  const handleConnectWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName) {
      showToast('Please enter a webhook name.', 'warning');
      return;
    }

    setSubmittingWebhook(true);
    try {
      const webhookSecret = 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          company_id: profile?.company_id,
          provider: 'webhook',
          type: 'webhook',
          webhook_secret: webhookSecret,
          credentials: {
            name: webhookName.trim()
          },
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const generatedUrl = `${window.location.origin}/api/webhooks/custom/${data.id}`;
        // Update URL in database
        await supabase
          .from('integrations')
          .update({ webhook_url: generatedUrl })
          .eq('id', data.id);

        setCreatedWebhook({
          url: generatedUrl,
          secret: webhookSecret
        });

        fetchIntegrations();
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to create Webhook: ' + err.message, 'error');
    } finally {
      setSubmittingWebhook(false);
    }
  };

  const handleDisconnect = (id: string, name: string) => {
    showConfirm(
      'Disconnect Integration',
      `You are about to permanently disconnect this integration. All synced data from this channel will stop flowing.`,
      name,
      async () => {
        try {
          const { error } = await supabase
            .from('integrations')
            .delete()
            .eq('id', id);

          if (error) throw error;
          setIntegrations(prev => prev.filter(item => item.id !== id));
          showToast(`"${name}" disconnected successfully.`, 'success');
        } catch (err: any) {
          console.error(err);
          showToast('Failed to disconnect integration.', 'error');
        }
      }
    );
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setSelectedProvider(null);
    setWhatsappPhoneId('');
    setWhatsappAccountId('');
    setWhatsappToken('');
    setWebhookName('');
    setCreatedWebhook(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Integrations</h1>
          <p className="text-sm text-zinc-500 mt-1">Connect and manage your social channels, messaging apps, and custom webhooks.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-semibold text-sm active:scale-95 duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Connected Integrations List */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Active Connections ({integrations.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-zinc-500 text-sm">Fetching integrations...</p>
            </div>
          </div>
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center">
            <div className="p-4 bg-zinc-50 rounded-full border border-zinc-100 mb-4">
              <Settings2 className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">No active integrations found</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              Connect your Facebook Pages, Instagram accounts, WhatsApp Business APIs, or Webhooks to start syncing messages and data.
            </p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Connect your first integration
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((item) => {
              const provider = item.provider;
              let title = item.provider.toUpperCase();
              let icon = <Globe className="w-6 h-6 text-zinc-500" />;
              let subtitle = '';

              if (provider === 'facebook') {
                title = item.credentials?.page_name || 'Facebook Page';
                subtitle = `Page ID: ${item.credentials?.page_id || 'N/A'}`;
                icon = <Facebook className="w-6 h-6 text-blue-600" />;
              } else if (provider === 'instagram') {
                title = item.credentials?.page_name || 'Instagram Account';
                subtitle = `Account ID: ${item.credentials?.page_id || 'N/A'}`;
                icon = <Instagram className="w-6 h-6 text-pink-600" />;
              } else if (provider === 'whatsapp') {
                title = 'WhatsApp Business';
                subtitle = `Phone ID: ${item.credentials?.phone_number_id || 'N/A'}`;
                icon = <MessageCircle className="w-6 h-6 text-emerald-500" />;
              } else if (provider === 'webhook') {
                title = item.credentials?.name || 'Custom Webhook';
                subtitle = 'Incoming webhook URL';
                icon = <Webhook className="w-6 h-6 text-indigo-500" />;
              }

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                          {icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900">{title}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Active
                      </span>
                    </div>

                    {/* Webhook details layout */}
                    {provider === 'webhook' && (
                      <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-150 space-y-3.5 text-xs text-zinc-700">
                        <div>
                          <span className="block font-semibold text-zinc-500 uppercase tracking-wide text-[9px] mb-1">Webhook URL:</span>
                          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200">
                            <span className="font-mono truncate select-all flex-1">{item.webhook_url}</span>
                            <button 
                              onClick={() => copyToClipboard(item.webhook_url || '', item.id)}
                              className="text-zinc-400 hover:text-zinc-600 transition-colors"
                              title="Copy URL"
                            >
                              {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="block font-semibold text-zinc-500 uppercase tracking-wide text-[9px] mb-1">Webhook Secret Key:</span>
                          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200">
                            <span className="font-mono truncate flex-1">
                              {showSecretId === item.id ? item.webhook_secret : '••••••••••••••••••••••••'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => setShowSecretId(showSecretId === item.id ? null : item.id)}
                                className="text-zinc-400 hover:text-zinc-600 transition-colors"
                              >
                                {showSecretId === item.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(item.webhook_secret || '', `${item.id}_secret`)}
                                className="text-zinc-400 hover:text-zinc-600 transition-colors"
                                title="Copy Secret"
                              >
                                {copiedId === `${item.id}_secret` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-5 mt-5 border-t border-zinc-100 text-xs text-zinc-500">
                    <span>Connected: {new Date(item.created_at).toLocaleDateString()}</span>
                    <button 
                      onClick={() => handleDisconnect(item.id, title)}
                      className="flex items-center gap-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-100 hover:border-red-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Integration Categories / General Guide */}
      <div className="mt-12 bg-emerald-50/50 rounded-2xl p-8 border border-emerald-100/50 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-emerald-100 opacity-50 rotate-12">
          <Settings2 className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-xl font-bold text-emerald-950 mb-2">Omnichannel Automation Hub</h2>
          <p className="text-emerald-800/80 mb-6 leading-relaxed text-sm">
            Once connected, your social messages are funneled into the real-time Team Inbox, enabling agents to view orders, check delivery, and activate AI human co-pilot mode instantly.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Integration
            </button>
          </div>
        </div>
      </div>

      {/* Add Integration Overlay Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-150">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {selectedProvider ? `Connect ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}` : 'Add Integration'}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedProvider ? 'Enter credentials to link your channel' : 'Select a service provider to continue'}
                </p>
              </div>
              <button 
                onClick={closeModal}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {!selectedProvider ? (
                // Provider Selection List
                <div className="space-y-4">
                  <button 
                    onClick={() => handleConnectFacebook()}
                    disabled={fbConnecting || igConnecting}
                    className="w-full flex items-center justify-between p-4 border border-zinc-200 rounded-xl hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left group active:scale-[0.99] duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 group-hover:scale-105 transition-transform">
                        <Facebook className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">Facebook Page</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Sync Facebook Page DMs, comments, and lead ads</p>
                      </div>
                    </div>
                    {fbConnecting ? <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /> : <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />}
                  </button>

                  <button 
                    onClick={() => handleConnectInstagram()}
                    disabled={fbConnecting || igConnecting}
                    className="w-full flex items-center justify-between p-4 border border-zinc-200 rounded-xl hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left group active:scale-[0.99] duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-pink-50 rounded-xl border border-pink-100 group-hover:scale-105 transition-transform">
                        <Instagram className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 group-hover:text-pink-600 transition-colors">Instagram Direct</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Manage DMs, story replies, and comment flows</p>
                      </div>
                    </div>
                    {igConnecting ? <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /> : <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />}
                  </button>

                  <button 
                    onClick={() => setSelectedProvider('whatsapp')}
                    className="w-full flex items-center justify-between p-4 border border-zinc-200 rounded-xl hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left group active:scale-[0.99] duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 group-hover:scale-105 transition-transform">
                        <MessageCircle className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">WhatsApp Business</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Connect your official WhatsApp Cloud API</p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />
                  </button>

                  <button 
                    onClick={() => setSelectedProvider('webhook')}
                    className="w-full flex items-center justify-between p-4 border border-zinc-200 rounded-xl hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left group active:scale-[0.99] duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 group-hover:scale-105 transition-transform">
                        <Webhook className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">Custom Webhooks</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Receive real-time lead and checkout events</p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />
                  </button>
                </div>
              ) : selectedProvider === 'whatsapp' ? (
                // WhatsApp Setup Form
                <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Phone Number ID:</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g. 109849204928"
                      value={whatsappPhoneId}
                      onChange={(e) => setWhatsappPhoneId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">WhatsApp Business Account ID:</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g. 108392059382"
                      value={whatsappAccountId}
                      onChange={(e) => setWhatsappAccountId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Access Token (Permanent User Token):</label>
                    <textarea 
                      required 
                      rows={3}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                      placeholder="EAAC..."
                      value={whatsappToken}
                      onChange={(e) => setWhatsappToken(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setSelectedProvider(null)}
                      className="flex-1 py-2 px-4 border border-zinc-300 text-sm font-semibold text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={submittingWhatsapp}
                      className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {submittingWhatsapp && <Loader2 className="w-4 h-4 animate-spin" />}
                      {submittingWhatsapp ? 'Connecting...' : 'Connect WhatsApp'}
                    </button>
                  </div>
                </form>
              ) : selectedProvider === 'webhook' ? (
                // Webhook Setup Page
                createdWebhook ? (
                  // Show Generated Webhook URL & Secret
                  <div className="space-y-5">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 items-start">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-emerald-950 text-sm">Webhook Generated Successfully!</h4>
                        <p className="text-xs text-emerald-800/80 mt-0.5">Please copy this information and paste it in your external platform (WordPress, Shopify, etc.).</p>
                      </div>
                    </div>

                    <div className="space-y-3.5 text-xs text-zinc-700">
                      <div>
                        <span className="block font-bold text-zinc-500 uppercase tracking-wide text-[9px] mb-1.5">Payload Webhook URL:</span>
                        <div className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200">
                          <span className="font-mono truncate select-all flex-1">{createdWebhook.url}</span>
                          <button 
                            onClick={() => copyToClipboard(createdWebhook.url, 'created_url')}
                            className="text-zinc-400 hover:text-zinc-650 transition-colors"
                          >
                            {copiedId === 'created_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block font-bold text-zinc-500 uppercase tracking-wide text-[9px] mb-1.5">Secret Key (for payload signature verification):</span>
                        <div className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200">
                          <span className="font-mono truncate select-all flex-1">{createdWebhook.secret}</span>
                          <button 
                            onClick={() => copyToClipboard(createdWebhook.secret, 'created_secret')}
                            className="text-zinc-400 hover:text-zinc-650 transition-colors"
                          >
                            {copiedId === 'created_secret' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={closeModal}
                      className="w-full py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  // Show Webhook Setup Form
                  <form onSubmit={handleConnectWebhook} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Webhook Source Name:</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="e.g. WooCommerce Store, Lead Website"
                        value={webhookName}
                        onChange={(e) => setWebhookName(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setSelectedProvider(null)}
                        className="flex-1 py-2 px-4 border border-zinc-300 text-sm font-semibold text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={submittingWebhook}
                        className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {submittingWebhook && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submittingWebhook ? 'Generating...' : 'Generate Webhook'}
                      </button>
                    </div>
                  </form>
                )
              ) : null}
            </div>
          </div>
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
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-50' :
          toast.type === 'error' ? 'bg-red-950/90 border-red-700/50 text-red-50' :
          toast.type === 'warning' ? 'bg-amber-950/90 border-amber-700/50 text-amber-50' :
          'bg-zinc-900/90 border-zinc-700/50 text-zinc-50'
        }`}>
          <div className={`p-1 rounded-full shrink-0 mt-0.5 ${
            toast.type === 'success' ? 'bg-emerald-500/20' :
            toast.type === 'error' ? 'bg-red-500/20' :
            toast.type === 'warning' ? 'bg-amber-500/20' :
            'bg-zinc-500/20'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.visible && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[420px] rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">{confirmDialog.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{confirmDialog.itemName}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed mb-5">{confirmDialog.message}</p>
              
              <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-100/80 mb-4">
                <p className="text-xs text-red-800 leading-relaxed">
                  To confirm, type <span className="font-mono font-bold bg-red-100 px-1.5 py-0.5 rounded text-red-900">DISCONNECT</span> in the box below:
                </p>
              </div>

              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DISCONNECT here..."
                className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm font-mono tracking-wider focus:outline-none transition-colors ${
                  confirmInput === 'DISCONNECT' 
                    ? 'border-red-500 bg-red-50/30 text-red-900 focus:border-red-600' 
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 focus:border-zinc-400'
                }`}
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button 
                onClick={() => {
                  setConfirmDialog(prev => ({ ...prev, visible: false }));
                  setConfirmInput('');
                }}
                className="flex-1 py-2.5 px-4 border border-zinc-300 text-sm font-semibold text-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmInput === 'DISCONNECT') {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, visible: false }));
                    setConfirmInput('');
                  }
                }}
                disabled={confirmInput !== 'DISCONNECT'}
                className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  confirmInput === 'DISCONNECT'
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
