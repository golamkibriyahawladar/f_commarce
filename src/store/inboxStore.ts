import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'system' | 'ai';
  message_type: 'text' | 'image' | 'video' | 'document' | 'comment';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'webhook';
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: 'open' | 'snoozed' | 'closed';
  is_ai_mode: boolean;
  messages: Message[];
}

interface InboxState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  loading: boolean;
  filterPlatform: 'all' | 'facebook' | 'instagram' | 'whatsapp' | 'webhook';
  filterStatus: 'open' | 'snoozed' | 'closed';
  setSelectedConversationId: (id: string | null) => void;
  setFilterPlatform: (platform: 'all' | 'facebook' | 'instagram' | 'whatsapp' | 'webhook') => void;
  setFilterStatus: (status: 'open' | 'snoozed' | 'closed') => void;
  fetchConversations: (companyId: string) => Promise<void>;
  subscribeToRealtime: (companyId: string) => () => void;
  sendMessage: (conversationId: string, content: string, companyId: string, senderType?: 'agent' | 'ai') => Promise<void>;
  toggleAiMode: (conversationId: string) => Promise<void>;
  updateDeliveryStatus: (conversationId: string, status: string, companyId: string) => Promise<void>;
  loadMockData: () => void;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  loading: false,
  filterPlatform: 'all',
  filterStatus: 'open',

  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  
  setFilterPlatform: (platform) => set({ filterPlatform: platform }),
  
  setFilterStatus: (status) => set({ filterStatus: status }),

  fetchConversations: async (companyId) => {
    set({ loading: true });
    try {
      // Fetch conversations with joined customers & integrations details
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          integration:integrations(*)
        `)
        .eq('company_id', companyId)
        .order('last_message_at', { ascending: false });

      if (convErr) throw convErr;

      // 2. Fetch messages for each conversation
      const conversationsWithMessages = await Promise.all(
        (convs || []).map(async (conv: any) => {
          const { data: msgs, error: msgErr } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (msgErr) throw msgErr;

          return {
            id: conv.id,
            platform: (conv.integration?.provider as any) || 'facebook',
            customer_name: conv.customer?.name || (conv.integration?.provider === 'webhook' ? 'Webhook User' : 'Social User'),
            customer_phone: conv.customer?.phone || '',
            customer_email: conv.customer?.email || '',
            customer_address: conv.customer?.shipping_address?.address || '',
            last_message: conv.last_message || '',
            last_message_at: conv.last_message_at || conv.created_at,
            unread_count: conv.unread_count || 0,
            status: conv.status || 'open',
            is_ai_mode: conv.is_ai_mode || false,
            messages: msgs || []
          };
        })
      );

      // Select first conversation if none selected
      const currentSelected = get().selectedConversationId;
      const nextSelected = conversationsWithMessages.length > 0 
        ? (conversationsWithMessages.some(c => c.id === currentSelected) ? currentSelected : conversationsWithMessages[0].id)
        : null;

      set({ 
        conversations: conversationsWithMessages, 
        selectedConversationId: nextSelected, 
        loading: false 
      });
    } catch (err) {
      console.error('Error fetching conversations:', err);
      set({ loading: false });
    }
  },

  subscribeToRealtime: (companyId) => {
    const supabaseClient = supabase;

    // Listen for new messages
    const messageChannel = supabaseClient
      .channel('messages-db-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        
        set((state) => {
          const updatedConversations = state.conversations.map((conv) => {
            if (conv.id === newMsg.conversation_id) {
              const exists = conv.messages.some(m => m.id === newMsg.id);
              const messages = exists ? conv.messages : [...conv.messages, newMsg];
              return {
                ...conv,
                last_message: newMsg.content,
                last_message_at: newMsg.created_at,
                messages
              };
            }
            return conv;
          });
          return { conversations: updatedConversations };
        });
      })
      .subscribe();

    // Listen for updates on conversations (e.g. AI mode, status changes, last_message, unread_count)
    const convChannel = supabaseClient
      .channel('conversations-db-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `company_id=eq.${companyId}`
      }, async (payload) => {
        const updatedConv = payload.new as any;
        const eventType = payload.eventType;

        if (eventType === 'DELETE') {
          set((state) => ({
            conversations: state.conversations.filter(c => c.id !== payload.old.id),
            selectedConversationId: state.selectedConversationId === payload.old.id ? null : state.selectedConversationId
          }));
          return;
        }

        const conversations = get().conversations;
        const exists = conversations.some(c => c.id === updatedConv.id);

        if (exists) {
          set((state) => ({
            conversations: state.conversations.map((c) => {
              if (c.id === updatedConv.id) {
                return {
                  ...c,
                  status: updatedConv.status,
                  is_ai_mode: updatedConv.is_ai_mode,
                  unread_count: updatedConv.unread_count,
                  last_message: updatedConv.last_message,
                  last_message_at: updatedConv.last_message_at
                };
              }
              return c;
            })
          }));
        } else {
          // If a new conversation is created, trigger a refresh to fetch details with joined customer
          get().fetchConversations(companyId);
        }
      })
      .subscribe();

    // Return cleanup function to unsubscribe
    return () => {
      supabaseClient.removeChannel(messageChannel);
      supabaseClient.removeChannel(convChannel);
    };
  },

  sendMessage: async (conversationId, content, companyId, senderType = 'agent') => {
    // 1. Optimistic UI update (optional, but good for UX)
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'text',
      content,
      created_at: new Date().toISOString()
    };

    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            last_message: content,
            last_message_at: tempMsg.created_at,
            messages: [...c.messages, tempMsg]
          };
        }
        return c;
      })
    }));

    try {
      // 2. Call the server route to route outbound messaging API
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, companyId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send message');
      }

      const data = await res.json();
      
      // 3. Replace the temp message with the actual saved message
      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === tempId ? data.message : m)
            };
          }
          return c;
        })
      }));
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove the temp message if sending failed
      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: c.messages.filter(m => m.id !== tempId)
            };
          }
          return c;
        })
      }));
    }
  },

  toggleAiMode: async (conversationId) => {
    const conversations = get().conversations;
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const newVal = !conv.is_ai_mode;

    // Optimistic Update
    set((state) => ({
      conversations: state.conversations.map((c) => 
        c.id === conversationId ? { ...c, is_ai_mode: newVal } : c
      )
    }));

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_ai_mode: newVal })
        .eq('id', conversationId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling AI mode:', err);
      // Revert state
      set((state) => ({
        conversations: state.conversations.map((c) => 
          c.id === conversationId ? { ...c, is_ai_mode: conv.is_ai_mode } : c
        )
      }));
    }
  },

  updateDeliveryStatus: async (conversationId, status, companyId) => {
    const content = `Delivery status updated to: ${status}`;
    try {
      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          company_id: companyId,
          sender_type: 'system',
          message_type: 'text',
          content,
          metadata: { delivery_status: status }
        })
        .select()
        .single();
      
      if (error) throw error;

      await supabase
        .from('conversations')
        .update({
          last_message: `System: ${content}`,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

    } catch (err) {
      console.error('Error updating delivery status:', err);
    }
  },

  loadMockData: () => {
    // Keep it as a no-op fallback so we don't break code imports
  }
}));
