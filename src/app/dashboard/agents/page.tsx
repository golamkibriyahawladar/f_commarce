'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bot, 
  Brain,
  Sparkles,
  Plus, 
  X, 
  Loader2, 
  Settings2,
  Trash2,
  CheckCircle, 
  Facebook,
  Instagram,
  MessageCircle,
  Webhook,
  Globe,
  Sliders,
  AlertCircle,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Database,
  FileText,
  UploadCloud,
  FileUp,
  Cpu
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

interface Integration {
  id: string;
  company_id: string;
  provider: string;
  type: string;
  credentials: {
    name?: string;
    system_prompt?: string;
    llm_provider?: 'openai' | 'gemini';
    model_name?: string;
    openai_key?: string;
    gemini_key?: string;
    pinecone_api_key?: string;
    pinecone_index?: string;
    pinecone_namespace?: string;
    embedding_provider?: 'openai' | 'gemini';
    active_tools?: string[];
    assigned_integrations?: string[];
    knowledge_base_id?: string;
    [key: string]: any;
  };
  webhook_url?: string;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
}

interface KBFile {
  id: string;
  file_name: string;
  size_bytes: number;
  chunk_count: number;
  status: 'processing' | 'completed' | 'error';
  embedding_provider: 'openai' | 'gemini';
  created_at: string;
}

export default function AIAgentsPage() {
  const { profile } = useAuthStore();
  const [agents, setAgents] = useState<Integration[]>([]);
  const [channels, setChannels] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Integration | null>(null);
  const [modalTab, setModalTab] = useState<'core' | 'model' | 'kb' | 'tools'>('core');
  
  // 1. Core Tab
  const [agentName, setAgentName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [agentStatus, setAgentStatus] = useState<'active' | 'inactive'>('active');
  const [assignedChannelIds, setAssignedChannelIds] = useState<string[]>([]);
  
  // 2. Model Tab
  const [llmProvider, setLlmProvider] = useState<'openai' | 'gemini'>('openai');
  const [modelName, setModelName] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [modelsList, setModelsList] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');
  
  // 3. Pinecone Tab
  const [pineconeApiKey, setPineconeApiKey] = useState('');
  const [pineconeIndex, setPineconeIndex] = useState('');
  const [pineconeNamespace, setPineconeNamespace] = useState('');
  const [embeddingProvider, setEmbeddingProvider] = useState<'openai' | 'gemini'>('openai');
  
  // 4. Knowledge Base Tab
  const [kbFiles, setKbFiles] = useState<KBFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [kbs, setKbs] = useState<any[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string>('');
  
  // 5. Tools Tab
  const [activeTools, setActiveTools] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showPineconeKey, setShowPineconeKey] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Integration | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pinecone KB States
  const [pineconeIndexes, setPineconeIndexes] = useState<string[]>([]);
  const [loadingPineconeIndexes, setLoadingPineconeIndexes] = useState(false);
  const [pineconeConnectionStatus, setPineconeConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');
  const [ingestMode, setIngestMode] = useState<'file' | 'text'>('file');
  const [rawTextTitle, setRawTextTitle] = useState('');
  const [rawTextContent, setRawTextContent] = useState('');
  const [clearBeforeIngest, setClearBeforeIngest] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning'; visible: boolean }>({ message: '', type: 'success', visible: false });
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data: ints, error: intsErr } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', profile.company_id);
      if (intsErr) throw intsErr;

      const loadedIntegrations = ints || [];
      const aiAgents = loadedIntegrations.filter(i => i.provider === 'ai_agent');
      const communicationChannels = loadedIntegrations.filter(i => i.provider !== 'ai_agent');

      setAgents(aiAgents);
      setChannels(communicationChannels);

      // Fetch Knowledge Bases
      const { data: kbData } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('company_id', profile.company_id);
      setKbs(kbData || []);
    } catch (err: any) {
      console.error(err);
      showToast('Error loading agents: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile?.company_id]);

  // Load KB Files
  const fetchKbFiles = async (agentId: string) => {
    if (!profile?.company_id) return;
    setLoadingFiles(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`/api/knowledge-base?agentId=${agentId}&companyId=${profile.company_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to load knowledge base files.');
      const data = await res.json();
      setKbFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load RAG files: ' + err.message, 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  const syncModels = async (provider: string, forceSelectFirst = false, currentModelName?: string) => {
    if (!profile?.company_id) return;
    setLoadingModels(true);
    setApiConnectionStatus('checking');
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          companyId: profile.company_id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch models');
      }

      if (data.models && data.models.length > 0) {
        setModelsList(data.models);
        const activeModel = currentModelName || modelName;
        if (forceSelectFirst) {
          setModelName(data.models[0]);
        } else if (activeModel) {
          setModelName(activeModel);
        } else {
          setModelName(data.models[0]);
        }
        setApiConnectionStatus('connected');
      } else {
        setApiConnectionStatus('disconnected');
      }
    } catch (err: any) {
      console.error('Error fetching models:', err?.message || err);
      setModelsList([]);
      setModelName('');
      setApiConnectionStatus('disconnected');
    } finally {
      setLoadingModels(false);
    }
  };

  // Fetch Pinecone indexes dynamically
  const syncPineconeIndexes = async () => {
    if (!profile?.company_id) return;
    setPineconeConnectionStatus('checking');
    setLoadingPineconeIndexes(true);
    try {
      const res = await fetch('/api/pinecone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'listIndexes',
          companyId: profile.company_id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      setPineconeIndexes(data.indexes || []);
      if (data.indexes?.length > 0 && !data.indexes.includes(pineconeIndex)) {
        setPineconeIndex(data.indexes[0]);
      }
      setPineconeConnectionStatus('connected');
    } catch (err: any) {
      console.error('Pinecone connect error:', err);
      setPineconeIndexes([]);
      setPineconeConnectionStatus('disconnected');
      showToast(err.message || 'Failed to connect to Pinecone', 'error');
    } finally {
      setLoadingPineconeIndexes(false);
    }
  };



  // Ingest raw text as a virtual file
  const handleIngestRawText = async () => {
    if (!rawTextContent.trim()) {
      showToast('Please enter some text content to ingest.', 'warning');
      return;
    }
    if (!selectedAgent || !profile?.company_id) {
      showToast('Please save the agent first before ingesting content.', 'warning');
      return;
    }
    const title = rawTextTitle.trim() || `pasted-text-${Date.now()}`;
    const fileName = title.endsWith('.txt') ? title : `${title}.txt`;
    setUploadingFile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const blob = new Blob([rawTextContent], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', profile.company_id);
      formData.append('agentId', selectedAgent.id);
      formData.append('clearNamespace', clearBeforeIngest ? 'true' : 'false');
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to ingest text.');
      }
      showToast(`Text "${fileName}" parsed and ingested successfully.`, 'success');
      setRawTextContent('');
      setRawTextTitle('');
      await fetchKbFiles(selectedAgent.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedAgent(null);
    setModalTab('core');
    setApiConnectionStatus('idle');
    
    // Core settings
    setAgentName('');
    setSystemPrompt('You are a helpful customer support assistant for our store. Answer questions politely and concisely.');
    setAgentStatus('active');
    setAssignedChannelIds([]);
    
    // Model settings
    setLlmProvider('openai');
    setModelName('gpt-4o-mini');
    setOpenaiKey('');
    setGeminiKey('');
    
    // Pinecone settings
    setPineconeApiKey('');
    setPineconeIndex('');
    setPineconeNamespace('');
    setEmbeddingProvider('openai');
    
    // KB states
    setPineconeIndexes([]);
    setPineconeConnectionStatus('idle');
    setLoadingPineconeIndexes(false);
    setSelectedKnowledgeBaseId('');
    
    // Files and tools
    setActiveTools([]);
    
    setShowKey(false);
    syncModels('openai', true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (agent: Integration) => {
    setSelectedAgent(agent);
    setModalTab('core');
    
    const creds = agent.credentials || {};
    
    // Core settings
    setAgentName(creds.name || '');
    setSystemPrompt(creds.system_prompt || '');
    setAgentStatus(agent.status === 'active' ? 'active' : 'inactive');
    setAssignedChannelIds(creds.assigned_integrations || []);
    
    // Model settings
    setLlmProvider(creds.llm_provider || 'openai');
    setModelName(creds.model_name || (creds.llm_provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'));
    
    // Pinecone settings
    setPineconeIndex(creds.pinecone_index || '');
    setPineconeNamespace(creds.pinecone_namespace || '');
    setEmbeddingProvider(creds.embedding_provider || 'openai');
    
    // KB states
    setPineconeIndexes(creds.pinecone_index ? [creds.pinecone_index] : []);
    setPineconeConnectionStatus('idle'); // Will check automatically
    setLoadingPineconeIndexes(false);
    setSelectedKnowledgeBaseId(creds.knowledge_base_id || '');

    // Tools
    setActiveTools(creds.active_tools || []);
    
    setShowKey(false);
    setShowGeminiKey(false);
    setShowPineconeKey(false);
    
    syncPineconeIndexes();
    
    const activeProvider = creds.llm_provider || 'openai';
    const activeModel = creds.model_name || (activeProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
    syncModels(activeProvider, false, activeModel);
    
    setModalOpen(true);
  };

  const handleToggleChannel = (channelId: string) => {
    setAssignedChannelIds(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleToggleTool = (toolId: string) => {
    setActiveTools(prev => 
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  // KB File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedAgent || !profile?.company_id) return;
    
    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'md', 'txt'].includes(extension || '')) {
      showToast('Unsupported file type. Supported formats: .pdf, .docx, .md, .txt', 'warning');
      return;
    }

    setUploadingFile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', profile.company_id);
      formData.append('agentId', selectedAgent.id);
      formData.append('clearNamespace', clearBeforeIngest ? 'true' : 'false');

      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload document.');
      }

      showToast(`Document '${file.name}' parsed and ingested successfully.`, 'success');
      await fetchKbFiles(selectedAgent.id);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // KB File Delete Handler
  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this document from RAG storage? This will purge all associated vectors.') || !selectedAgent || !profile?.company_id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/knowledge-base?fileId=${fileId}&companyId=${profile.company_id}&agentId=${selectedAgent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete file.');
      }

      showToast('Document purged successfully.', 'success');
      await fetchKbFiles(selectedAgent.id);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    if (!agentName.trim()) {
      showToast('Please enter a name for the AI Agent.', 'warning');
      return;
    }
    if (!systemPrompt.trim()) {
      showToast('Please enter a system prompt.', 'warning');
      return;
    }

    setSaving(true);

    try {
      const credentials = {
        name: agentName.trim(),
        system_prompt: systemPrompt.trim(),
        llm_provider: llmProvider,
        model_name: modelName || (llmProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
        knowledge_base_id: selectedKnowledgeBaseId,
        embedding_provider: embeddingProvider,
        active_tools: activeTools,
        assigned_integrations: assignedChannelIds
      };

      if (selectedAgent) {
        // Update existing agent
        const { error } = await supabase
          .from('integrations')
          .update({
            credentials,
            status: agentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAgent.id);

        if (error) throw error;
        showToast(`AI Agent '${agentName}' updated successfully!`, 'success');
      } else {
        // Create new agent integration
        const { error } = await supabase
          .from('integrations')
          .insert({
            company_id: profile.company_id,
            provider: 'ai_agent',
            type: 'webhook',
            credentials,
            status: agentStatus
          });

        if (error) throw error;
        showToast(`AI Agent '${agentName}' created successfully!`, 'success');
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to save AI Agent: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (agent: Integration) => {
    setAgentToDelete(agent);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', agentToDelete.id);

      if (error) throw error;
      showToast(`AI Agent '${agentToDelete.credentials?.name || 'Agent'}' deleted successfully.`, 'success');
      setDeleteModalOpen(false);
      setAgentToDelete(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to delete agent: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (agent: Integration) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;
      showToast(`Agent is now ${newStatus}.`, 'success');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to toggle status: ' + err.message, 'error');
    }
  };

  const getChannelDetails = (channel: Integration) => {
    let title = channel.provider.toUpperCase();
    let icon = <Globe className="w-4 h-4 text-zinc-500" />;

    if (channel.provider === 'facebook') {
      title = channel.credentials?.page_name || 'Facebook Page';
      icon = <Facebook className="w-4 h-4 text-blue-600 shrink-0" />;
    } else if (channel.provider === 'instagram') {
      title = channel.credentials?.page_name || 'Instagram DM';
      icon = <Instagram className="w-4 h-4 text-pink-600 shrink-0" />;
    } else if (channel.provider === 'whatsapp') {
      title = 'WhatsApp Business';
      icon = <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
    } else if (channel.provider === 'webhook') {
      title = channel.credentials?.name || 'Custom Webhook';
      icon = <Webhook className="w-4 h-4 text-indigo-500 shrink-0" />;
    }

    return { title, icon };
  };

  const isEmbeddingConnected = 
    (embeddingProvider === 'openai' && (
      (llmProvider === 'openai' && apiConnectionStatus === 'connected') || 
      (openaiKey && openaiKey !== '')
    )) ||
    (embeddingProvider === 'gemini' && (
      (llmProvider === 'gemini' && apiConnectionStatus === 'connected') || 
      (geminiKey && geminiKey !== '')
    ));

  const isAdmin = profile?.role === 'owner' || profile?.role === 'manager';

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6.5 h-6.5 text-emerald-600 shrink-0" />
            AI Agents Manager
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Configure intelligent AI Chatbots and deploy them as auto-responders across your communication channels.</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-emerald-600/10 active:scale-95 duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create AI Agent
          </button>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4.5 mb-8 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-zinc-900">How AI Agents auto-respond:</h4>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            1. Assign the agent to one or more of your active channels.<br />
            2. Open the <strong>Inbox</strong>, select a conversation thread, and toggle on <strong>AI Autopilot</strong> for that thread.<br />
            3. Incoming messages from customers on that channel will be processed by this AI Agent automatically using your system instructions.
          </p>
        </div>
      </div>

      {/* Agents Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading AI Agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-zinc-200 shadow-sm px-6">
          <Brain className="w-12 h-12 text-zinc-300 mb-3 animate-pulse" />
          <h3 className="font-bold text-zinc-800 text-base">No AI Agents Configured</h3>
          <p className="text-zinc-500 text-xs mt-1 max-w-sm">Create your first AI agent assistant to automate customer support across pages and webhooks.</p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Configure First Agent
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const assignedIds = agent.credentials?.assigned_integrations || [];
            
            return (
              <div 
                key={agent.id} 
                className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative group ${
                  agent.status === 'active' ? 'border-zinc-200' : 'border-zinc-200 opacity-70 bg-zinc-50/20'
                }`}
              >
                {/* Agent Header */}
                <div className="p-5 border-b border-zinc-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        agent.status === 'active' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 text-base tracking-tight truncate max-w-[150px]">
                          {agent.credentials?.name || 'AI Assistant'}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border mt-1 select-none ${
                          agent.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                        }`}>
                          {agent.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleToggleStatus(agent)}
                        title={agent.status === 'active' ? 'Deactivate Agent' : 'Activate Agent'}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          agent.status === 'active' 
                            ? 'hover:bg-amber-50 border-zinc-200 text-zinc-500 hover:text-amber-700 hover:border-amber-200' 
                            : 'hover:bg-emerald-50 border-zinc-200 text-zinc-500 hover:text-emerald-700 hover:border-emerald-200'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleOpenEditModal(agent)}
                            title="Edit Agent settings"
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenDeleteModal(agent)}
                            title="Delete Agent"
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 text-zinc-500 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prompt & Config Body */}
                <div className="p-5 flex-1 space-y-4 text-xs">
                  <div>
                    <span className="block text-zinc-400 font-bold uppercase tracking-wider text-[9px] mb-1.5">System Prompt</span>
                    <p className="text-zinc-600 line-clamp-3 bg-zinc-50/80 border border-zinc-150 p-2.5 rounded-xl italic leading-relaxed text-[11px]">
                      "{agent.credentials?.system_prompt}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-100 py-3">
                    <div>
                      <span className="block text-zinc-450 font-bold uppercase text-[9px] mb-1">Model Provider</span>
                      <span className="text-[11px] font-bold text-zinc-700 capitalize flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                        {agent.credentials?.llm_provider || 'OpenAI'} ({agent.credentials?.model_name || 'gpt-4o-mini'})
                      </span>
                    </div>
                    <div>
                      <span className="block text-zinc-450 font-bold uppercase text-[9px] mb-1">RAG Search</span>
                      <span className={`text-[11px] font-bold ${
                        agent.credentials?.active_tools?.includes('search_knowledge_base') ? 'text-emerald-600' : 'text-zinc-400'
                      }`}>
                        {agent.credentials?.active_tools?.includes('search_knowledge_base') ? '✓ Active' : '✕ Disabled'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-zinc-400 font-bold uppercase tracking-wider text-[9px] mb-1.5">API Key Status</span>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {agent.credentials?.openai_key || agent.credentials?.gemini_key ? (
                        <span className="text-[11px] font-medium flex items-center gap-1 text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Custom Key Loaded
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-zinc-450">
                          Using default server config key
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Channels */}
                  <div>
                    <span className="block text-zinc-400 font-bold uppercase tracking-wider text-[9px] mb-2">Connected Channels ({assignedIds.length})</span>
                    {assignedIds.length === 0 ? (
                      <span className="text-zinc-450 italic block text-[11px] bg-zinc-50 p-2 rounded-lg border border-dashed border-zinc-200 text-center">No assigned channels</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedIds.map(chanId => {
                          const chan = channels.find(c => c.id === chanId);
                          if (!chan) return null;
                          const details = getChannelDetails(chan);
                          return (
                            <div key={chanId} className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-lg">
                              {details.icon}
                              <span className="font-semibold text-[10px] text-zinc-700 max-w-[110px] truncate">{details.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Tabbed Agent Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form 
            onSubmit={handleSaveAgent}
            className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-150 shrink-0 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <Brain className="w-5.5 h-5.5 text-emerald-600" />
                <h3 className="text-lg font-bold text-zinc-900">
                  {selectedAgent ? 'Configure AI Agent Assistant' : 'Create AI Agent'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs (Inline Menu) */}
            <div className="flex border-b border-zinc-200 bg-zinc-50/20 px-3 shrink-0 overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => setModalTab('core')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'core' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Core Settings
              </button>
              <button
                type="button"
                onClick={() => setModalTab('model')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'model' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                LLM settings
              </button>
              <button
                type="button"
                onClick={() => setModalTab('kb')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'kb' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Knowledge Base
              </button>
              <button
                type="button"
                onClick={() => setModalTab('tools')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'tools' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Action Tools
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
              
              {/* TAB 1: CORE DETAILS */}
              {modalTab === 'core' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">AI Agent Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Omnichannel Support Bot"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-zinc-800 text-xs transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">System Instructions / Prompt</label>
                      <span className="text-[10px] text-zinc-400 font-semibold">Teaches the AI how to act</span>
                    </div>
                    <textarea 
                      rows={5}
                      placeholder="Provide rules. E.g. 'You are a helpdesk assistant. Answer nicely. Keep responses under 2 sentences...'"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-250 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-zinc-800 text-xs font-mono transition-colors resize-none"
                      required
                    />
                  </div>

                  {/* Deploy Channels Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Deploy to Communication Channels</label>
                    {channels.length === 0 ? (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-center">
                        <p className="text-zinc-500 text-xs">No active social or webhook channels linked yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                        {channels.map((chan) => {
                          const details = getChannelDetails(chan);
                          const isSelected = assignedChannelIds.includes(chan.id);

                          return (
                            <button
                              key={chan.id}
                              type="button"
                              onClick={() => handleToggleChannel(chan.id)}
                              className={`flex items-center justify-between p-2.5 border rounded-xl transition-all text-left active:scale-[0.98] duration-150 cursor-pointer ${
                                isSelected 
                                  ? 'border-emerald-500 bg-emerald-50/10'
                                  : 'border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-lg border ${
                                  isSelected ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-zinc-50 border-zinc-100 text-zinc-500'
                                }`}>
                                  {details.icon}
                                </div>
                                <span className="font-semibold text-xs text-zinc-800 truncate pr-2">{details.title}</span>
                              </div>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'
                              }`}>
                                {isSelected && <span className="text-[9px]">✓</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">Agent Status</label>
                      <p className="text-zinc-400 text-[10px] mt-0.5">Toggle whether the autopilot responder is online.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAgentStatus('active')}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                          agentStatus === 'active'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentStatus('inactive')}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                          agentStatus === 'inactive'
                            ? 'bg-zinc-800 border-zinc-850 text-white shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MODEL SETTINGS */}
              {modalTab === 'model' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">LLM Provider</label>
                      {apiConnectionStatus === 'connected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                          Connected
                        </span>
                      ) : apiConnectionStatus === 'checking' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-650 border border-zinc-200">
                          <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0 text-zinc-500" />
                          Verifying...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-2.5 h-2.5 shrink-0 text-red-600" />
                          Not Connected
                        </span>
                      )}
                    </div>
                    <select
                      value={llmProvider}
                      onChange={(e) => {
                        const prov = e.target.value as any;
                        setLlmProvider(prov);
                        syncModels(prov, true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs font-semibold text-zinc-850"
                    >
                      <option value="openai">OpenAI (GPT Models)</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="openrouter">OpenRouter (Claude, Llama, etc)</option>
                      <option value="ollama">Ollama (Local Models)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Model Name</label>
                      <button
                        type="button"
                        onClick={() => syncModels(llmProvider)}
                        disabled={loadingModels}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {loadingModels ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <span>🔄 Sync Models</span>
                        )}
                      </button>
                    </div>
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs font-semibold text-zinc-850"
                      disabled={loadingModels || apiConnectionStatus !== 'connected'}
                    >
                      {loadingModels ? (
                        <option value="">Loading available models...</option>
                      ) : apiConnectionStatus !== 'connected' ? (
                        <option value="">No models available (API Key not connected)</option>
                      ) : (
                        <>
                          {modelsList.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                          {modelName && !modelsList.includes(modelName) && (
                            <option value={modelName}>{modelName} (Current)</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Custom API Key inputs removed, now managed globally in Credentials tab */}
                </div>
              )}

              {/* TAB 3: KNOWLEDGE BASE (Combined) */}
              {modalTab === 'kb' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  
                  {/* Info Banner */}
                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-start gap-2.5">
                    <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-zinc-650">
                      <p className="font-bold text-zinc-800 mb-0.5">Knowledge Base</p>
                      Select a knowledge base for this agent to use for RAG (Retrieval-Augmented Generation). You can create and manage knowledge bases in the Knowledge Base tab under Apps & API.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Knowledge Base</label>
                    <select
                      value={selectedKnowledgeBaseId}
                      onChange={(e) => setSelectedKnowledgeBaseId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs font-semibold text-zinc-850"
                    >
                      <option value="">— None —</option>
                      {kbs.map(kb => (
                        <option key={kb.id} value={kb.id}>{kb.name} ({kb.embedding_provider.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 5: AI TOOLS SELECTOR */}
              {modalTab === 'tools' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">AI Capabilities & Tools</label>
                    <p className="text-[10px] text-zinc-400">Toggle which tools the AI agent can execute. Active tools will expand the AI prompt automatically.</p>
                  </div>

                  <div className="space-y-3">
                    {/* Tool Item */}
                    <button
                      type="button"
                      onClick={() => handleToggleTool('search_knowledge_base')}
                      className={`w-full flex items-center justify-between p-3.5 border rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer ${
                        activeTools.includes('search_knowledge_base')
                          ? 'border-emerald-500 bg-emerald-50/10'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${
                          activeTools.includes('search_knowledge_base') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-zinc-50 border-zinc-100 text-zinc-500'
                        }`}>
                          <Database className="w-4 h-4 shrink-0" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900">Knowledge Base Vector Retrieval</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Let the AI query Pinecone to answer questions based on your uploaded PDFs and documentation.</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        activeTools.includes('search_knowledge_base') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'
                      }`}>
                        {activeTools.includes('search_knowledge_base') && <span className="text-[9px]">✓</span>}
                      </div>
                    </button>

                    {/* Tool Item */}
                    <button
                      type="button"
                      onClick={() => handleToggleTool('book_courier')}
                      className={`w-full flex items-center justify-between p-3.5 border rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer ${
                        activeTools.includes('book_courier')
                          ? 'border-emerald-500 bg-emerald-50/10'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${
                          activeTools.includes('book_courier') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-zinc-50 border-zinc-100 text-zinc-500'
                        }`}>
                          <Globe className="w-4 h-4 shrink-0" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900">Automated Courier Booking</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Allows the agent to call Steadfast/Pathao courier APIs to book orders for customers.</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        activeTools.includes('book_courier') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'
                      }`}>
                        {activeTools.includes('book_courier') && <span className="text-[9px]">✓</span>}
                      </div>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-zinc-150 shrink-0 flex gap-3 bg-zinc-50/50">
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2 px-4 border border-zinc-300 text-xs font-bold text-zinc-700 rounded-lg hover:bg-zinc-50 bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-600/10 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : selectedAgent ? 'Save Configuration' : 'Create Agent'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {agentToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setAgentToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete AI Agent"
          message="This action is permanent and cannot be undone. This agent will stop auto-responding on all connected communication channels."
          itemName={agentToDelete.credentials?.name || 'AI Assistant'}
          loading={deleting}
        />
      )}

      {/* Toast Notification */}
      <div 
        className={`fixed bottom-6 right-6 z-[100] max-w-md transition-all duration-500 ease-out ${
          toast.visible 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
          toast.type === 'success' ? 'bg-zinc-950/90 border-emerald-700/50 text-emerald-50' :
          toast.type === 'error' ? 'bg-red-950/90 border-red-700/50 text-red-50' :
          'bg-zinc-900/90 border-zinc-700/50 text-zinc-50'
        }`}>
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      </div>

    </div>
  );
}
