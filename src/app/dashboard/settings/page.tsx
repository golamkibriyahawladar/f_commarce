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
  const [activeTab, setActiveTab] = useState<'integrations' | 'profile'>('integrations');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

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
        // Currently no specific fields to fetch for these tabs, 
        // but left for future settings additions
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
    // Removed API settings logic
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
