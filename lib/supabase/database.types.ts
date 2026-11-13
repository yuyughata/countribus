/**
 * Supabase database types.
 *
 * Hand-authored for the Phase 1 schema (identity & tenancy) to match
 * `supabase/migrations`. Once the `countribus` project is linked, regenerate
 * the full file with `pnpm run gen:types` (supabase gen types typescript),
 * which will also cover later-phase tables.
 */

export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

export type VendorRole =
  | "vendor_owner"
  | "vendor_manager"
  | "booking_officer"
  | "terminal_staff"
  | "luggage_officer"
  | "finance_officer";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          avatar_path: string | null;
          is_platform_admin: boolean;
        } & Timestamps;
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_path?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: VendorStatus;
          contact_email: string | null;
          contact_phone: string | null;
          logo_path: string | null;
          commission_rate_bps: number | null;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: VendorStatus;
          contact_email?: string | null;
          contact_phone?: string | null;
          logo_path?: string | null;
          commission_rate_bps?: number | null;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
        Relationships: [];
      };
      vendor_staff: {
        Row: {
          id: string;
          vendor_id: string;
          user_id: string;
          role: VendorRole;
          assigned_terminal_id: string | null;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          vendor_id: string;
          user_id: string;
          role: VendorRole;
          assigned_terminal_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_staff"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          vendor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          vendor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      current_vendor_ids: { Args: Record<string, never>; Returns: string[] };
      has_vendor_role: { Args: { p_vendor: string; p_roles: VendorRole[] }; Returns: boolean };
      is_vendor_creator: { Args: { p_vendor: string }; Returns: boolean };
    };
    Enums: {
      vendor_status: VendorStatus;
      vendor_role: VendorRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
