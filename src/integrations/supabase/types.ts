export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audience_questions: {
        Row: {
          created_at: string
          device_id: string
          id: string
          is_answered: boolean
          question: string
          session_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          is_answered?: boolean
          question: string
          session_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          is_answered?: boolean
          question?: string
          session_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_recordings: {
        Row: {
          duration_seconds: number | null
          file_path: string
          id: string
          recorded_at: string
          session_id: string
          speaker_name: string
        }
        Insert: {
          duration_seconds?: number | null
          file_path: string
          id?: string
          recorded_at?: string
          session_id: string
          speaker_name: string
        }
        Update: {
          duration_seconds?: number | null
          file_path?: string
          id?: string
          recorded_at?: string
          session_id?: string
          speaker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          contact_person: string
          created_at: string
          email: string
          id: string
          institution_name: string
          num_auditoriums: string | null
          phone: string | null
        }
        Insert: {
          contact_person: string
          created_at?: string
          email: string
          id?: string
          institution_name: string
          num_auditoriums?: string | null
          phone?: string | null
        }
        Update: {
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          institution_name?: string
          num_auditoriums?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          device_id: string
          id: string
          option_index: number
          poll_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          option_index: number
          poll_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          option_index?: number
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "session_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      question_upvotes: {
        Row: {
          created_at: string
          device_id: string
          id: string
          question_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          question_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "audience_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_polls: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          is_active: boolean
          is_multi_select: boolean
          options: Json
          question: string
          session_id: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_multi_select?: boolean
          options?: Json
          question: string
          session_id: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_multi_select?: boolean
          options?: Json
          question?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          admin_code: string
          created_at: string
          current_speaker_id: string | null
          id: string
          is_active: boolean
          speaker_started_at: string | null
          speaking_time_seconds: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_code?: string
          created_at?: string
          current_speaker_id?: string | null
          id?: string
          is_active?: boolean
          speaker_started_at?: string | null
          speaking_time_seconds?: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_code?: string
          created_at?: string
          current_speaker_id?: string | null
          id?: string
          is_active?: boolean
          speaker_started_at?: string | null
          speaking_time_seconds?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      speaker_queue: {
        Row: {
          device_id: string
          finished_speaking_at: string | null
          id: string
          is_moderator: boolean
          position: number
          requested_at: string
          session_id: string
          started_speaking_at: string | null
          status: string
          user_email: string | null
          user_name: string
        }
        Insert: {
          device_id: string
          finished_speaking_at?: string | null
          id?: string
          is_moderator?: boolean
          position: number
          requested_at?: string
          session_id: string
          started_speaking_at?: string | null
          status?: string
          user_email?: string | null
          user_name: string
        }
        Update: {
          device_id?: string
          finished_speaking_at?: string | null
          id?: string
          is_moderator?: boolean
          position?: number
          requested_at?: string
          session_id?: string
          started_speaking_at?: string | null
          status?: string
          user_email?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          device_id: string
          id: string
          is_read: boolean
          message: string
          session_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          is_read?: boolean
          message: string
          session_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          is_read?: boolean
          message?: string
          session_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
