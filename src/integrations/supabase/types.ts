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
      action_snoozes: {
        Row: {
          action_signature: string
          created_at: string
          id: string
          snoozed_until: string
          user_id: string
        }
        Insert: {
          action_signature: string
          created_at?: string
          id?: string
          snoozed_until: string
          user_id: string
        }
        Update: {
          action_signature?: string
          created_at?: string
          id?: string
          snoozed_until?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feed_jobs: {
        Row: {
          company: string
          created_at: string
          description: string | null
          id: string
          location: string
          salary: string | null
          skills: string[]
          title: string
          type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          salary?: string | null
          skills?: string[]
          title: string
          type?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          salary?: string | null
          skills?: string[]
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          called_at: string
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          called_at?: string
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          called_at?: string
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_activities: {
        Row: {
          activity_date: string
          activity_type: string
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_type?: string
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_campaigns: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_connections: {
        Row: {
          connection_type: string
          contact_id_1: string
          contact_id_2: string
          created_at: string
          id: string
          notes: string | null
          relationship_label: string | null
          user_id: string
        }
        Insert: {
          connection_type?: string
          contact_id_1: string
          contact_id_2: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_label?: string | null
          user_id: string
        }
        Update: {
          connection_type?: string
          contact_id_1?: string
          contact_id_2?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_connections_contact_id_1_fkey"
            columns: ["contact_id_1"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_connections_contact_id_2_fkey"
            columns: ["contact_id_2"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string
          conversation_log: string | null
          created_at: string
          email: string | null
          follow_up_date: string | null
          id: string
          last_contacted_at: string | null
          linkedin: string | null
          name: string
          network_role: string | null
          notes: string | null
          phone: string | null
          relationship_warmth: string | null
          role: string
          user_id: string
        }
        Insert: {
          company: string
          conversation_log?: string | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          linkedin?: string | null
          name: string
          network_role?: string | null
          notes?: string | null
          phone?: string | null
          relationship_warmth?: string | null
          role?: string
          user_id: string
        }
        Update: {
          company?: string
          conversation_log?: string | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          linkedin?: string | null
          name?: string
          network_role?: string | null
          notes?: string | null
          phone?: string | null
          relationship_warmth?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          company: string
          content: string
          created_at: string
          id: string
          job_id: string | null
          job_title: string
          user_id: string
        }
        Insert: {
          company: string
          content: string
          created_at?: string
          id?: string
          job_id?: string | null
          job_title: string
          user_id: string
        }
        Update: {
          company?: string
          content?: string
          created_at?: string
          id?: string
          job_id?: string | null
          job_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_jobs: {
        Row: {
          company: string
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          created_at: string
          date: string
          google_calendar_event_id: string | null
          id: string
          job_id: string
          notes: string | null
          status: string
          time: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          google_calendar_event_id?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: string
          time?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          google_calendar_event_id?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: string
          time?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_activities: {
        Row: {
          activity_date: string
          activity_type: string
          contact_id: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_boards: {
        Row: {
          category: string
          created_at: string
          gate_checked_at: string | null
          id: string
          is_active: boolean
          is_gated: boolean
          name: string
          notes: string | null
          public_url: string | null
          target_company_id: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          gate_checked_at?: string | null
          id?: string
          is_active?: boolean
          is_gated?: boolean
          name: string
          notes?: string | null
          public_url?: string | null
          target_company_id?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          gate_checked_at?: string | null
          id?: string
          is_active?: boolean
          is_gated?: boolean
          name?: string
          notes?: string | null
          public_url?: string | null
          target_company_id?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_boards_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "target_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_search_history: {
        Row: {
          created_at: string
          id: string
          result_count: number
          results: Json
          search_params: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_count?: number
          results?: Json
          search_params?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_count?: number
          results?: Json
          search_params?: Json
          user_id?: string
        }
        Relationships: []
      }
      job_search_profile: {
        Row: {
          certifications: string[]
          company_sizes: string[]
          compensation_notes: string | null
          created_at: string
          culture_preferences: string[]
          dealbreakers: string[]
          id: string
          industries: string[]
          locations: string[]
          min_base_salary: number | null
          must_haves: string[]
          nice_to_haves: string[]
          remote_preference: string
          resume_text: string | null
          skills: string[]
          soft_skills: string[]
          spoken_languages: string[]
          start_availability: string
          summary: string | null
          target_roles: string[]
          technical_skills: string[]
          tools_platforms: string[]
          travel_willingness: string
          updated_at: string
          user_id: string
          work_style: string
          years_experience: number | null
        }
        Insert: {
          certifications?: string[]
          company_sizes?: string[]
          compensation_notes?: string | null
          created_at?: string
          culture_preferences?: string[]
          dealbreakers?: string[]
          id?: string
          industries?: string[]
          locations?: string[]
          min_base_salary?: number | null
          must_haves?: string[]
          nice_to_haves?: string[]
          remote_preference?: string
          resume_text?: string | null
          skills?: string[]
          soft_skills?: string[]
          spoken_languages?: string[]
          start_availability?: string
          summary?: string | null
          target_roles?: string[]
          technical_skills?: string[]
          tools_platforms?: string[]
          travel_willingness?: string
          updated_at?: string
          user_id: string
          work_style?: string
          years_experience?: number | null
        }
        Update: {
          certifications?: string[]
          company_sizes?: string[]
          compensation_notes?: string | null
          created_at?: string
          culture_preferences?: string[]
          dealbreakers?: string[]
          id?: string
          industries?: string[]
          locations?: string[]
          min_base_salary?: number | null
          must_haves?: string[]
          nice_to_haves?: string[]
          remote_preference?: string
          resume_text?: string | null
          skills?: string[]
          soft_skills?: string[]
          spoken_languages?: string[]
          start_availability?: string
          summary?: string | null
          target_roles?: string[]
          technical_skills?: string[]
          tools_platforms?: string[]
          travel_willingness?: string
          updated_at?: string
          user_id?: string
          work_style?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      job_skills_snapshots: {
        Row: {
          captured_at: string
          id: string
          job_id: string | null
          skills: string[]
          source: string | null
          user_id: string
        }
        Insert: {
          captured_at?: string
          id?: string
          job_id?: string | null
          skills?: string[]
          source?: string | null
          user_id: string
        }
        Update: {
          captured_at?: string
          id?: string
          job_id?: string | null
          skills?: string[]
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applied_date: string | null
          company: string
          contact_id: string | null
          created_at: string
          description: string | null
          fit_score: number | null
          id: string
          location: string
          notes: string | null
          poster_email: string | null
          poster_name: string | null
          poster_phone: string | null
          poster_role: string | null
          salary: string | null
          source: string
          status: string
          status_updated_at: string | null
          title: string
          type: string
          urgency: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          applied_date?: string | null
          company: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          fit_score?: number | null
          id?: string
          location?: string
          notes?: string | null
          poster_email?: string | null
          poster_name?: string | null
          poster_phone?: string | null
          poster_role?: string | null
          salary?: string | null
          source?: string
          status?: string
          status_updated_at?: string | null
          title: string
          type?: string
          urgency?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          applied_date?: string | null
          company?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          fit_score?: number | null
          id?: string
          location?: string
          notes?: string | null
          poster_email?: string | null
          poster_name?: string | null
          poster_phone?: string | null
          poster_role?: string | null
          salary?: string | null
          source?: string
          status?: string
          status_updated_at?: string | null
          title?: string
          type?: string
          urgency?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_requests: {
        Row: {
          contact_id: string
          created_at: string
          due_date: string | null
          id: string
          job_id: string | null
          notes: string | null
          received_at: string | null
          requested_at: string
          status: string
          target_company_id: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          received_at?: string | null
          requested_at: string
          status?: string
          target_company_id?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          received_at?: string | null
          requested_at?: string
          status?: string
          target_company_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      target_companies: {
        Row: {
          careers_url: string | null
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notes: string | null
          priority: string
          size: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          careers_url?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          priority?: string
          size?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          careers_url?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          priority?: string
          size?: string | null
          status?: string
          user_id?: string
          website?: string | null
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
