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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_rep: {
        Row: {
          atm_payout: string | null
          gps_unlocked: boolean
          house_rob_payout: string | null
          launder_rate: string | null
          member_id: string
          nos_unlocked: boolean
          rep_band: string
          rope_unlocked: boolean
          store_capacity: string | null
          tier_label: string
          updated_at: string
          updated_by: string
          usb_unlocked: boolean
        }
        Insert: {
          atm_payout?: string | null
          gps_unlocked?: boolean
          house_rob_payout?: string | null
          launder_rate?: string | null
          member_id: string
          nos_unlocked?: boolean
          rep_band: string
          rope_unlocked?: boolean
          store_capacity?: string | null
          tier_label: string
          updated_at?: string
          updated_by: string
          usb_unlocked?: boolean
        }
        Update: {
          atm_payout?: string | null
          gps_unlocked?: boolean
          house_rob_payout?: string | null
          launder_rate?: string | null
          member_id?: string
          nos_unlocked?: boolean
          rep_band?: string
          rope_unlocked?: boolean
          store_capacity?: string | null
          tier_label?: string
          updated_at?: string
          updated_by?: string
          usb_unlocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "member_rep_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rep_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_rep_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rep_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rep_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_rep_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          crew_rank: string
          discord_avatar_url: string | null
          discord_username: string | null
          id: string
          ingame_name: string | null
          is_active: boolean
        }
        Insert: {
          created_at?: string
          crew_rank?: string
          discord_avatar_url?: string | null
          discord_username?: string | null
          id: string
          ingame_name?: string | null
          is_active?: boolean
        }
        Update: {
          created_at?: string
          crew_rank?: string
          discord_avatar_url?: string | null
          discord_username?: string | null
          id?: string
          ingame_name?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      remit_logs: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          member_id: string
          quantity: number
          remit_type_id: string
          reviewed_by: string | null
          status: string
          submitted_by: string
          week_start: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          quantity?: number
          remit_type_id: string
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          week_start?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          quantity?: number
          remit_type_id?: string
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "remit_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remit_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "remit_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remit_logs_remit_type_id_fkey"
            columns: ["remit_type_id"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["quota_type_id"]
          },
          {
            foreignKeyName: "remit_logs_remit_type_id_fkey"
            columns: ["remit_type_id"]
            isOneToOne: false
            referencedRelation: "remit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remit_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remit_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "remit_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remit_logs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remit_logs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "remit_logs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      remit_types: {
        Row: {
          created_at: string
          id: string
          is_weekly_quota: boolean
          name: string
          quota_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_weekly_quota?: boolean
          name: string
          quota_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_weekly_quota?: boolean
          name?: string
          quota_amount?: number | null
        }
        Relationships: []
      }
      reputation_entries_legacy: {
        Row: {
          created_at: string
          given_by: string
          id: string
          member_id: string
          points: number
          reason: string
        }
        Insert: {
          created_at?: string
          given_by: string
          id?: string
          member_id: string
          points: number
          reason: string
        }
        Update: {
          created_at?: string
          given_by?: string
          id?: string
          member_id?: string
          points?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_entries_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_entries_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reputation_entries_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_weekly_compliance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reputation_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_summary: {
        Row: {
          atm_payout: string | null
          created_at: string | null
          crew_rank: string | null
          discord_avatar_url: string | null
          discord_username: string | null
          gps_unlocked: boolean | null
          house_rob_payout: string | null
          id: string | null
          ingame_name: string | null
          is_active: boolean | null
          launder_rate: string | null
          nos_unlocked: boolean | null
          pending_remit_count: number | null
          rep_band: string | null
          rope_unlocked: boolean | null
          store_capacity: string | null
          tier_label: string | null
          total_approved_remit: number | null
          usb_unlocked: boolean | null
        }
        Relationships: []
      }
      member_weekly_compliance: {
        Row: {
          approved_quantity: number | null
          crew_rank: string | null
          discord_avatar_url: string | null
          discord_username: string | null
          ingame_name: string | null
          is_active: boolean | null
          member_id: string | null
          quota_amount: number | null
          quota_met: boolean | null
          quota_type_id: string | null
          quota_type_name: string | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      vanta_audit: {
        Args: {
          p_action: string
          p_detail: Json
          p_target_id: string
          p_target_table: string
        }
        Returns: undefined
      }
      vanta_can_view_roster: { Args: never; Returns: boolean }
      vanta_current_rank: { Args: never; Returns: string }
      vanta_current_week_start: { Args: never; Returns: string }
      vanta_ensure_profile: {
        Args: never
        Returns: {
          created_at: string
          crew_rank: string
          discord_avatar_url: string | null
          discord_username: string | null
          id: string
          ingame_name: string | null
          is_active: boolean
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vanta_is_admin: { Args: never; Returns: boolean }
      vanta_is_staff: { Args: never; Returns: boolean }
      vanta_jsonb_diff: { Args: { after: Json; before: Json }; Returns: Json }
      vanta_member_totals: {
        Args: never
        Returns: {
          member_id: string
          pending_remit_count: number
          total_approved_remit: number
        }[]
      }
      vanta_rank_weight: { Args: { p_rank: string }; Returns: number }
      vanta_week_start: { Args: { p_at?: string }; Returns: string }
      vanta_weekly_laundering_totals: {
        Args: never
        Returns: {
          approved_quantity: number
          member_id: string
          remit_type_id: string
        }[]
      }
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
