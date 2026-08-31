import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single source of truth: onAuthStateChange fires INITIAL_SESSION
    // immediately on subscribe, giving us the session without a separate
    // getSession() call — avoids navigator lock contention.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Use setTimeout to defer the profile fetch out of the auth lock
          setTimeout(async () => {
            const prof = await fetchProfile(currentUser.id);
            setProfile(prof);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, role, avatar_url, cpf, whatsapp, promo_emails')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[AuthContext] fetchProfile:', err.message);
      return null;
    }
  }

  async function signUp({ email, password, name, phone, cpf }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, cpf } },
    });
    if (error) throw error;

    // Profile criado pelo trigger handle_new_user (server-side, role = customer).
    // O CPF vem no metadata acima e é gravado pelo trigger; o índice único
    // idx_profiles_cpf_unique garante 1 conta por CPF (migration 008).
    return data;
  }

  /** Pré-checa se o CPF ainda não está em uso, para dar erro limpo no cadastro.
   *  Fail-open: se o RPC não existir/der erro, deixa seguir — o índice único
   *  no banco é o backup que impede duplicata de fato. */
  async function isCpfAvailable(cpf) {
    try {
      const { data, error } = await supabase.rpc('cpf_disponivel', { p_cpf: cpf });
      if (error) return true; // fail-open (ex: migration ainda não aplicada)
      return data !== false;
    } catch {
      return true;
    }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const isAdmin = profile?.role === 'admin';

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    isCpfAvailable,
    refreshProfile: () => user && fetchProfile(user.id).then(setProfile),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
