/**
 * Asynchronous Supabase Query Helpers & Persistence Handlers
 * Manual Driving Trainer
 *
 * Strict Operational Boundary:
 * Database calls must NEVER be executed inside the 120Hz physics loop or animation frames.
 * All functions fail gracefully when offline or when credentials are not configured.
 */

import { supabase, isSupabaseConfigured } from './client';
import {
  DrivingSessionInsert,
  DrivingSessionRow,
  LessonProgressInsert,
  LessonProgressRow,
} from './types';

const ANON_USER_STORAGE_KEY = 'manual_sim_anon_user_id';

/**
 * Retrieves or generates a consistent anonymous client UUID for guests.
 * Ensures guest progress and sessions remain distinct across users.
 */
export function getAnonymousUserId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000000';
  }

  try {
    let id = localStorage.getItem(ANON_USER_STORAGE_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
      localStorage.setItem(ANON_USER_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '00000000-0000-0000-0000-000000000000';
  }
}

export interface SaveSessionInput {
  userId?: string | null;
  durationSeconds: number;
  stallCount: number;
  smoothStarts: number;
  maxSpeedKmh: number;
  distanceMeters: number;
}

export interface SaveLessonProgressInput {
  userId?: string | null;
  lessonId: number;
  completed?: boolean;
  stars: number;
  smoothnessScore: number;
  stalls: number;
  bestTimeSeconds: number;
  maxRollbackMeters: number;
}

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Save a completed or reset driving session summary to Supabase.
 * Triggered on user action (e.g. session reset, pause menu save, navigate away).
 */
export async function saveDrivingSession(
  sessionData: SaveSessionInput
): Promise<QueryResult<DrivingSessionRow>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  try {
    const userId = sessionData.userId ?? getAnonymousUserId();

    const insertPayload: DrivingSessionInsert = {
      user_id: userId,
      duration_seconds: Math.max(0, sessionData.durationSeconds),
      stall_count: Math.max(0, sessionData.stallCount),
      smooth_starts: Math.max(0, sessionData.smoothStarts),
      max_speed_kmh: Math.max(0, Math.round(sessionData.maxSpeedKmh * 10) / 10),
      distance_meters: Math.max(0, Math.round(sessionData.distanceMeters * 10) / 10),
    };

    const { data, error } = await supabase
      .from('driving_sessions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase saveDrivingSession error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.warn('Supabase saveDrivingSession exception:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Backward-compatible alias for saveDrivingSession
 */
export const saveSessionSummary = saveDrivingSession;

/**
 * Save or update lesson progress in Supabase.
 * Upserts based on (user_id, lesson_id).
 */
export async function saveLessonProgress(
  progressData: SaveLessonProgressInput
): Promise<QueryResult<LessonProgressRow>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  try {
    const userId = progressData.userId ?? getAnonymousUserId();

    const upsertPayload: LessonProgressInsert = {
      user_id: userId,
      lesson_id: progressData.lessonId,
      completed: progressData.completed ?? true,
      stars: Math.max(0, Math.min(3, progressData.stars)),
      smoothness_score: Math.max(0, Math.min(100, Math.round(progressData.smoothnessScore))),
      stalls: Math.max(0, progressData.stalls),
      best_time_seconds: Math.max(0, Math.round(progressData.bestTimeSeconds * 10) / 10),
      max_rollback_meters: Math.max(0, Math.round(progressData.maxRollbackMeters * 100) / 100),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert(upsertPayload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase saveLessonProgress error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.warn('Supabase saveLessonProgress exception:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch lesson progress records for a user from Supabase.
 */
export async function fetchLessonProgress(
  userId?: string
): Promise<QueryResult<LessonProgressRow[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }

  try {
    const targetUserId = userId ?? getAnonymousUserId();

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', targetUserId)
      .order('lesson_id', { ascending: true });

    if (error) {
      console.warn('Supabase fetchLessonProgress error:', error.message);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.warn('Supabase fetchLessonProgress exception:', err);
    return {
      data: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch recent driving sessions from Supabase.
 */
export async function fetchRecentSessions(
  limit: number = 10,
  userId?: string
): Promise<QueryResult<DrivingSessionRow[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }

  try {
    const targetUserId = userId ?? getAnonymousUserId();

    let query = supabase
      .from('driving_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetchRecentSessions error:', error.message);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.warn('Supabase fetchRecentSessions exception:', err);
    return {
      data: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export interface DriverStatsSummary {
  totalSessions: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalStalls: number;
  totalSmoothStarts: number;
  maxSpeedKmh: number;
}

/**
 * Fetch aggregated statistics across user's sessions.
 */
export async function fetchDriverSummary(
  userId?: string
): Promise<QueryResult<DriverStatsSummary>> {
  const fallback: DriverStatsSummary = {
    totalSessions: 0,
    totalDurationSeconds: 0,
    totalDistanceMeters: 0,
    totalStalls: 0,
    totalSmoothStarts: 0,
    maxSpeedKmh: 0,
  };

  if (!isSupabaseConfigured) {
    return { data: fallback, error: null };
  }

  try {
    const targetUserId = userId ?? getAnonymousUserId();

    const { data, error } = await supabase
      .from('driving_sessions')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) {
      console.warn('Supabase fetchDriverSummary error:', error.message);
      return { data: fallback, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { data: fallback, error: null };
    }

    const summary = data.reduce(
      (acc, s) => ({
        totalSessions: acc.totalSessions + 1,
        totalDurationSeconds: acc.totalDurationSeconds + (s.duration_seconds || 0),
        totalDistanceMeters: acc.totalDistanceMeters + (s.distance_meters || 0),
        totalStalls: acc.totalStalls + (s.stall_count || 0),
        totalSmoothStarts: acc.totalSmoothStarts + (s.smooth_starts || 0),
        maxSpeedKmh: Math.max(acc.maxSpeedKmh, s.max_speed_kmh || 0),
      }),
      fallback
    );

    return { data: summary, error: null };
  } catch (err) {
    console.warn('Supabase fetchDriverSummary exception:', err);
    return {
      data: fallback,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
