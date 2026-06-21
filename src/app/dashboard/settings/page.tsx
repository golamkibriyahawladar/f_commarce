'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Link2, 
  Shield, 
  Check, 
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'api' | 'integrations' | 'profile'>('api');
  const [showSecret, setShowSecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // API Config State
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••');
  const [fbSecret, setFbSecret] = useState('0ac7••••••••••••••••••••');
  const [courierKey, setCourierKey] = useState('sf_sandbox_••••••••••••');

  const handleSaveAPI = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
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

              <form onSubmit={handleSaveAPI} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">OpenAI API Key (AI Autopilot Engine)</label>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> For LLM Co-Pilot model parameters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      className="w-full pl-3 pr-10 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Meta App Secret (FB Pages & IG DM Sync)</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    value={fbSecret}
                    onChange={(e) => setFbSecret(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Steadfast Courier API Secret</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    value={courierKey}
                    onChange={(e) => setCourierKey(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Save API Parameters
                  </button>
                </div>
              </form>
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
