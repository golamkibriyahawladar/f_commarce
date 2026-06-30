'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  campaign_name: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'junk';
  created_at: string;
}

export default function LeadsPage() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'contacted' | 'qualified' | 'converted'>('all');

  const fetchLeads = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time subscription for incoming leads via Webhook
  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel('leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${profile.company_id}`
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, fetchLeads]);

  const filteredLeads = leads.filter(l => {
    const nameMatch = l.name?.toLowerCase().includes(searchVal.toLowerCase()) || false;
    const phoneMatch = l.phone?.includes(searchVal) || false;
    const campaignMatch = l.campaign_name?.toLowerCase().includes(searchVal.toLowerCase()) || false;
    
    const matchesSearch = nameMatch || phoneMatch || campaignMatch;
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'contacted':
        return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'qualified':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'converted':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default:
        return 'bg-zinc-50 text-zinc-600 border-zinc-100';
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Lead['status']) => {
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    
    // DB update
    await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-500" />
            Meta Lead Form Sync
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time webhook capture from active Meta Leads campaigns.</p>
        </div>
        <button 
          onClick={fetchLeads}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-700 bg-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Webhook
        </button>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Leads</p>
          <h4 className="text-xl font-black text-zinc-950 mt-1">{leads.length}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">New (Unassigned)</p>
          <h4 className="text-xl font-black text-blue-600 mt-1">
            {leads.filter(l => l.status === 'new').length} leads
          </h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Converted</p>
          <h4 className="text-xl font-black text-emerald-600 mt-1">{leads.filter(l => l.status === 'converted').length}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active campaigns</p>
          <h4 className="text-xl font-black text-zinc-950 mt-1">{new Set(leads.map(l => l.campaign_name).filter(Boolean)).size || 0} Active</h4>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, phone or campaign..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {(['all', 'new', 'contacted', 'qualified', 'converted'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                filterStatus === status 
                  ? 'bg-zinc-900 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List Display (Responsive Table & Card Grid) */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading && leads.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
            <p className="text-sm">Loading leads...</p>
          </div>
        ) : (
          <>
            {/* DESKTOP/TABLET GRID VIEW */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600">
                <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  <tr>
                    <th className="p-4">Lead Name</th>
                    <th className="p-4">Contact Detail</th>
                    <th className="p-4">Target Campaign</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400">No leads found.</td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-4 font-bold text-zinc-900">{lead.name || 'Unknown'}</td>
                        <td className="p-4 space-y-0.5">
                          <p className="font-semibold text-zinc-800">{lead.phone || 'No phone'}</p>
                          <p className="text-[10px] text-zinc-500">{lead.email || 'No email'}</p>
                        </td>
                        <td className="p-4 text-zinc-500 font-medium max-w-[200px] truncate">{lead.campaign_name || lead.source || 'Direct API'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${getStatusStyle(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400 font-semibold">
                          {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }) : ''}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleUpdateStatus(lead.id, 'converted')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Convert to Order
                            </button>
                            <select
                              className="px-2 py-1.5 border border-zinc-200 text-[10px] font-semibold rounded-lg bg-white focus:outline-none cursor-pointer"
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="converted">Converted</option>
                              <option value="junk">Junk</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE PORTRAIT CARDS VIEW */}
            <div className="block md:hidden divide-y divide-zinc-100">
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 text-xs">No leads found.</div>
              ) : (
                filteredLeads.map((lead) => (
                  <div key={lead.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{lead.name || 'Unknown'}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }) : ''}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wide uppercase border ${getStatusStyle(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="text-[11px] bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 space-y-1 text-zinc-600">
                      <p className="font-semibold text-zinc-800">{lead.phone || 'No phone'} | {lead.email || 'No email'}</p>
                      <p className="text-[10px] text-zinc-500 leading-tight">Campaign: {lead.campaign_name || lead.source || 'Direct API'}</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(lead.id, 'converted')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer text-center"
                      >
                        Convert to Order
                      </button>
                      <select
                        className="flex-1 py-1.5 border border-zinc-200 text-[10px] font-semibold rounded-lg bg-white focus:outline-none cursor-pointer"
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="junk">Junk</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
