import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useLessonProgressStore, LessonProgress } from './lessonProgressStore';

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  createdAt: string;
  preferences: Record<string, unknown>;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initAuth: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  mergeGuestProgress: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

async function fetchProfileData(userId: string, userEmail?: string, metaUsername?: string): Promise<UserProfile> {
  const fallbackUsername = metaUsername || (userEmail ? userEmail.split('@')[0] : 'Driver');
  if (!isSupabaseConfigured) {
    return {
      id: userId,
      email: userEmail,
      username: fallbackUsername,
      createdAt: new Date().toISOString(),
      preferences: {},
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return {
        id: userId,
        email: userEmail,
        username: fallbackUsername,
        createdAt: new Date().toISOString(),
        preferences: {},
      };
    }

    return {
      id: data.id,
      email: userEmail,
      username: data.username || fallbackUsername,
      createdAt: data.created_at,
      preferences: (data.preferences as Record<string, unknown>) || {},
    };
  } catch {
    return {
      id: userId,
      email: userEmail,
      username: fallbackUsername,
      createdAt: new Date().toISOString(),
      preferences: {},
    };
  }
}

function syncAuthCookie(session: Session | null) {
  if (typeof document !== 'undefined') {
    if (session?.access_token) {
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax`;
    }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        syncAuthCookie(null);
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const session = data.session;
      syncAuthCookie(session);
      const user = session.user;
      const profile = await fetchProfileData(
        user.id,
        user.email,
        user.user_metadata?.username
      );

      set({
        user,
        session,
        profile,
        isAuthenticated: true,
        isLoading: false,
      });

      // Automatically sync and merge any local guest progress
      get().mergeGuestProgress().catch(() => {});
    } catch (err) {
      console.warn('Supabase initAuth exception:', err);
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await fetchProfileData(
      user.id,
      user.email,
      user.user_metadata?.username
    );
    set({ profile });
  },

  signUp: async (email, password, username) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase is not configured. Please check environment variables.'),
      };
    }

    try {
      set({ isLoading: true });
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        set({ isLoading: false });
        return { error: new Error(error.message) };
      }

      const needsConfirmation = !data.session;

      if (data.session && data.user) {
        const profile = await fetchProfileData(
          data.user.id,
          data.user.email,
          username
        );
        set({
          user: data.user,
          session: data.session,
          profile,
          isAuthenticated: true,
          isLoading: false,
        });
        get().mergeGuestProgress().catch(() => {});
      } else {
        set({ isLoading: false });
      }

      return { error: null, needsConfirmation };
    } catch (err) {
      set({ isLoading: false });
      return {
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase is not configured. Please check environment variables.'),
      };
    }

    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { error: new Error(error.message) };
      }

      if (data.session && data.user) {
        const profile = await fetchProfileData(
          data.user.id,
          data.user.email,
          data.user.user_metadata?.username
        );
        set({
          user: data.user,
          session: data.session,
          profile,
          isAuthenticated: true,
          isLoading: false,
        });
        get().mergeGuestProgress().catch(() => {});
      }

      return { error: null };
    } catch (err) {
      set({ isLoading: false });
      return {
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    } finally {
      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  mergeGuestProgress: async () => {
    if (typeof window === 'undefined' || !isSupabaseConfigured) return;
    const { user } = get();
    if (!user) return;

    try {
      const LOCAL_KEY = 'manual_sim_lesson_progress';
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) {
        // No local records, just sync cloud progress into store
        await useLessonProgressStore.getState().syncFromSupabase();
        return;
      }

      let localRecords: Record<number, LessonProgress> = {};
      try {
        localRecords = JSON.parse(raw);
      } catch {
        return;
      }

      const lessonIds = Object.keys(localRecords).map((id) => parseInt(id, 10));
      if (lessonIds.length === 0) {
        await useLessonProgressStore.getState().syncFromSupabase();
        return;
      }

      // Fetch cloud records for user
      const { data: cloudRows } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id);

      const cloudMap = new Map((cloudRows || []).map((r) => [r.lesson_id, r]));

      for (const [idStr, local] of Object.entries(localRecords)) {
        const lessonId = parseInt(idStr, 10);
        const cloud = cloudMap.get(lessonId);

        const mergedStars = Math.max(local.stars || 0, cloud?.stars ?? 0);
        const mergedSmoothness = Math.max(
          local.smoothnessScore || 0,
          cloud?.smoothness_score ?? 0
        );
        const mergedStalls = cloud
          ? Math.min(local.stalls ?? 0, cloud.stalls ?? 0)
          : local.stalls ?? 0;
        const mergedTime = cloud
          ? Math.min(local.bestTimeSeconds || 999, cloud.best_time_seconds || 999)
          : local.bestTimeSeconds || 0;
        const mergedRollback = cloud
          ? Math.min(local.maxRollbackMeters || 0, cloud.max_rollback_meters || 0)
          : local.maxRollbackMeters || 0;

        await supabase.from('lesson_progress').upsert(
          {
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            stars: mergedStars,
            smoothness_score: mergedSmoothness,
            stalls: mergedStalls,
            best_time_seconds: Math.round(mergedTime * 10) / 10,
            max_rollback_meters: Math.round(mergedRollback * 100) / 100,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' }
        );
      }

      // Pull combined records into store
      await useLessonProgressStore.getState().syncFromSupabase();
    } catch (err) {
      console.warn('Guest progress merge skipped:', err);
    }
  },
}));

// Client-side initialization and auth state listener
if (typeof window !== 'undefined' && isSupabaseConfigured) {
  // Initial auth resolution
  useAuthStore.getState().initAuth().catch(() => {});

  // Real-time auth subscription
  supabase.auth.onAuthStateChange(async (event, session) => {
    syncAuthCookie(session);

    if (session && session.user) {
      const profile = await fetchProfileData(
        session.user.id,
        session.user.email,
        session.user.user_metadata?.username
      );
      useAuthStore.setState({
        user: session.user,
        session,
        profile,
        isAuthenticated: true,
        isLoading: false,
      });

      if (event === 'SIGNED_IN') {
        useAuthStore.getState().mergeGuestProgress().catch(() => {});
      }
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.setState({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  });
}
