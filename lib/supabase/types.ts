/**
 * Supabase Database Types
 * Manual Driving Trainer
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          username: string | null;
          preferences: Record<string, unknown> | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          username?: string | null;
          preferences?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          username?: string | null;
          preferences?: Record<string, unknown> | null;
        };
      };
      driving_sessions: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          duration_seconds: number;
          stall_count: number;
          smooth_starts: number;
          max_speed_kmh: number;
          distance_meters: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          duration_seconds: number;
          stall_count: number;
          smooth_starts: number;
          max_speed_kmh: number;
          distance_meters: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          duration_seconds?: number;
          stall_count?: number;
          smooth_starts?: number;
          max_speed_kmh?: number;
          distance_meters?: number;
        };
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          score: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed?: boolean;
          score?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          completed?: boolean;
          score?: number | null;
          updated_at?: string;
        };
      };
    };
  };
}
