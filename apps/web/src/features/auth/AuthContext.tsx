import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // For demo/dev mode when Supabase credentials are empty or in testing
  isDemoUser: boolean;
  setDemoUser: (isDemo: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: {},
  user_metadata: {
    full_name: 'Alex Rivera',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    // Check if demo user was active
    const savedDemo = localStorage.getItem('askmynotes_demo_user') === 'true';
    if (savedDemo) {
      setUser(DEMO_USER);
      setIsDemoUser(true);
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      // Fallback to demo mode if no supabase credentials provided
      setUser(DEMO_USER);
      setIsDemoUser(true);
      localStorage.setItem('askmynotes_demo_user', 'true');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });

    if (error) {
      console.warn('OAuth redirect failed, enabling interactive dev session:', error.message);
      setUser(DEMO_USER);
      setIsDemoUser(true);
      localStorage.setItem('askmynotes_demo_user', 'true');
    }
  };

  const signOut = async () => {
    if (isDemoUser) {
      setUser(null);
      setIsDemoUser(false);
      localStorage.removeItem('askmynotes_demo_user');
      return;
    }

    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signInWithGoogle,
        signOut,
        isDemoUser,
        setDemoUser: (val) => {
          setIsDemoUser(val);
          if (val) {
            setUser(DEMO_USER);
            localStorage.setItem('askmynotes_demo_user', 'true');
          } else {
            setUser(null);
            localStorage.removeItem('askmynotes_demo_user');
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
