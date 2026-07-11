'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { 
  ListOrdered,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Play,
  RotateCcw,
  Zap,
  AlertTriangle,
  Inbox
} from 'lucide-react';
import { format } from 'date-fns';

interface QueueJob {
  id: string;
  company_id: string;
  conversation_id: string;
  integration_id: string;
  user_message: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  priority: number;
  created_at: string;
  started_at: string | null;
  processed_at: string | null;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export default function QueueMonitorPage() {
  const { profile } = useAuthStore();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');

  const fetchJobs = useCallback(async () => {
    if (!profile?.company_id) return;
    
    try {
      let query = supabase
        .from('ai_queue')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);

      // Calculate stats from all jobs
      const { data: allData } = await supabase
        .from('ai_queue')
        .select('status')
        .eq('company_id', profile.company_id);

      if (allData) {
        setStats({
          pending: allData.filter(d => d.status === 'pending').length,
          processing: allData.filter(d => d.status === 'processing').length,
          completed: allData.filter(d => d.status === 'completed').length,
          failed: allData.filter(d => d.status === 'failed').length,
          total: allData.length
        });
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, activeTab]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel('ai_queue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_queue',
        filter: `company_id=eq.${profile.company_id}`
      }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, fetchJobs]);

  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/queue/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxJobs: 10, delayBetweenMs: 500 })
      });
      const data = await res.json();
      console.log('Queue process result:', data);
      await fetchJobs();
    } catch (err) {
      console.error('Error processing queue:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryFailed = async (jobId: string) => {
    try {
      await supabase
        .from('ai_queue')
        .update({ status: 'pending', retry_count: 0, error_message: null, started_at: null, processed_at: null })
        .eq('id', jobId);
      await fetchJobs();
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const handleRetryAllFailed = async () => {
    if (!profile?.company_id) return;
    try {
      await supabase
        .from('ai_queue')
        .update({ status: 'pending', retry_count: 0, error_message: null, started_at: null, processed_at: null })
        .eq('company_id', profile.company_id)
        .eq('status', 'failed');
      await fetchJobs();
    } catch (err) {
      console.error('Retry all failed:', err);
    }
  };

  const statusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const statusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'processing': return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'failed': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-emerald-600" />
            Message Queue Monitor
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Track and manage AI agent message processing queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobs}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleProcessQueue}
            disabled={processing || stats.pending === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Process Queue
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <Inbox className="w-4 h-4" />, color: 'text-zinc-500', bg: 'bg-zinc-50' },
          { label: 'Pending', value: stats.pending, icon: <Clock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Processing', value: stats.processing, icon: <Loader2 className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed', value: stats.failed, icon: <XCircle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} border border-zinc-200 rounded-xl p-4`}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${stat.color} mb-2`}>
              {stat.icon}
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-zinc-900">{stat.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
        {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
              activeTab === tab 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Failed Retry All */}
      {stats.failed > 0 && activeTab === 'failed' && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">{stats.failed} failed job{stats.failed > 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={handleRetryAllFailed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Retry All Failed
          </button>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Message</th>
                <th className="px-5 py-3 font-semibold">Retries</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Processed</th>
                <th className="px-5 py-3 font-semibold">Error</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${statusColor(job.status)}`}>
                      {statusIcon(job.status)}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-700 max-w-xs truncate" title={job.user_message}>
                    {job.user_message}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">
                    {job.retry_count}/{job.max_retries}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {format(new Date(job.created_at), 'MMM dd, hh:mm:ss a')}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {job.processed_at ? format(new Date(job.processed_at), 'hh:mm:ss a') : '—'}
                  </td>
                  <td className="px-5 py-3 text-red-500 text-xs max-w-[200px] truncate" title={job.error_message || ''}>
                    {job.error_message || '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetryFailed(job.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-400 text-sm">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No queue jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
