/**
 * Mirrors the schema in supabase/migrations.
 *
 * Regenerate after any migration with:
 *   npm run db:types
 * which runs `supabase gen types typescript` against your project.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          detail: Json | null;
          id: string;
          target_id: string | null;
          target_table: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json | null;
          id?: string;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json | null;
          id?: string;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          crew_rank: string | null;
          discord_avatar_url: string | null;
          discord_username: string | null;
          id: string;
          ingame_name: string | null;
          is_active: boolean;
          role: string;
        };
        Insert: {
          created_at?: string;
          crew_rank?: string | null;
          discord_avatar_url?: string | null;
          discord_username?: string | null;
          id: string;
          ingame_name?: string | null;
          is_active?: boolean;
          role?: string;
        };
        Update: {
          created_at?: string;
          crew_rank?: string | null;
          discord_avatar_url?: string | null;
          discord_username?: string | null;
          id?: string;
          ingame_name?: string | null;
          is_active?: boolean;
          role?: string;
        };
        Relationships: [];
      };
      remit_logs: {
        Row: {
          amount: number;
          created_at: string;
          description: string | null;
          id: string;
          member_id: string;
          reviewed_by: string | null;
          status: string;
          submitted_by: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          member_id: string;
          reviewed_by?: string | null;
          status?: string;
          submitted_by: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          member_id?: string;
          reviewed_by?: string | null;
          status?: string;
          submitted_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "remit_logs_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remit_logs_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remit_logs_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reputation_entries: {
        Row: {
          created_at: string;
          given_by: string;
          id: string;
          member_id: string;
          points: number;
          reason: string;
        };
        Insert: {
          created_at?: string;
          given_by: string;
          id?: string;
          member_id: string;
          points: number;
          reason: string;
        };
        Update: {
          created_at?: string;
          given_by?: string;
          id?: string;
          member_id?: string;
          points?: number;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reputation_entries_given_by_fkey";
            columns: ["given_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reputation_entries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      member_summary: {
        Row: {
          created_at: string | null;
          crew_rank: string | null;
          discord_avatar_url: string | null;
          discord_username: string | null;
          id: string | null;
          ingame_name: string | null;
          is_active: boolean | null;
          pending_remit_count: number | null;
          role: string | null;
          total_approved_remit: number | null;
          total_rep: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      vanta_current_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      vanta_is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      vanta_is_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      vanta_member_totals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          member_id: string;
          total_rep: number;
          total_approved_remit: number;
          pending_remit_count: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends { Update: infer U } ? U : never;
