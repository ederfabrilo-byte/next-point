import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

type Role = 'player' | 'teacher' | null;

/** Identidade pública, usada nos textos de notificação. */
interface Profile {
  name: string | null;
  username: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role;
  isAdmin: boolean;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: Role) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  isAdmin: false,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ session: null, user: null, role: null, isAdmin: false, profile: null, isLoading: false }),
}));
