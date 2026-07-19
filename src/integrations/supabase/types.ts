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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_health: {
        Row: {
          issues: Json | null
          raw: Json | null
          score: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          issues?: Json | null
          raw?: Json | null
          score?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          issues?: Json | null
          raw?: Json | null
          score?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      account_insights_30d: {
        Row: {
          comments_count: number | null
          engaged: number | null
          engagement_rate: number | null
          interactions: number | null
          likes: number | null
          raw: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          comments_count?: number | null
          engaged?: number | null
          engagement_rate?: number | null
          interactions?: number | null
          likes?: number | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          comments_count?: number | null
          engaged?: number | null
          engagement_rate?: number | null
          interactions?: number | null
          likes?: number | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      account_snapshot: {
        Row: {
          account_id: string | null
          biography: string | null
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          media_count: number | null
          profile_picture_url: string | null
          raw: Json | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          account_id?: string | null
          biography?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          media_count?: number | null
          profile_picture_url?: string | null
          raw?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          account_id?: string | null
          biography?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          media_count?: number | null
          profile_picture_url?: string | null
          raw?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      best_time: {
        Row: {
          day_of_week: number
          engagement: number | null
          hour: number
          posts_count: number | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          day_of_week: number
          engagement?: number | null
          hour: number
          posts_count?: number | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          day_of_week?: number
          engagement?: number | null
          hour?: number
          posts_count?: number | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          author_username: string | null
          created_at: string | null
          fetched_at: string
          id: string
          is_reply: boolean | null
          like_count: number | null
          parent_comment_id: string | null
          post_id: string | null
          raw: Json | null
          text: string | null
          user_id: string
        }
        Insert: {
          author_id?: string | null
          author_username?: string | null
          created_at?: string | null
          fetched_at?: string
          id: string
          is_reply?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string | null
          raw?: Json | null
          text?: string | null
          user_id: string
        }
        Update: {
          author_id?: string | null
          author_username?: string | null
          created_at?: string | null
          fetched_at?: string
          id?: string
          is_reply?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string | null
          raw?: Json | null
          text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_decay: {
        Row: {
          bucket_label: string | null
          bucket_order: number
          cumulative_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket_label?: string | null
          bucket_order: number
          cumulative_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket_label?: string | null
          bucket_order?: number
          cumulative_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          last_message_at: string | null
          message_count: number | null
          participant_id: string | null
          participant_username: string | null
          raw: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id: string
          last_message_at?: string | null
          message_count?: number | null
          participant_id?: string | null
          participant_username?: string | null
          raw?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          participant_id?: string | null
          participant_username?: string | null
          raw?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          comments_count: number | null
          date: string
          engaged: number | null
          interactions: number | null
          likes: number | null
          posts_count: number | null
          raw: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          comments_count?: number | null
          date: string
          engaged?: number | null
          interactions?: number | null
          likes?: number | null
          posts_count?: number | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          comments_count?: number | null
          date?: string
          engaged?: number | null
          interactions?: number | null
          likes?: number | null
          posts_count?: number | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      demographics_age: {
        Row: {
          bucket: string
          count: number | null
          percentage: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demographics_city: {
        Row: {
          bucket: string
          count: number | null
          percentage: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demographics_country: {
        Row: {
          bucket: string
          count: number | null
          percentage: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demographics_gender: {
        Row: {
          bucket: string
          count: number | null
          percentage: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          count?: number | null
          percentage?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follower_history: {
        Row: {
          date: string
          followers_count: number | null
          following_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          followers_count?: number | null
          following_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          date?: string
          followers_count?: number | null
          following_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idea_discards: {
        Row: {
          angle: string | null
          discarded_at: string
          id: string
          idea_id: string | null
          reason_quick: string | null
          reason_text: string | null
          source_bucket: string | null
          user_id: string
        }
        Insert: {
          angle?: string | null
          discarded_at?: string
          id?: string
          idea_id?: string | null
          reason_quick?: string | null
          reason_text?: string | null
          source_bucket?: string | null
          user_id: string
        }
        Update: {
          angle?: string | null
          discarded_at?: string
          id?: string
          idea_id?: string | null
          reason_quick?: string | null
          reason_text?: string | null
          source_bucket?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_discards_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          angle: string | null
          basis_comment_ids: Json | null
          basis_message_ids: Json | null
          basis_post_ids: Json | null
          batch_id: string | null
          discarded: boolean
          evidence_quotes: Json | null
          format: string | null
          generated_at: string
          id: string
          rationale: string | null
          source_bucket: string
          suggested_angle: string | null
          user_id: string
          why_good_idea: string | null
        }
        Insert: {
          angle?: string | null
          basis_comment_ids?: Json | null
          basis_message_ids?: Json | null
          basis_post_ids?: Json | null
          batch_id?: string | null
          discarded?: boolean
          evidence_quotes?: Json | null
          format?: string | null
          generated_at?: string
          id?: string
          rationale?: string | null
          source_bucket?: string
          suggested_angle?: string | null
          user_id: string
          why_good_idea?: string | null
        }
        Update: {
          angle?: string | null
          basis_comment_ids?: Json | null
          basis_message_ids?: Json | null
          basis_post_ids?: Json | null
          batch_id?: string | null
          discarded?: boolean
          evidence_quotes?: Json | null
          format?: string | null
          generated_at?: string
          id?: string
          rationale?: string | null
          source_bucket?: string
          suggested_angle?: string | null
          user_id?: string
          why_good_idea?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          fetched_at: string
          id: string
          is_from_me: boolean | null
          raw: Json | null
          sender_id: string | null
          sender_username: string | null
          text: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          fetched_at?: string
          id: string
          is_from_me?: boolean | null
          raw?: Json | null
          sender_id?: string | null
          sender_username?: string | null
          text?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          fetched_at?: string
          id?: string
          is_from_me?: boolean | null
          raw?: Json | null
          sender_id?: string | null
          sender_username?: string | null
          text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meta: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json | null
        }
        Relationships: []
      }
      posting_frequency: {
        Row: {
          avg_engagement: number | null
          posts_per_week: number
          updated_at: string
          user_id: string
          weeks_count: number | null
        }
        Insert: {
          avg_engagement?: number | null
          posts_per_week: number
          updated_at?: string
          user_id: string
          weeks_count?: number | null
        }
        Update: {
          avg_engagement?: number | null
          posts_per_week?: number
          updated_at?: string
          user_id?: string
          weeks_count?: number | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          interactions: number | null
          likes: number | null
          media_url: string | null
          permalink: string | null
          post_type: string | null
          published_at: string | null
          raw: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          engagement_rate?: number | null
          id: string
          impressions?: number | null
          interactions?: number | null
          likes?: number | null
          media_url?: string | null
          permalink?: string | null
          post_type?: string | null
          published_at?: string | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          interactions?: number | null
          likes?: number | null
          media_url?: string | null
          permalink?: string | null
          post_type?: string | null
          published_at?: string | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      refresh_log: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string | null
          steps: Json | null
          user_id: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string | null
          steps?: Json | null
          user_id: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string | null
          steps?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          created_at: string
          id: string
          language: string | null
          post_id: string | null
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          post_id?: string | null
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          post_id?: string | null
          text?: string | null
          user_id?: string
        }
        Relationships: []
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
