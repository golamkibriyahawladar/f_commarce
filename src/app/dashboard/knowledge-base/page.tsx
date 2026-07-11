'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Database, Plus, Trash2, Loader2, ArrowLeft, 
  FileText, UploadCloud, CheckCircle, AlertCircle,
  FileUp, Settings2, ShieldCheck
} from 'lucide-react';

interface KnowledgeBase {
  id: string;
  name: string;
  pinecone_index: string;
  pinecone_namespace: string;
  embedding_provider: string;
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

export default function KnowledgeBasePage() {
  const { profile } = useAuthStore();
  
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  
  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbProvider, setNewKbProvider] = useState<'openai'|'gemini'>('openai');
  const [newKbIndex, setNewKbIndex] = useState('');
  const [newKbNamespace, setNewKbNamespace] = useState('');

  // Files
  const [files, setFiles] = useState<KBFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const fetchKbs = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const token = await getAuthHeader();
      const res = await fetch(`/api/knowledge-bases?companyId=${profile.company_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKbs(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchKbs();
  }, [fetchKbs]);

  const handleCreate = async () => {
    if (!newKbName) return alert('Name is required');
    setCreating(true);
    try {
      const token = await getAuthHeader();
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: profile?.company_id,
          name: newKbName,
          embedding_provider: newKbProvider,
          pinecone_index: newKbIndex,
          pinecone_namespace: newKbNamespace
        })
      });
      
      if (res.ok) {
        setCreateModal(false);
        setNewKbName('');
        fetchKbs();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this Knowledge Base? All files will be deleted.')) return;
    try {
      const token = await getAuthHeader();
      const res = await fetch(`/api/knowledge-bases?id=${id}&companyId=${profile?.company_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchKbs();
    } catch (err) {
      console.error(err);
    }
  };

  // --- DETAIL VIEW ---
  
  const fetchFiles = async (kbId: string) => {
    if (!profile?.company_id) return;
    setFilesLoading(true);
    try {
      const token = await getAuthHeader();
      const res = await fetch(`/api/knowledge-base?knowledgeBaseId=${kbId}&companyId=${profile.company_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFilesLoading(false);
    }
  };

  const openKb = (kb: KnowledgeBase) => {
    setSelectedKb(kb);
    setView('detail');
    fetchFiles(kb.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedKb) return;
    const file = e.target.files[0];
    
    // Size check
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) return alert('File is too large. Max size is 10MB.');
    
    setUploading(true);
    try {
      const token = await getAuthHeader();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', profile?.company_id || '');
      formData.append('knowledgeBaseId', selectedKb.id);
      // Optional: formData.append('clearNamespace', 'false');

      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        fetchFiles(selectedKb.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload');
      }
    } catch (err) {
      console.error(err);
      alert('Network error during upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!selectedKb || !profile?.company_id) return;
    if (!confirm('Are you sure you want to delete this file? It will be removed from Pinecone.')) return;
    
    try {
      const token = await getAuthHeader();
      const res = await fetch(`/api/knowledge-base?fileId=${fileId}&companyId=${profile.company_id}&knowledgeBaseId=${selectedKb.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFiles(selectedKb.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <Link href="/dashboard/credentials" className="text-zinc-500 hover:text-zinc-700 font-medium pb-3 px-1 text-sm transition-colors">
          Credentials
        </Link>
        <Link href="/dashboard/knowledge-base" className="border-b-2 border-emerald-600 text-emerald-700 font-semibold pb-3 px-1 text-sm">
          Knowledge Base
        </Link>
      </div>

      {view === 'list' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-zinc-900">Your Knowledge Bases</h2>
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Knowledge Base
            </button>
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
          ) : kbs.length === 0 ? (
             <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
               <Database className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-zinc-900 mb-1">No Knowledge Bases Found</h3>
               <p className="text-sm text-zinc-500">Create one to start uploading files for your AI agents.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kbs.map(kb => (
                <div 
                  key={kb.id} 
                  onClick={() => openKb(kb)}
                  className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 group-hover:scale-110 transition-transform">
                      <Database className="w-5 h-5" />
                    </div>
                    <button onClick={(e) => handleDelete(kb.id, e)} className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg mb-1">{kb.name}</h3>
                  <div className="flex flex-col gap-1 mt-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5"/> Model: <span className="font-medium text-zinc-700 uppercase">{kb.embedding_provider}</span></span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> Index: <span className="font-medium text-zinc-700">{kb.pinecone_index || 'Global'}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'detail' && selectedKb && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Knowledge Bases
          </button>
          
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{selectedKb.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 font-medium">
                  <span className="bg-zinc-100 px-2 py-0.5 rounded-full uppercase">{selectedKb.embedding_provider}</span>
                  <span>Namespace: <span className="text-emerald-700">{selectedKb.pinecone_namespace}</span></span>
                </div>
              </div>
            </div>
            
            <div>
               <input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileUpload}
                 accept=".txt,.md,.pdf,.docx"
                 className="hidden"
               />
               <button
                 onClick={() => fileInputRef.current?.click()}
                 disabled={uploading}
                 className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
               >
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                 {uploading ? 'Uploading...' : 'Upload File'}
               </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h3 className="font-bold text-zinc-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> 
                Documents ({files.length})
              </h3>
            </div>
            <div className="p-0">
              {filesLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No files uploaded yet. Upload PDFs, Word documents, or text files to add knowledge.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {files.map(file => (
                    <div key={file.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900">{file.file_name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                            <span>{(file.size_bytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{file.chunk_count} chunks</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {file.status === 'completed' ? (
                           <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                             <CheckCircle className="w-3.5 h-3.5" /> Ready
                           </span>
                        ) : file.status === 'processing' ? (
                           <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                             <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                           </span>
                        ) : (
                           <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                             <AlertCircle className="w-3.5 h-3.5" /> Error
                           </span>
                        )}
                        
                        <button 
                          onClick={() => handleFileDelete(file.id)}
                          className="text-zinc-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <h3 className="font-bold text-zinc-900">Create Knowledge Base</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Knowledge Base Name</label>
                <input
                  type="text"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder="e.g. Sales Playbook 2024"
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Embedding Provider</label>
                <select
                  value={newKbProvider}
                  onChange={(e) => setNewKbProvider(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="openai">OpenAI (text-embedding-3-small)</option>
                  <option value="gemini">Google Gemini (gemini-embedding-001)</option>
                </select>
              </div>

              <div className="pt-2">
                <p className="text-xs text-zinc-500 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <strong className="text-blue-700 block mb-1">Optional Pinecone Override</strong>
                  If left blank, it will use the global Pinecone index from Credentials.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Pinecone Index</label>
                    <input
                      type="text"
                      value={newKbIndex}
                      onChange={(e) => setNewKbIndex(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Namespace</label>
                    <input
                      type="text"
                      value={newKbNamespace}
                      onChange={(e) => setNewKbNamespace(e.target.value)}
                      placeholder="Auto-generated"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50">
              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
