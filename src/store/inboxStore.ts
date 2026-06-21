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
  platform: 'facebook' | 'instagram' | 'whatsapp';
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
  filterPlatform: 'all' | 'facebook' | 'instagram' | 'whatsapp';
  filterStatus: 'open' | 'snoozed' | 'closed';
  setSelectedConversationId: (id: string | null) => void;
  setFilterPlatform: (platform: 'all' | 'facebook' | 'instagram' | 'whatsapp') => void;
  setFilterStatus: (status: 'open' | 'snoozed' | 'closed') => void;
  sendMessage: (conversationId: string, content: string, senderType?: 'agent' | 'ai') => void;
  toggleAiMode: (conversationId: string) => void;
  updateDeliveryStatus: (conversationId: string, status: string) => void;
  loadMockData: () => void;
}

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    platform: 'facebook',
    customer_name: 'Imran Khan',
    customer_phone: '01712345678',
    customer_email: 'imran@gmail.com',
    customer_address: 'House 42, Road 11, Banani, Dhaka',
    last_message: 'Do you have this in blue color?',
    last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    unread_count: 2,
    status: 'open',
    is_ai_mode: false,
    messages: [
      { id: 'm-1', conversation_id: 'conv-1', sender_type: 'customer', message_type: 'text', content: 'Hello, I saw your product on page.', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      { id: 'm-2', conversation_id: 'conv-1', sender_type: 'agent', message_type: 'text', content: 'Hi Imran! Which product are you interested in?', created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      { id: 'm-3', conversation_id: 'conv-1', sender_type: 'customer', message_type: 'text', content: 'Do you have this in blue color?', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: 'conv-2',
    platform: 'whatsapp',
    customer_name: 'Sumaiya Rahman',
    customer_phone: '01987654321',
    customer_email: 'sumaiya@gmail.com',
    customer_address: 'Sector 4, Uttara, Dhaka',
    last_message: 'Please confirm my order.',
    last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unread_count: 0,
    status: 'open',
    is_ai_mode: true,
    messages: [
      { id: 'm-4', conversation_id: 'conv-2', sender_type: 'customer', message_type: 'text', content: 'Can I order via WhatsApp?', created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
      { id: 'm-5', conversation_id: 'conv-2', sender_type: 'ai', message_type: 'text', content: 'Yes, absolutely! Please provide your name, phone number, and address.', created_at: new Date(Date.now() - 38 * 60 * 1000).toISOString() },
      { id: 'm-6', conversation_id: 'conv-2', sender_type: 'customer', message_type: 'text', content: 'Sumaiya, 01987654321, Sector 4, Uttara. Please confirm my order.', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: 'conv-3',
    platform: 'instagram',
    customer_name: 'Rakib Hasan',
    customer_phone: '01511223344',
    customer_email: 'rakib@gmail.com',
    customer_address: 'Agrabad, Chittagong',
    last_message: 'Thanks for the quick reply.',
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unread_count: 0,
    status: 'closed',
    is_ai_mode: false,
    messages: [
      { id: 'm-7', conversation_id: 'conv-3', sender_type: 'customer', message_type: 'text', content: 'What is the price?', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { id: 'm-8', conversation_id: 'conv-3', sender_type: 'agent', message_type: 'text', content: 'The price is 1,200 BDT.', created_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() },
      { id: 'm-9', conversation_id: 'conv-3', sender_type: 'customer', message_type: 'text', content: 'Thanks for the quick reply.', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ]
  }
];

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  loading: false,
  filterPlatform: 'all',
  filterStatus: 'open',

  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  
  setFilterPlatform: (platform) => set({ filterPlatform: platform }),
  
  setFilterStatus: (status) => set({ filterStatus: status }),

  sendMessage: (conversationId, content, senderType = 'agent') => {
    set((state) => {
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          const newMsg: Message = {
            id: `msg-${Date.now()}`,
            conversation_id: conversationId,
            sender_type: senderType,
            message_type: 'text',
            content,
            created_at: new Date().toISOString(),
          };
          return {
            ...conv,
            last_message: content,
            last_message_at: newMsg.created_at,
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      });
      return { conversations: updatedConversations };
    });
  },

  toggleAiMode: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => 
        conv.id === conversationId ? { ...conv, is_ai_mode: !conv.is_ai_mode } : conv
      )
    }));
  },

  updateDeliveryStatus: (conversationId, status) => {
    // Optional placeholder metadata update
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            last_message: `System: Delivery status updated to ${status}`,
            last_message_at: new Date().toISOString(),
            messages: [
              ...conv.messages,
              {
                id: `system-${Date.now()}`,
                conversation_id: conversationId,
                sender_type: 'system',
                message_type: 'text',
                content: `Delivery status updated to: ${status}`,
                created_at: new Date().toISOString()
              }
            ]
          };
        }
        return conv;
      })
    }));
  },

  loadMockData: () => {
    if (get().conversations.length === 0) {
      set({ conversations: mockConversations, selectedConversationId: 'conv-1' });
    }
  }
}));
