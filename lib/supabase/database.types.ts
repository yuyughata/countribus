/**
 * Supabase database types — generated from the live `countribus` project.
 * Regenerate with `pnpm run gen:types` after each migration. The aliases at the
 * end are hand-added conveniences consumed across the app.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      cities: {
        Row: { created_at: string; id: string; name: string; state_id: string };
        Insert: { created_at?: string; id?: string; name: string; state_id: string };
        Update: Partial<Database["public"]["Tables"]["cities"]["Insert"]>;
        Relationships: [];
      };
      location_aliases: {
        Row: {
          alias: string;
          city_id: string | null;
          created_at: string;
          id: string;
          terminal_id: string | null;
        };
        Insert: {
          alias: string;
          city_id?: string | null;
          created_at?: string;
          id?: string;
          terminal_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["location_aliases"]["Insert"]>;
        Relationships: [];
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
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      seat_template_seats: {
        Row: {
          col: number;
          id: string;
          is_sellable: boolean;
          row: number;
          seat_label: string;
          seat_template_id: string;
          seat_type: Database["public"]["Enums"]["seat_type"];
        };
        Insert: {
          col: number;
          id?: string;
          is_sellable?: boolean;
          row: number;
          seat_label: string;
          seat_template_id: string;
          seat_type?: Database["public"]["Enums"]["seat_type"];
        };
        Update: Partial<Database["public"]["Tables"]["seat_template_seats"]["Insert"]>;
        Relationships: [];
      };
      seat_templates: {
        Row: {
          columns: number;
          created_at: string;
          id: string;
          is_published: boolean;
          name: string;
          rows: number;
          updated_at: string;
          vehicle_id: string | null;
          vendor_id: string;
          version: number;
        };
        Insert: {
          columns: number;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          name: string;
          rows: number;
          updated_at?: string;
          vehicle_id?: string | null;
          vendor_id: string;
          version?: number;
        };
        Update: Partial<Database["public"]["Tables"]["seat_templates"]["Insert"]>;
        Relationships: [];
      };
      states: {
        Row: { code: string; created_at: string; id: string; name: string };
        Insert: { code: string; created_at?: string; id?: string; name: string };
        Update: Partial<Database["public"]["Tables"]["states"]["Insert"]>;
        Relationships: [];
      };
      terminals: {
        Row: {
          address: string | null;
          city_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          latitude: number | null;
          longitude: number | null;
          name: string;
          updated_at: string;
          vendor_id: string | null;
        };
        Insert: {
          address?: string | null;
          city_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["terminals"]["Insert"]>;
        Relationships: [];
      };
      vehicle_categories: {
        Row: {
          description: string | null;
          id: string;
          key: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          description?: string | null;
          id?: string;
          key: string;
          name: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_categories"]["Insert"]>;
        Relationships: [];
      };
      vehicles: {
        Row: {
          capacity: number;
          category_id: string;
          created_at: string;
          display_name: string | null;
          id: string;
          photos: string[];
          registration_no: string;
          status: Database["public"]["Enums"]["vehicle_status"];
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          capacity: number;
          category_id: string;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          photos?: string[];
          registration_no: string;
          status?: Database["public"]["Enums"]["vehicle_status"];
          updated_at?: string;
          vendor_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
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
        Update: Partial<Database["public"]["Tables"]["vendor_staff"]["Insert"]>;
        Relationships: [];
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
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      current_vendor_ids: { Args: Record<string, never>; Returns: string[] };
      has_vendor_role: {
        Args: { p_roles: Database["public"]["Enums"]["vendor_role"][]; p_vendor: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      is_vendor_creator: { Args: { p_vendor: string }; Returns: boolean };
      seat_template_vendor: { Args: { p_template: string }; Returns: string };
    };
    Enums: {
      seat_type: "standard" | "window" | "aisle" | "driver" | "blocked";
      vehicle_status: "active" | "inactive" | "maintenance";
      vendor_role:
        | "vendor_owner"
        | "vendor_manager"
        | "booking_officer"
        | "terminal_staff"
        | "luggage_officer"
        | "finance_officer";
      vendor_status: "pending" | "approved" | "suspended" | "rejected";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Hand-added convenience aliases consumed across the app. */
export type VendorRole = Database["public"]["Enums"]["vendor_role"];
export type VendorStatus = Database["public"]["Enums"]["vendor_status"];
export type SeatType = Database["public"]["Enums"]["seat_type"];
export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
