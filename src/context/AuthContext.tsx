import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { queryClient } from '@/lib/queryClient';
import { signInWithGoogle } from '@/lib/googleAuth';
import { cloudConfigured, supabase } from '@/lib/supabase';
interface AuthContextValue {
  session: Session | null;
  localMode: boolean;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);
  useEffect(() => {
    if (!cloudConfigured) return undefined;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) queryClient.clear(); // não vazar dados entre contas
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      localMode: !cloudConfigured,
      user: session?.user ?? null,
      loading,
      signInWithGoogle,
      signOut: async () => {
        if (!cloudConfigured) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return context;
}
