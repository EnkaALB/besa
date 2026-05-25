// Types Supabase. À regénérer après chaque migration via :
//   npx supabase gen types typescript --db-url "$env:SUPABASE_DB_URL"
// (requiert Docker Desktop pour le moment — cf. DECISIONS.md #20)
//
// STATUT : écrits manuellement, alignés sur migration 0001_initial.sql.
// Structure conforme à la sortie attendue de supabase CLI (Tables avec
// Row/Insert/Update/Relationships, sous-schémas vides en `{ [_ in never]: never }`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BesaStatus =
  | "draft"
  | "active"
  | "pending_validation"
  | "resolved_kept"
  | "resolved_broken"
  | "in_dispute"
  | "ghosted";

export type BesaRole = "creator" | "cosigner";

export type ValidationChoice = "pending" | "kept" | "broken" | "contested";

export type ScoreEventReason =
  | "besa_kept"
  | "besa_ghost"
  | "besa_broken_honest"
  | "besa_in_dispute_neutral"
  | "penalty_linked_accounts";

export type AccountStatus = "active" | "anonymized";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          email: string | null;
          phone: string | null;
          score_visible_public: boolean;
          account_status: AccountStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          email?: string | null;
          phone?: string | null;
          score_visible_public?: boolean;
          account_status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          email?: string | null;
          phone?: string | null;
          score_visible_public?: boolean;
          account_status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      besas: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          deadline: string;
          status: BesaStatus;
          weight_final: number | null;
          is_public: boolean;
          created_at: string;
          activated_at: string | null;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          description?: string | null;
          deadline: string;
          status?: BesaStatus;
          weight_final?: number | null;
          is_public?: boolean;
          created_at?: string;
          activated_at?: string | null;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          description?: string | null;
          deadline?: string;
          status?: BesaStatus;
          weight_final?: number | null;
          is_public?: boolean;
          created_at?: string;
          activated_at?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "besas_creator_id_fkey";
            columns: ["creator_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      besa_parties: {
        Row: {
          besa_id: string;
          user_id: string;
          role: BesaRole;
          weight_ressenti: number | null;
          signed_at: string | null;
          validation_choice: ValidationChoice;
          validated_at: string | null;
        };
        Insert: {
          besa_id: string;
          user_id: string;
          role: BesaRole;
          weight_ressenti?: number | null;
          signed_at?: string | null;
          validation_choice?: ValidationChoice;
          validated_at?: string | null;
        };
        Update: {
          besa_id?: string;
          user_id?: string;
          role?: BesaRole;
          weight_ressenti?: number | null;
          signed_at?: string | null;
          validation_choice?: ValidationChoice;
          validated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "besa_parties_besa_id_fkey";
            columns: ["besa_id"];
            referencedRelation: "besas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "besa_parties_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      besa_invites: {
        Row: {
          token: string;
          besa_id: string;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          used_by_user_id: string | null;
        };
        Insert: {
          token: string;
          besa_id: string;
          created_at?: string;
          expires_at?: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
        };
        Update: {
          token?: string;
          besa_id?: string;
          created_at?: string;
          expires_at?: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "besa_invites_besa_id_fkey";
            columns: ["besa_id"];
            referencedRelation: "besas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "besa_invites_used_by_user_id_fkey";
            columns: ["used_by_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      score_events: {
        Row: {
          id: string;
          user_id: string;
          besa_id: string | null;
          delta: number;
          weight_used: number;
          reason: ScoreEventReason;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          besa_id?: string | null;
          delta: number;
          weight_used: number;
          reason: ScoreEventReason;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          besa_id?: string | null;
          delta?: number;
          weight_used?: number;
          reason?: ScoreEventReason;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_events_besa_id_fkey";
            columns: ["besa_id"];
            referencedRelation: "besas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      consume_invite: {
        Args: { p_token: string; p_weight_ressenti: number };
        Returns: string;
      };
    };
    Enums: {
      besa_status: BesaStatus;
      besa_role: BesaRole;
      validation_choice: ValidationChoice;
      score_event_reason: ScoreEventReason;
      account_status: AccountStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
