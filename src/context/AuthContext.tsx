import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../infrastructure/supabase/client';

interface WalletData {
  demo_balance: number;
  fuel_balance: number;
  bonus_balance: number;
  is_demo_mode: boolean;
  user_id: string;
}

interface ProfileData {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  is_admin: boolean;
  dream_streak: number;
  total_wagered: number;
  total_won: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  wallet: WalletData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string, referralCode?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        (async () => {
          await loadUserData(session.user.id);
        })();
      } else {
        setProfile(null);
        setWallet(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      const [profileResult, walletResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('fuel_wallets').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.error) {
        console.error('Profile load error:', profileResult.error);
      }

      if (!profileResult.data) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: userId, username: `user_${userId.slice(0, 6)}`, display_name: `User ${userId.slice(0, 4)}` })
          .select()
          .maybeSingle();
        if (newProfile) setProfile(newProfile as unknown as ProfileData);
      } else {
        setProfile(profileResult.data as unknown as ProfileData);
      }

      if (!walletResult.data) {
        const { data: newWallet } = await supabase
          .from('fuel_wallets')
          .insert({ user_id: userId, demo_balance: 10000, fuel_balance: 0, is_demo_mode: true })
          .select()
          .maybeSingle();
        if (newWallet) setWallet(newWallet as unknown as WalletData);
      } else {
        setWallet(walletResult.data as unknown as WalletData);
      }
    } catch (err) {
      console.error('loadUserData error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshWallet() {
    if (!user) return;
    const { data } = await supabase.from('fuel_wallets').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setWallet(data as unknown as WalletData);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, username: string, referralCode?: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'No user returned' };

    try {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: username,
      });

      await supabase.from('fuel_wallets').insert({
        user_id: data.user.id,
        demo_balance: 10000,
        fuel_balance: 0,
        is_demo_mode: true,
      });

      if (referralCode) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', referralCode)
          .maybeSingle();

        if (referrer) {
          const { data: existingRef } = await supabase
            .from('viral_referrals')
            .select('chain_level')
            .eq('referrer_id', referrer.id)
            .order('chain_level', { ascending: false })
            .limit(1)
            .maybeSingle();

          const chainLevel = existingRef ? existingRef.chain_level + 1 : 1;

          await supabase.from('viral_referrals').insert({
            referrer_id: referrer.id,
            referred_id: data.user.id,
            referral_code: referralCode,
            chain_level: Math.min(chainLevel, 12),
            total_earned: 0,
          });
        }
      }
    } catch (err) {
      console.error('Signup data insert error:', err);
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, wallet, loading, signIn, signUp, signOut, refreshWallet }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
