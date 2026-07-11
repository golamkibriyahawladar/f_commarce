'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  Key,
  Brain,
  Database,
  CheckCircle,
  Loader2,
  Save,
  Check,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export default function CredentialsPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});

  // States for keys
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [pineconeKey, setPineconeKey] = useState('');
  const [pineconeEnv, setPineconeEnv] = useState('');
  const [fbSecret, setFbSecret] = useState('');
  const [courierKey, setCourierKey] = useState('');

  // UI States
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const fetchSettings = useCallback(async (silent = false) => {
    if (!profile?.company_id) return;
    if (!silent) setLoading(true);
    try {
      const token = await getAuthHeader();
      const res = await fetch('/api/company-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setSettings(s);
        setOpenaiKey(s.global_openai_key || '');
        setGeminiKey(s.global_gemini_key || '');
        setOpenrouterKey(s.global_openrouter_key || '');
        setPineconeKey(s.global_pinecone_key || '');
        setPineconeEnv(s.global_pinecone_env || '');
        setFbSecret(s.facebook_app_secret || '');
        setCourierKey(s.steadfast_courier_key || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (keyType: string, value: any) => {
    setSaving(true);
    try {
      const token = await getAuthHeader();
      const payload = { [keyType]: value };

      const res = await fetch('/api/company-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Credential saved successfully!', 'success');
        fetchSettings(true);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save credential', 'error');
      }
    } catch (error) {
      showToast('An error occurred while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCard = (
    title: string,
    description: string,
    icon: React.ReactNode,
    value: string,
    setValue: (val: string) => void,
    dbKey: string,
    extraField?: { value: string, setValue: (val: string) => void, dbKey: string, placeholder: string }
  ) => {
    const isConnected = !!settings[dbKey];

    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">{title}</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">{description}</p>
            </div>
          </div>
          {isConnected && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              <CheckCircle className="w-3 h-3" />
              Connected
            </span>
          )}
        </div>

        <div className="mt-auto space-y-3">
          <div className="relative">
            <input
              type={showKey[dbKey] ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${title} API Key`}
              className="w-full pl-3 pr-10 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-zinc-50 text-zinc-800"
            />
            <button
              type="button"
              onClick={() => toggleShowKey(dbKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showKey[dbKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {extraField && (
            <input
              type="text"
              value={extraField.value}
              onChange={(e) => extraField.setValue(e.target.value)}
              placeholder={extraField.placeholder}
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-zinc-50 text-zinc-800"
            />
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (extraField) {
                  // Save both at once to avoid double toast/re-render
                  setSaving(true);
                  getAuthHeader().then(token => {
                    fetch('/api/company-settings', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ [dbKey]: value, [extraField.dbKey]: extraField.value })
                    }).then(res => {
                      if (res.ok) {
                        showToast('Credentials saved successfully!', 'success');
                        fetchSettings(true);
                      } else {
                        showToast('Failed to save credential', 'error');
                      }
                    }).finally(() => setSaving(false));
                  });
                } else {
                  handleSave(dbKey, value);
                }
              }}
              disabled={saving}
              className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

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
        <Link href="/dashboard/developer" className="text-zinc-500 hover:text-zinc-700 font-medium pb-3 px-1 text-sm transition-colors">
          Developer API
        </Link>
        <Link href="/dashboard/credentials" className="border-b-2 border-emerald-600 text-emerald-700 font-semibold pb-3 px-1 text-sm">
          Credentials
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderCard(
            'OpenAI',
            'For OpenAI models',
            <Brain className="w-6 h-6 text-emerald-600" />,
            openaiKey,
            setOpenaiKey,
            'global_openai_key'
          )}

          {renderCard(
            'Gemini',
            'For Google Gemini models',
            <Brain className="w-6 h-6 text-blue-500" />,
            geminiKey,
            setGeminiKey,
            'global_gemini_key'
          )}

          {renderCard(
            'OpenRouter',
            'Access Claude, Meta Llama, etc.',
            <Brain className="w-6 h-6 text-indigo-500" />,
            openrouterKey,
            setOpenrouterKey,
            'global_openrouter_key'
          )}

          {renderCard(
            'Pinecone DB',
            'Vector Database for RAG & Memory',
            <Database className="w-6 h-6 text-cyan-600" />,
            pineconeKey,
            setPineconeKey,
            'global_pinecone_key',
            { value: pineconeEnv, setValue: setPineconeEnv, dbKey: 'global_pinecone_env', placeholder: 'Pinecone Index Name' }
          )}

          {renderCard(
            'Meta App Secret',
            'For FB Pages & IG DM Sync',
            <Key className="w-6 h-6 text-blue-600" />,
            fbSecret,
            setFbSecret,
            'facebook_app_secret'
          )}

          {renderCard(
            'Steadfast Courier',
            'For booking parcels automatically',
            <Key className="w-6 h-6 text-orange-600" />,
            courierKey,
            setCourierKey,
            'steadfast_courier_key'
          )}
        </div>
      )}
    </div>
  );
}
