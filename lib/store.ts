import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

type Role = 'player' | 'teacher' | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role;
  isAdmin: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: Role) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  isAdmin: false,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ session: null, user: null, role: null, isAdmin: false, isLoading: false }),
}));
