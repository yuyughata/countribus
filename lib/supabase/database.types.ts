/**
 * Supabase database types — generated from the live `countribus` project.
 * Regenerate with `pnpm run gen:types` (or the Supabase MCP) after migrations.
 * The `VendorRole` / `VendorStatus` aliases at the end are hand-added
 * conveniences consumed across the app.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          metadata: Json;
          vendor_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          metadata?: Json;
          vendor_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          metadata?: Json;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_platform_admin: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_platform_admin?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_platform_admin?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendor_staff: {
        Row: {
          assigned_terminal_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["vendor_role"];
          updated_at: string;
          user_id: string;
          vendor_id: string;
        };
        Insert: {
          assigned_terminal_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          role: Database["public"]["Enums"]["vendor_role"];
          updated_at?: string;
          user_id: string;
          vendor_id: string;
        };
        Update: {
          assigned_terminal_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["vendor_role"];
          updated_at?: string;
          user_id?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_staff_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          commission_rate_bps: number | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          logo_path: string | null;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["vendor_status"];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          commission_rate_bps?: number | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          logo_path?: string | null;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["vendor_status"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          commission_rate_bps?: number | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          logo_path?: string | null;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["vendor_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_vendor_ids: { Args: never; Returns: string[] };
      has_vendor_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["vendor_role"][];
          p_vendor: string;
        };
        Returns: boolean;
      };
      is_platform_admin: { Args: never; Returns: boolean };
      is_vendor_creator: { Args: { p_vendor: string }; Returns: boolean };
    };
    Enums: {
      vendor_role:
        | "vendor_owner"
        | "vendor_manager"
        | "booking_officer"
        | "terminal_staff"
        | "luggage_officer"
        | "finance_officer";
      vendor_status: "pending" | "approved" | "suspended" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/** Hand-added convenience aliases consumed across the app. */
export type VendorRole = Database["public"]["Enums"]["vendor_role"];
export type VendorStatus = Database["public"]["Enums"]["vendor_status"];
