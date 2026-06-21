'use client';

import React, { useState } from 'react';
import { 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Webhook, 
  Plus,
  CheckCircle,
  AlertCircle,
  Settings2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const integrations = [
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    description: 'Connect your Facebook Page to receive and reply to messages directly from the omnichannel inbox.',
    icon: <Facebook className="w-8 h-8 text-blue-600" />,
    status: 'connected',
    lastSync: '2 minutes ago'
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    description: 'Manage Instagram DMs and story replies in real-time alongside other channels.',
    icon: <Instagram className="w-8 h-8 text-pink-600" />,
    status: 'connected',
    lastSync: '5 minutes ago'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Engage with customers on WhatsApp using the official Cloud API.',
    icon: <MessageCircle className="w-8 h-8 text-emerald-500" />,
    status: 'disconnected',
    lastSync: null
  },
  {
    id: 'webhook',
    name: 'Custom Webhooks',
    description: 'Receive real-time data from external websites, WordPress, Shopify, or any custom backend.',
    icon: <Webhook className="w-8 h-8 text-indigo-500" />,
    status: 'configured',
    lastSync: '1 hour ago'
  }
];

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Integrations</h1>
          <p className="text-sm text-zinc-500 mt-1">Connect your favorite tools and channels to sync data.</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {integrations.map((app) => (
          <div key={app.id} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 group-hover:scale-105 transition-transform">
                  {app.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-lg">{app.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                    {app.status === 'connected' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Connected
                      </span>
                    )}
                    {app.status === 'configured' && (
                      <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        <Settings2 className="w-3 h-3" /> Configured
                      </span>
                    )}
                    {app.status === 'disconnected' && (
                      <span className="flex items-center gap-1 text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                        <AlertCircle className="w-3 h-3" /> Not Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-zinc-600 text-sm mb-6 leading-relaxed min-h-[40px]">
              {app.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <div className="text-xs text-zinc-500 flex items-center gap-1">
                {app.lastSync ? (
                  <>
                    <RefreshCw className="w-3 h-3" /> 
                    Last synced: {app.lastSync}
                  </>
                ) : (
                  <span>Ready to setup</span>
                )}
              </div>
              
              <button className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                app.status === 'disconnected' 
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}>
                {app.status === 'disconnected' ? 'Connect' : 'Manage'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Webhook specific guide section */}
      <div className="mt-12 bg-indigo-50 rounded-2xl p-8 border border-indigo-100 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-indigo-100 opacity-50 rotate-12">
          <Webhook className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-xl font-bold text-indigo-900 mb-2">Custom Integration via Webhooks</h2>
          <p className="text-indigo-800/80 mb-6 leading-relaxed">
            Need to bring data from your custom website, WordPress, Shopify, or external CRM? 
            Use our unified Webhook API to push leads, orders, or custom events directly into AiChat Suite.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create New Webhook
            </button>
            <button className="bg-white text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> View API Docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
