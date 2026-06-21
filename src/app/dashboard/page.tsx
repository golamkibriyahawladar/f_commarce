'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Layers 
} from 'lucide-react';

export default function DashboardHome() {
  const { profile } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-950">Welcome back, {profile?.full_name || 'Agent'}!</h1>
        <p className="text-zinc-600 text-sm mt-1">Here is a quick overview of your conversational performance metrics today.</p>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Conversations</span>
            <MessageSquare className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">12</h3>
            <span className="text-[10px] text-zinc-500">+3 updated recently</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customers</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">142</h3>
            <span className="text-[10px] text-zinc-500">Across synced integrations</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Orders</span>
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">8</h3>
            <span className="text-[10px] text-zinc-500">Awaiting dispatch/courier</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Success Rate</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">94.2%</h3>
            <span className="text-[10px] text-emerald-600">Autopilot handled</span>
          </div>
        </div>
      </div>

      {/* Integration checklist placeholder */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Workspace Setup Checklist</h2>
        <p className="text-sm text-zinc-500 mb-6">Complete these settings to fully automate your e-commerce operations.</p>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center text-[10px] text-emerald-600 font-bold mt-0.5 bg-emerald-50">✓</div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Workspace initialized</p>
              <p className="text-xs text-zinc-500">Successfully created profile and logged in.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-xs mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-zinc-800">Link Facebook & Instagram Integrations</p>
              <p className="text-xs text-zinc-500">Go to Settings &gt; Integrations to connect your business pages.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-xs mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-zinc-800">Setup Courier details</p>
              <p className="text-xs text-zinc-500">Add credentials for Steadfast or Pathao API endpoints.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
