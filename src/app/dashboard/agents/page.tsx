'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  ShieldAlert, 
  CheckCircle, 
  Plus, 
  X, 
  Loader2, 
  Settings2,
  Lock,
  Facebook,
  Instagram,
  MessageCircle,
  Webhook,
  Globe,
  Shield,
  Briefcase,
  Layers,
  Search
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'manager' | 'agent';
  company_id: string | null;
  created_at: string;
}

interface Integration {
  id: string;
  company_id: string;
  provider: string;
  type: string;
  credentials: any;
  webhook_url?: string;
  status: string;
  created_at: string;
}

interface ProfileAssignment {
  id: string;
  profile_id: string;
  integration_id: string;
}

export default function AgentsPage() {
  const { profile } = useAuthStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [assignments, setAssignments] = useState<ProfileAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedAgent, setSelectedAgent] = useState<Profile | null>(null);
  const [tempAssignedIds, setTempAssignedIds] = useState<string[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

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
      // 1. Fetch profiles in the same company
      const { data: profs, error: profsErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id);
      if (profsErr) throw profsErr;

      // 2. Fetch all integrations for the company
      const { data: ints, error: intsErr } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', profile.company_id);
      if (intsErr) throw intsErr;

      // 3. Fetch all profile assignments for the company
      const integrationIds = (ints || []).map(i => i.id);
      let loadedAssignments: ProfileAssignment[] = [];
      
      if (integrationIds.length > 0) {
        const { data: assigns, error: assignsErr } = await supabase
          .from('profile_assignments')
          .select('*')
          .in('integration_id', integrationIds);
        if (assignsErr) throw assignsErr;
        loadedAssignments = assigns || [];
      }

      setProfiles(profs || []);
      setIntegrations(ints || []);
      setAssignments(loadedAssignments);
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

  const handleOpenAssignModal = (agent: Profile) => {
    setSelectedAgent(agent);
    // Find integrations currently assigned to this agent
    const currentAssignments = assignments
      .filter(a => a.profile_id === agent.id)
      .map(a => a.integration_id);
    setTempAssignedIds(currentAssignments);
  };

  const handleToggleAssignment = (integrationId: string) => {
    setTempAssignedIds(prev => 
      prev.includes(integrationId)
        ? prev.filter(id => id !== integrationId)
        : [...prev, integrationId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedAgent || !profile?.id) return;
    setSavingAssignments(true);

    const agentId = selectedAgent.id;
    const initialAssignedIds = assignments
      .filter(a => a.profile_id === agentId)
      .map(a => a.integration_id);

    // Calculate additions and removals
    const toAdd = tempAssignedIds.filter(id => !initialAssignedIds.includes(id));
    const toRemove = initialAssignedIds.filter(id => !tempAssignedIds.includes(id));

    try {
      // 1. Delete removed assignments
      if (toRemove.length > 0) {
        const { error: delErr } = await supabase
          .from('profile_assignments')
          .delete()
          .eq('profile_id', agentId)
          .in('integration_id', toRemove);
        if (delErr) throw delErr;
      }

      // 2. Insert new assignments
      if (toAdd.length > 0) {
        const insertRows = toAdd.map(id => ({
          profile_id: agentId,
          integration_id: id,
          assigned_by: profile.id
        }));

        const { error: insErr } = await supabase
          .from('profile_assignments')
          .insert(insertRows);
        if (insErr) throw insErr;
      }

      showToast(`Successfully updated channel assignments for ${selectedAgent.full_name || 'Agent'}!`, 'success');
      
      // Refresh assignments in local state
      await fetchData();
      setSelectedAgent(null);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to save assignments: ' + err.message, 'error');
    } finally {
      setSavingAssignments(false);
    }
  };

  const getIntegrationDetails = (integration: Integration) => {
    let title = integration.provider.toUpperCase();
    let subtitle = '';
    let icon = <Globe className="w-4 h-4 text-zinc-500" />;

    if (integration.provider === 'facebook') {
      title = integration.credentials?.page_name || 'Facebook Page';
      subtitle = 'Facebook DM Sync';
      icon = <Facebook className="w-4 h-4 text-blue-600 animate-pulse" />;
    } else if (integration.provider === 'instagram') {
      title = integration.credentials?.page_name || 'Instagram Account';
      subtitle = 'Instagram DMs';
      icon = <Instagram className="w-4 h-4 text-pink-600 animate-pulse" />;
    } else if (integration.provider === 'whatsapp') {
      title = 'WhatsApp Business';
      subtitle = 'Official Cloud API';
      icon = <MessageCircle className="w-4 h-4 text-emerald-500 animate-pulse" />;
    } else if (integration.provider === 'webhook') {
      title = integration.credentials?.name || 'Custom Webhook';
      subtitle = 'Outbound Events';
      icon = <Webhook className="w-4 h-4 text-indigo-500 animate-pulse" />;
    }

    return { title, subtitle, icon };
  };

  const filteredProfiles = profiles.filter(p => {
    const fullName = p.full_name?.toLowerCase() || '';
    const email = p.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const isAdmin = profile?.role === 'owner' || profile?.role === 'manager';

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600 shrink-0" />
            Agent Assignments
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage agent profiles and assign them to specific communication channels.</p>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Members</span>
            <span className="text-2xl font-extrabold text-zinc-900 leading-tight">{profiles.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Active Channels</span>
            <span className="text-2xl font-extrabold text-zinc-900 leading-tight">{integrations.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Access Roles</span>
            <span className="text-2xl font-extrabold text-zinc-900 leading-tight">
              {profiles.filter(p => p.role === 'owner').length} Owners | {profiles.filter(p => p.role === 'agent').length} Agents
            </span>
          </div>
        </div>
      </div>

      {/* Profiles Search and Table Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-150 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search agents by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 text-sm focus:outline-none text-zinc-800 placeholder-zinc-400"
          />
        </div>

        {/* Profile Assignments Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-zinc-500 text-sm">Fetching agent lists...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-zinc-500 text-sm">No profiles found matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Name & Email</th>
                  <th className="p-4">System Role</th>
                  <th className="p-4">Assigned Integrations</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredProfiles.map((userProfile) => {
                  const agentAssignments = assignments.filter(a => a.profile_id === userProfile.id);
                  const isSelf = userProfile.id === profile?.id;

                  return (
                    <tr key={userProfile.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0 uppercase">
                            {userProfile.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 text-sm flex items-center gap-1.5">
                              {userProfile.full_name || 'Anonymous User'}
                              {isSelf && (
                                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-200">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-zinc-500 block">{userProfile.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          userProfile.role === 'owner' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          userProfile.role === 'manager' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}>
                          {userProfile.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {agentAssignments.length === 0 ? (
                          <span className="text-xs text-zinc-400 italic">No channels assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {agentAssignments.map((a) => {
                              const integration = integrations.find(i => i.id === a.integration_id);
                              if (!integration) return null;
                              const details = getIntegrationDetails(integration);

                              return (
                                <div key={a.id} className="flex items-center gap-1 bg-zinc-50 border border-zinc-250 px-2 py-1 rounded-lg text-xs text-zinc-800">
                                  {details.icon}
                                  <span className="font-semibold text-[11px] max-w-[100px] truncate">{details.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isAdmin ? (
                          <button 
                            onClick={() => handleOpenAssignModal(userProfile)}
                            className="flex items-center gap-1.5 text-xs text-zinc-650 hover:text-emerald-700 font-semibold border border-zinc-200 hover:border-emerald-200 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors ml-auto active:scale-95 duration-200"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Assign Channels
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400 italic flex items-center justify-end gap-1.5">
                            <Lock className="w-3 h-3 text-zinc-300" />
                            Read-Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Channels Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-150 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Assign Channels</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Assign integrations to {selectedAgent.full_name || 'Agent'}</p>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Integrations List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {integrations.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-zinc-500">No active integrations found in your workspace.</p>
                  <p className="text-xs text-zinc-400 mt-1">Please connect integrations in the Settings first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => {
                    const details = getIntegrationDetails(integration);
                    const isChecked = tempAssignedIds.includes(integration.id);

                    return (
                      <button 
                        key={integration.id}
                        onClick={() => handleToggleAssignment(integration.id)}
                        className={`w-full flex items-center justify-between p-3.5 border rounded-xl transition-all text-left group active:scale-[0.99] duration-200 ${
                          isChecked 
                            ? 'border-emerald-500 bg-emerald-50/20' 
                            : 'border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`p-2.5 rounded-lg border transition-all ${
                            isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100'
                          }`}>
                            {details.icon}
                          </div>
                          <div>
                            <h5 className="font-bold text-zinc-900 text-sm">{details.title}</h5>
                            <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">{details.subtitle} • {integration.provider}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'border-zinc-300 group-hover:border-zinc-450 bg-white'
                        }`}>
                          {isChecked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-150 shrink-0 flex gap-3 bg-zinc-50">
              <button 
                type="button" 
                onClick={() => setSelectedAgent(null)}
                className="flex-1 py-2 px-4 border border-zinc-300 text-sm font-semibold text-zinc-700 rounded-lg hover:bg-zinc-50 bg-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {savingAssignments && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingAssignments ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>

          </div>
        </div>
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
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-50' :
          toast.type === 'error' ? 'bg-red-950/90 border-red-700/50 text-red-50' :
          'bg-zinc-900/90 border-zinc-700/50 text-zinc-50'
        }`}>
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-red-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      </div>

    </div>
  );
}
