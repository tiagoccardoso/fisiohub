'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
type AppUser = { id: string; email: string; full_name: string | null; role: string; avatar_url?: string | null; crefito?: string | null; specialty?: string | null; university?: string | null; semester?: number | null; created_at?: string; updated_at?: string };
type Session = { user: AppUser };

type AuthActionResult = { error: Error | null };

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, metadata?: Partial<AppUser> & { passwordConfirmation?: string }) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

    const signIn = async (email: string, password: string): Promise<AuthActionResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoading(false);
        return { error: new Error(payload?.error ?? 'Falha no login.') };
      }
      const apiUser = payload.user as AppUser;
      const nextUser: AppUser = { ...apiUser, full_name: apiUser.full_name ?? null };
      setUser(nextUser);
      setSession({ user: nextUser });
      setLoading(false);
      return { error: null };
    } catch {
      setLoading(false);
      return { error: new Error('Falha no login.') };
    }
  };

  const signUp = async (email: string, password: string, metadata?: Partial<AppUser> & { passwordConfirmation?: string }): Promise<AuthActionResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          passwordConfirmation: metadata?.passwordConfirmation,
          fullName: metadata?.full_name,
          role: metadata?.role ?? 'admin',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setLoading(false);
      if (!response.ok) {
        return { error: new Error(payload?.error ?? 'Não foi possível cadastrar o usuário. Verifique os dados informados.') };
      }
      return { error: null };
    } catch {
      setLoading(false);
      return { error: new Error('Não foi possível cadastrar o usuário. Verifique os dados informados.') };
    }
  };

  const resetPassword = async (_email: string): Promise<AuthActionResult> => ({ error: new Error('Recuperação de senha indisponível.') });

  const signOut = async (): Promise<AuthActionResult> => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSession(null);
    return { error: null };
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.authenticated && payload.user) {
          const u: AppUser = { ...payload.user, full_name: payload.user.full_name ?? null };
          setUser(u);
          setSession({ user: u });
        } else {
          setUser(null);
          setSession(null);
        }
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
