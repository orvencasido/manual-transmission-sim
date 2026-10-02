/**
 * Supabase Database Types
 * Manual Driving Trainer
 * Generated from live schema via Supabase CLI
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      driving_sessions: {
        Row: {
          created_at: string;
          distance_meters: number;
          duration_seconds: number;
          id: string;
          max_speed_kmh: number;
          smooth_starts: number;
          stall_count: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          distance_meters?: number;
          duration_seconds?: number;
          id?: string;
          max_speed_kmh?: number;
          smooth_starts?: number;
          stall_count?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          distance_meters?: number;
          duration_seconds?: number;
          id?: string;
          max_speed_kmh?: number;
          smooth_starts?: number;
          stall_count?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          best_time_seconds: number;
          completed: boolean;
          id: string;
          lesson_id: number;
          max_rollback_meters: number;
          smoothness_score: number;
          stalls: number;
          stars: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          best_time_seconds?: number;
          completed?: boolean;
          id?: string;
          lesson_id: number;
          max_rollback_meters?: number;
          smoothness_score?: number;
          stalls?: number;
          stars?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          best_time_seconds?: number;
          completed?: boolean;
          id?: string;
          lesson_id?: number;
          max_rollback_meters?: number;
          smoothness_score?: number;
          stalls?: number;
          stars?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          preferences: Json | null;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          preferences?: Json | null;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          preferences?: Json | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

// Domain Convenience Types
export type DrivingSessionRow = Tables<'driving_sessions'>;
export type DrivingSessionInsert = TablesInsert<'driving_sessions'>;
export type LessonProgressRow = Tables<'lesson_progress'>;
export type LessonProgressInsert = TablesInsert<'lesson_progress'>;
export type ProfileRow = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
