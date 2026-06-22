import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'manager' | 'agent';
  company_id: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data as Profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ profile: null });
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });
    
    // Get initial session
    let session = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session;
    } catch (err) {
      console.warn('Supabase not connected, using default mock local state initialization.');
    }
    
    if (session) {
      set({ user: session.user });
      await get().fetchProfile(session.user.id);
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession) {
        set({ user: currentSession.user });
        await get().fetchProfile(currentSession.user.id);
      } else {
        set({ user: null, profile: null });
      }
      set({ loading: false });
    });

    set({ initialized: true, loading: false });
  }

}));
