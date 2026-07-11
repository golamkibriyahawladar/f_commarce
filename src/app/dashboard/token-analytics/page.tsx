'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { 
  Zap, 
  Cpu, 
  Clock, 
  Bot, 
  MessageSquare,
  Loader2,
  CalendarDays,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Code
} from 'lucide-react';
import { format } from 'date-fns';

interface AIMessageData {
  id: string;
  created_at: string;
  content: string;
  metadata: {
    sent_by_ai_agent?: string;
    execution_stats?: {
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
      performance?: {
        model_used?: string;
        response_time_ms?: number;
      };
    };
  };
}

interface AgentStats {
  name: string;
  responses: number;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  totalTimeMs: number;
}

export default function TokenAnalyticsPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<AIMessageData[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  
  // Aggregated totals
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, created_at, content, metadata')
          .eq('company_id', profile.company_id)
          .eq('sender_type', 'ai')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const msgs = (data || []) as AIMessageData[];
        setMessages(msgs);

        let tTokens = 0;
        let tResponses = msgs.length;
        
        const statsMap = new Map<string, AgentStats>();

        msgs.forEach(msg => {
          const meta = msg.metadata || {};
          const stats = meta.execution_stats || {};
          const usage = stats.usage || {};
          const perf = stats.performance || {};
          
          const agentName = meta.sent_by_ai_agent || 'Unknown Agent';
          const msgTokens = usage.total_tokens || 0;
          const promptTokens = usage.prompt_tokens || 0;
          const compTokens = usage.completion_tokens || 0;
          const msgTime = perf.response_time_ms || 0;

          tTokens += msgTokens;

          if (!statsMap.has(agentName)) {
            statsMap.set(agentName, {
              name: agentName,
              responses: 0,
              tokens: 0,
              promptTokens: 0,
              completionTokens: 0,
              totalTimeMs: 0
            });
          }

          const aStat = statsMap.get(agentName)!;
          aStat.responses += 1;
          aStat.tokens += msgTokens;
          aStat.promptTokens += promptTokens;
          aStat.completionTokens += compTokens;
          aStat.totalTimeMs += msgTime;
        });

        setTotalTokens(tTokens);
        setTotalResponses(tResponses);
        setAgentStats(Array.from(statsMap.values()).sort((a, b) => b.tokens - a.tokens));

      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [profile?.company_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const toggleAgent = (agentName: string) => {
    setExpandedAgent(expandedAgent === agentName ? null : agentName);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" />
          Token Analytics & Usage
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Track LLM execution tokens and response performance across all your AI Agents.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-500 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Total Tokens</h3>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{totalTokens.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-500 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Total AI Responses</h3>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{totalResponses.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-500 mb-4">
            <Bot className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Active Agents</h3>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{agentStats.length}</div>
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-500" />
            Agent Usage Breakdown (Click to expand logs)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-zinc-100 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Agent Name</th>
                <th className="px-5 py-3 font-semibold text-right">Responses</th>
                <th className="px-5 py-3 font-semibold text-right">Avg. Time</th>
                <th className="px-5 py-3 font-semibold text-right">Prompt Tokens</th>
                <th className="px-5 py-3 font-semibold text-right">Output Tokens</th>
                <th className="px-5 py-3 font-semibold text-right">Total Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {agentStats.map((agent, idx) => (
                <React.Fragment key={idx}>
                  <tr 
                    onClick={() => toggleAgent(agent.name)}
                    className={`hover:bg-zinc-50 transition-colors cursor-pointer ${expandedAgent === agent.name ? 'bg-zinc-50' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-zinc-900 flex items-center gap-2">
                        {expandedAgent === agent.name ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                        <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] shrink-0">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        {agent.name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-zinc-700">
                      {agent.responses.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-zinc-500">
                      {agent.responses > 0 ? ((agent.totalTimeMs / agent.responses) / 1000).toFixed(2) : '0'}s
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-zinc-600">
                      {agent.promptTokens.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-zinc-600">
                      {agent.completionTokens.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                        <Zap className="w-3 h-3" />
                        {agent.tokens.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Expanded Execution Logs */}
                  {expandedAgent === agent.name && (
                    <tr>
                      <td colSpan={6} className="p-0 border-b-2 border-emerald-100">
                        <div className="bg-zinc-50/80 shadow-inner px-6 py-4">
                          <h4 className="text-xs font-bold text-zinc-600 mb-3 flex items-center gap-2 uppercase tracking-wider">
                            <CalendarDays className="w-3.5 h-3.5" />
                            Execution Logs for {agent.name}
                          </h4>
                          <div className="border border-zinc-200 bg-white rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                                <tr>
                                  <th className="px-4 py-2">Timestamp</th>
                                  <th className="px-4 py-2">Response Preview</th>
                                  <th className="px-4 py-2">Model Used</th>
                                  <th className="px-4 py-2 text-right">Time</th>
                                  <th className="px-4 py-2 text-right">Prompt</th>
                                  <th className="px-4 py-2 text-right">Output</th>
                                  <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100">
                                {messages.filter(m => (m.metadata.sent_by_ai_agent || 'Unknown Agent') === agent.name).map((msg) => {
                                  const stats = msg.metadata.execution_stats || {};
                                  const usage = stats.usage || {};
                                  const perf = stats.performance || {};
                                  
                                  return (
                                    <tr key={msg.id} className="hover:bg-zinc-50/50">
                                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                                        {format(new Date(msg.created_at), 'MMM dd, hh:mm a')}
                                      </td>
                                      <td className="px-4 py-2.5 text-zinc-700 max-w-xs truncate" title={msg.content}>
                                        {msg.content}
                                      </td>
                                      <td className="px-4 py-2.5 text-zinc-600 font-mono text-[10px]">
                                        {perf.model_used || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-zinc-500">
                                        {perf.response_time_ms ? (perf.response_time_ms / 1000).toFixed(2) : '0'}s
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-zinc-600">
                                        {(usage.prompt_tokens || 0).toLocaleString()}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-zinc-600">
                                        {(usage.completion_tokens || 0).toLocaleString()}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                                          {(usage.total_tokens || 0).toLocaleString()}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {agentStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 text-sm">
                    No AI activity recorded yet.
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
