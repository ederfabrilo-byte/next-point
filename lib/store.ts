import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

type Role = 'player' | 'teacher' | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ session: null, user: null, role: null, isLoading: false }),
}));
