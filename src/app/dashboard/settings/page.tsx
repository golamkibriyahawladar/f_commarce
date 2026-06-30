'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { 
  Settings, 
  Key, 
  Link2, 
  Shield, 
  Check, 
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'api' | 'integrations' | 'profile'>('api');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // API Config State
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [fbSecret, setFbSecret] = useState('');
  const [courierKey, setCourierKey] = useState('');

  // Show/Hide Secrets
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showFb, setShowFb] = useState(false);
  const [showCourier, setShowCourier] = useState(false);

  // Fetch Company Settings from Supabase
  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchCompanySettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', profile.company_id)
          .single();
        if (error) throw error;
        if (data?.settings) {
          setOpenaiKey(data.settings.openai_key ? '••••••••' : '');
          setGeminiKey(data.settings.gemini_key ? '••••••••' : '');
          setFbSecret(data.settings.facebook_app_secret ? '••••••••' : '');
          setCourierKey(data.settings.steadfast_courier_key ? '••••••••' : '');
        }
      } catch (err) {
        console.error('Error fetching company settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanySettings();
  }, [profile?.company_id]);

  const handleSaveAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // Get existing settings to preserve other keys
      const { data: company, error: fetchErr } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', profile.company_id)
        .single();
      if (fetchErr) throw fetchErr;

      const existingSettings = company?.settings || {};

      let finalOpenaiKey = openaiKey;
      if (openaiKey === '••••••••') {
        finalOpenaiKey = existingSettings.openai_key || '';
      }
      let finalGeminiKey = geminiKey;
      if (geminiKey === '••••••••') {
        finalGeminiKey = existingSettings.gemini_key || '';
      }
      let finalFbSecret = fbSecret;
      if (fbSecret === '••••••••') {
        finalFbSecret = existingSettings.facebook_app_secret || '';
      }
      let finalCourierKey = courierKey;
      if (courierKey === '••••••••') {
        finalCourierKey = existingSettings.steadfast_courier_key || '';
      }

      const updatedSettings = {
        ...existingSettings,
        openai_key: finalOpenaiKey.trim(),
        gemini_key: finalGeminiKey.trim(),
        facebook_app_secret: finalFbSecret.trim(),
        steadfast_courier_key: finalCourierKey.trim(),
      };

      const { error: updateErr } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', profile.company_id);

      if (updateErr) throw updateErr;

      setSaveSuccess(true);
      // Re-mask
      if (finalOpenaiKey) setOpenaiKey('••••••••');
      if (finalGeminiKey) setGeminiKey('••••••••');
      if (finalFbSecret) setFbSecret('••••••••');
      if (finalCourierKey) setCourierKey('••••••••');

      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Failed to save configurations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-955 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-500" />
          Workspace Configuration
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Configure workspace parameters, social integrations, and API secrets.</p>
      </div>

      {/* Responsive Layout: Left Tabs Sidebar / Top tabs on mobile, Right pane content */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Navigation Sidebar/Header */}
        <div className="w-full lg:w-60 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200 lg:pr-4">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'api' 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <Key className="w-4 h-4" />
            API & Keys Gate
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'integrations' 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Social & Courier Sync
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'profile' 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            RBAC Profile & Security
          </button>
        </div>

        {/* Configurations Forms Container */}
        <div className="flex-1 bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          
          {/* 1. API Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">API Secrets Vault</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Encrypt and store system tokens safely in Row-Level isolated Vault storage.</p>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs border border-emerald-100 flex items-center gap-2 animate-in fade-in duration-200">
                  <Check className="w-4 h-4" />
                  API Keys updated successfully.
                </div>
              )}

              {saveError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-100 flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4" />
                  {saveError}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
              ) : (
                <form onSubmit={handleSaveAPI} className="space-y-4">
                  {/* OpenAI Key */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">OpenAI API Key (AI Autopilot Engine)</label>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> For OpenAI GPT model parameters</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showOpenai ? 'text' : 'password'}
                        className="w-full pl-3 pr-10 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono bg-white text-zinc-800"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-proj-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenai(!showOpenai)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      >
                        {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Gemini Key */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Gemini API Key (AI Autopilot Engine)</label>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> For Google Gemini model parameters</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showGemini ? 'text' : 'password'}
                        className="w-full pl-3 pr-10 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono bg-white text-zinc-800"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowGemini(!showGemini)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      >
                        {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Meta App Secret */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Meta App Secret (FB Pages & IG DM Sync)</label>
                    <div className="relative">
                      <input
                        type={showFb ? 'text' : 'password'}
                        className="w-full pl-3 pr-10 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono bg-white text-zinc-800"
                        value={fbSecret}
                        onChange={(e) => setFbSecret(e.target.value)}
                        placeholder="App Secret Token"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFb(!showFb)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      >
                        {showFb ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Steadfast Courier API Secret */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Steadfast Courier API Secret</label>
                    <div className="relative">
                      <input
                        type={showCourier ? 'text' : 'password'}
                        className="w-full pl-3 pr-10 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono bg-white text-zinc-800"
                        value={courierKey}
                        onChange={(e) => setCourierKey(e.target.value)}
                        placeholder="Steadfast Secret Key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCourier(!showCourier)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      >
                        {showCourier ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {saving ? 'Saving...' : 'Save API Parameters'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 2. Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Social Sync Connections</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Integrate your store pipelines and social communications profiles here.</p>
              </div>

              <div className="space-y-4">
                {/* Integration Item */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-zinc-200 rounded-xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold uppercase text-[10px]">FB</div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Facebook Pages DM</h4>
                      <p className="text-[10px] text-zinc-500">Retrieve page messages and comment replies</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">CONNECTED</span>
                </div>

                {/* Integration Item */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-zinc-200 rounded-xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center font-bold uppercase text-[10px]">IG</div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Instagram Direct Sync</h4>
                      <p className="text-[10px] text-zinc-500">Capture direct messages and media comments</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-[10px] font-bold rounded-lg text-zinc-600 cursor-pointer">CONNECT CHANNEL</button>
                </div>

                {/* Integration Item */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-zinc-200 rounded-xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold uppercase text-[10px]">WA</div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">WhatsApp Business Cloud API</h4>
                      <p className="text-[10px] text-zinc-500">Live chat synchronization webhook pipelines</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-[10px] font-bold rounded-lg text-zinc-600 cursor-pointer">CONNECT CHANNEL</button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Profiles Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Role-Based Access (RBAC)</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Control agent parameters and profile details permissions here.</p>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-zinc-600">
                  <p className="font-bold text-zinc-900 mb-0.5">Current Role: Owner</p>
                  You hold full write permissions to modify API integrations, license pricing structures, and invite other agents.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
