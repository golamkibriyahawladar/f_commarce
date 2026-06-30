'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useInboxStore, Conversation, Message } from '@/store/inboxStore';
import { useAuthStore } from '@/store/authStore';
import { 
  MessageCircle, 
  Search, 
  Send, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight,
  Bot,
  UserCheck,
  CheckCircle,
  Truck,
  Package,
  Clock,
  ArrowLeft,
  Settings,
  Share2,
  Webhook,
  ChevronDown,
  ChevronUp,
  Zap,
  Cpu
} from 'lucide-react';

interface TelemetryStats {
  chat_info?: {
    session_id?: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  performance?: {
    model_used?: string;
    response_time_ms?: number;
    llm_runs?: Array<{
      run_index: number;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      execution_time_ms: number;
      model: string;
    }>;
  };
}

const TelemetryDetails = ({ stats }: { stats: TelemetryStats }) => {
  const [open, setOpen] = useState(false);
  
  if (!stats) return null;
  
  const usage = stats.usage || {};
  const perf = stats.performance || {};
  const model = perf.model_used || 'AI Model';
  const timeSec = perf.response_time_ms ? (perf.response_time_ms / 1000).toFixed(2) : '0';
  const tokens = usage.total_tokens || 0;
  
  return (
    <div className="flex flex-col items-end text-[10px] text-zinc-550 select-none">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:text-zinc-900 transition-colors font-semibold px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 cursor-pointer"
      >
        <Zap className="w-3 h-3 text-amber-500 shrink-0" />
        <span>Telemetry: {tokens.toLocaleString()} tokens · {timeSec}s ({model})</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {open && (
        <div className="mt-1 w-64 bg-zinc-900 text-zinc-250 border border-zinc-800 rounded-xl p-3.5 shadow-xl text-left space-y-3 font-mono leading-relaxed animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 text-zinc-400 text-[9px] font-bold">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>AI EXECUTION STATISTICS</span>
            </div>
            <span className="text-zinc-500">ID: {stats.chat_info?.session_id?.slice(0, 8) || 'N/A'}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-zinc-550 block">LLM Model:</span>
              <span className="text-white font-bold">{model}</span>
            </div>
            <div>
              <span className="text-zinc-550 block">Response Time:</span>
              <span className="text-white font-bold">{timeSec}s</span>
            </div>
            <div>
              <span className="text-zinc-550 block">Total Tokens:</span>
              <span className="text-emerald-400 font-bold">{tokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-zinc-550 block">Split (P/C):</span>
              <span className="text-zinc-300 font-bold">
                {usage.prompt_tokens?.toLocaleString() || 0} / {usage.completion_tokens?.toLocaleString() || 0}
              </span>
            </div>
          </div>
          
          {perf.llm_runs && perf.llm_runs.length > 0 && (
            <div className="border-t border-zinc-850 pt-2 space-y-1.5">
              <span className="text-zinc-500 text-[9px] font-bold uppercase block tracking-wider">LLM Runs Breakdown ({perf.llm_runs.length})</span>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                {perf.llm_runs.map((run, idx) => (
                  <div key={idx} className="bg-zinc-950 border border-zinc-850 p-2 rounded-lg text-[9px] space-y-1">
                    <div className="flex justify-between font-bold text-zinc-300">
                      <span>Run #{run.run_index ?? idx} ({run.model})</span>
                      <span className="text-amber-400">{((run.execution_time_ms ?? 0) / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between text-zinc-550">
                      <span>Tokens: {run.total_tokens?.toLocaleString() || 0}</span>
                      <span>{run.prompt_tokens?.toLocaleString() || 0} prompt / {run.completion_tokens?.toLocaleString() || 0} comp</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default function InboxPage() {
  const { profile } = useAuthStore();
  const {
    conversations,
    selectedConversationId,
    filterPlatform,
    filterStatus,
    setSelectedConversationId,
    setFilterPlatform,
    setFilterStatus,
    sendMessage,
    toggleAiMode,
    fetchConversations,
    subscribeToRealtime,
    loading
  } = useInboxStore();

  const [inputVal, setInputVal] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchConversations(profile.company_id);
      const unsubscribe = subscribeToRealtime(profile.company_id);
      return () => unsubscribe();
    }
  }, [profile?.company_id, fetchConversations, subscribeToRealtime]);

  const selectedConv = conversations.find(c => c.id === selectedConversationId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const matchesPlatform = filterPlatform === 'all' || c.platform === filterPlatform;
    const matchesStatus = c.status === filterStatus;
    const matchesSearch = c.customer_name.toLowerCase().includes(searchVal.toLowerCase()) || 
                          c.last_message.toLowerCase().includes(searchVal.toLowerCase());
    return matchesPlatform && matchesStatus && matchesSearch;
  });

  const handleSend = () => {
    if (!inputVal.trim() || !selectedConversationId || !profile?.company_id) return;
    sendMessage(selectedConversationId, inputVal, profile.company_id, 'agent');
    setInputVal('');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return (
          <svg className="w-4 h-4 text-blue-600 fill-current" viewBox="0 0 24 24">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg className="w-4 h-4 text-pink-600 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        );
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-600" fill="currentColor" />;
      case 'webhook':
        return <Webhook className="w-4 h-4 text-indigo-500" />;
      default:
        return null;
    }
  };


  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectConversationOnMobile = (id: string) => {
    setSelectedConversationId(id);
    setMobileView('chat');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm relative">
      
      {/* ── COLUMN 1: Threads Sidebar ── */}
      <div className={`w-full lg:w-80 border-r border-zinc-200 flex flex-col shrink-0 ${
        mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-zinc-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search chat or customer..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border-none"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </div>
          
          {/* Platform Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['all', 'facebook', 'instagram', 'whatsapp', 'webhook'].map((plat) => (
              <button
                key={plat}
                onClick={() => setFilterPlatform(plat as any)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold capitalize transition-colors shrink-0 cursor-pointer ${
                  filterPlatform === plat 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {plat}
              </button>
            ))}
          </div>


        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-6 text-zinc-400 text-xs">
              <svg className="animate-spin h-5 w-5 mr-2 text-zinc-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">No conversations found.</div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversationOnMobile(conv.id)}
                className={`p-4 cursor-pointer transition-colors flex gap-3 items-start ${
                  selectedConversationId === conv.id ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'
                }`}
              >
                {/* Avatar with Platform overlay */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700">
                    {conv.customer_name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border border-zinc-200 shadow-sm">
                    {getPlatformIcon(conv.platform)}
                  </div>
                </div>

                {/* Conversation Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-bold text-zinc-900 truncate">{conv.customer_name}</h4>
                    <span className="text-[9px] text-zinc-400 font-medium shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{conv.last_message}</p>
                  
                  {/* Indicators */}
                  <div className="flex gap-2 items-center mt-1.5">
                    {conv.is_ai_mode && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-extrabold tracking-wide uppercase">
                        <Bot className="w-2.5 h-2.5" /> AI Autopilot
                      </span>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="ml-auto w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[9px] text-white font-extrabold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


      {/* ── COLUMN 2: Chat Interface Feed Panel (Mobile Chat View) ── */}
      <div className={`flex-1 flex flex-col bg-zinc-50 ${
        mobileView === 'list' ? 'hidden lg:flex' : 'flex'
      }`}>
        {selectedConv ? (
          <>
            {/* Active Thread Header */}
            <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button for mobile view */}
                <button 
                  onClick={() => setMobileView('list')}
                  className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    {selectedConv.customer_name}
                    {getPlatformIcon(selectedConv.platform)}
                  </h3>
                  <p className="text-[10px] text-zinc-500">{selectedConv.customer_phone || 'No phone number'}</p>
                </div>
              </div>

              {/* AI Autonomous Toggle Safety Switch & Profile Drawer Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAiMode(selectedConv.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedConv.is_ai_mode
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'bg-zinc-100 text-zinc-700 border border-transparent hover:bg-zinc-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI Co-Pilot {selectedConv.is_ai_mode ? 'ON' : 'OFF'}</span>
                </button>


              </div>
            </div>

            {/* Scrollable Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConv.messages.map((msg) => {
                const isAgent = msg.sender_type === 'agent';
                const isAi = msg.sender_type === 'ai';
                const isSystem = msg.sender_type === 'system';
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2 animate-in fade-in duration-200">
                      <span className="bg-zinc-200 text-zinc-700 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="space-y-1">
                    <div 
                      className={`flex ${isAgent || isAi ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                        isAgent 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : isAi 
                            ? 'bg-orange-500 text-white rounded-tr-none' 
                            : 'bg-white text-zinc-900 border border-zinc-200 rounded-tl-none'
                      }`}>
                        <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-[8px] mt-1 text-right ${
                          isAgent || isAi ? 'text-zinc-200' : 'text-zinc-400'
                        }`}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>

                    {isAi && msg.metadata?.execution_stats && (
                      <div className="flex justify-end pr-2 animate-in fade-in duration-300">
                        <TelemetryDetails stats={msg.metadata.execution_stats} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Typing input Editor */}
            <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
              <div className="relative flex items-center bg-zinc-100 rounded-xl px-3 py-2 border border-zinc-200">
                <textarea
                  rows={1}
                  disabled={selectedConv.is_ai_mode}
                  placeholder={
                    selectedConv.is_ai_mode 
                      ? '🔒 AI Autopilot is active... Toggle Co-Pilot OFF to type.' 
                      : 'Type a message... (Press Enter to Send)'
                  }
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs text-zinc-900 resize-none max-h-20 disabled:opacity-50 py-1.5"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={selectedConv.is_ai_mode || !inputVal.trim()}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:hover:bg-emerald-600 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            Select a conversation thread to begin messaging.
          </div>
        )}
      </div>


    </div>
  );
}
