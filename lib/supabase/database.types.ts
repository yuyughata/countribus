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
      bookings: {
        Row: {
          id: string;
          reference: string;
          vendor_id: string;
          schedule_id: string;
          contact_name: string;
          contact_phone: string;
          contact_email: string | null;
          passenger_count: number;
          total_fare_kobo: number;
          luggage_fee_kobo: number;
          discount_kobo: number;
          grand_total_kobo: number;
          currency: string;
          status: Database["public"]["Enums"]["booking_status"];
          created_by: string | null;
          hold_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          vendor_id: string;
          schedule_id: string;
          contact_name: string;
          contact_phone: string;
          contact_email?: string | null;
          passenger_count: number;
          total_fare_kobo: number;
          luggage_fee_kobo?: number;
          discount_kobo?: number;
          grand_total_kobo: number;
          currency?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          created_by?: string | null;
          hold_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      passengers: {
        Row: {
          id: string;
          booking_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          emergency_contact: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          emergency_contact?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["passengers"]["Insert"]>;
        Relationships: [];
      };
      booking_passengers: {
        Row: {
          id: string;
          booking_id: string;
          passenger_id: string;
          schedule_id: string;
          seat_id: string;
          seat_label: string;
          fare_kobo: number;
          boarding_status: Database["public"]["Enums"]["boarding_status"];
        };
        Insert: {
          id?: string;
          booking_id: string;
          passenger_id: string;
          schedule_id: string;
          seat_id: string;
          seat_label: string;
          fare_kobo: number;
          boarding_status?: Database["public"]["Enums"]["boarding_status"];
        };
        Update: Partial<Database["public"]["Tables"]["booking_passengers"]["Insert"]>;
        Relationships: [];
      };
      booking_status_history: {
        Row: {
          id: string;
          booking_id: string;
          from_status: Database["public"]["Enums"]["booking_status"] | null;
          to_status: Database["public"]["Enums"]["booking_status"];
          actor_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          from_status?: Database["public"]["Enums"]["booking_status"] | null;
          to_status: Database["public"]["Enums"]["booking_status"];
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_status_history"]["Insert"]>;
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          id: string;
          booking_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_reference: string;
          amount_kobo: number;
          currency: string;
          status: Database["public"]["Enums"]["payment_status"];
          raw_meta: Json;
          initialized_at: string;
          verified_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_reference: string;
          amount_kobo: number;
          currency?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          raw_meta?: Json;
          initialized_at?: string;
          verified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payment_transactions"]["Insert"]>;
        Relationships: [];
      };
      commission_rules: {
        Row: {
          id: string;
          scope: string;
          vendor_id: string | null;
          rate_bps: number;
          basis: Database["public"]["Enums"]["commission_basis"];
          effective_from: string;
          effective_to: string | null;
        };
        Insert: {
          id?: string;
          scope: string;
          vendor_id?: string | null;
          rate_bps: number;
          basis?: Database["public"]["Enums"]["commission_basis"];
          effective_from?: string;
          effective_to?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["commission_rules"]["Insert"]>;
        Relationships: [];
      };
      financial_ledger: {
        Row: {
          id: string;
          booking_id: string | null;
          vendor_id: string;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          amount_kobo: number;
          currency: string;
          related_entry_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          vendor_id: string;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          amount_kobo: number;
          currency?: string;
          related_entry_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["financial_ledger"]["Insert"]>;
        Relationships: [];
      };
      ticket_documents: {
        Row: {
          id: string;
          booking_id: string;
          passenger_id: string;
          schedule_id: string;
          qr_token: string;
          storage_path: string | null;
          document_version: number;
          status: string;
          generated_at: string;
          revoked_at: string | null;
          revoke_reason: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          passenger_id: string;
          schedule_id: string;
          qr_token?: string;
          storage_path?: string | null;
          document_version?: number;
          status?: string;
          generated_at?: string;
          revoked_at?: string | null;
          revoke_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ticket_documents"]["Insert"]>;
        Relationships: [];
      };
      ticket_delivery_events: {
        Row: {
          id: string;
          ticket_document_id: string;
          channel: string;
          recipient: string | null;
          provider_message_id: string | null;
          attempted_at: string;
          delivery_status: string;
          error: string | null;
        };
        Insert: {
          id?: string;
          ticket_document_id: string;
          channel: string;
          recipient?: string | null;
          provider_message_id?: string | null;
          attempted_at?: string;
          delivery_status?: string;
          error?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ticket_delivery_events"]["Insert"]>;
        Relationships: [];
      };
      routes: {
        Row: {
          id: string;
          vendor_id: string;
          origin_terminal_id: string;
          destination_terminal_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          origin_terminal_id: string;
          destination_terminal_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["routes"]["Insert"]>;
        Relationships: [];
      };
      route_stops: {
        Row: {
          id: string;
          route_id: string;
          terminal_id: string;
          stop_order: number;
          is_pickup: boolean;
          is_dropoff: boolean;
        };
        Insert: {
          id?: string;
          route_id: string;
          terminal_id: string;
          stop_order: number;
          is_pickup?: boolean;
          is_dropoff?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["route_stops"]["Insert"]>;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          vendor_id: string;
          route_id: string;
          vehicle_id: string | null;
          seat_template_id: string | null;
          seat_template_version: number | null;
          origin_terminal_id: string;
          destination_terminal_id: string;
          departure_at: string;
          arrival_estimate_at: string | null;
          base_fare_kobo: number | null;
          currency: string;
          booking_cutoff_at: string | null;
          capacity: number | null;
          status: Database["public"]["Enums"]["schedule_status"];
          service_window: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          route_id: string;
          vehicle_id?: string | null;
          seat_template_id?: string | null;
          seat_template_version?: number | null;
          origin_terminal_id: string;
          destination_terminal_id: string;
          departure_at: string;
          arrival_estimate_at?: string | null;
          base_fare_kobo?: number | null;
          currency?: string;
          booking_cutoff_at?: string | null;
          capacity?: number | null;
          status?: Database["public"]["Enums"]["schedule_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedules"]["Insert"]>;
        Relationships: [];
      };
      schedule_seats: {
        Row: {
          id: string;
          schedule_id: string;
          seat_label: string;
          seat_id: string;
          state: Database["public"]["Enums"]["seat_state"];
          booking_passenger_id: string | null;
          held_until: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          seat_label: string;
          seat_id: string;
          state?: Database["public"]["Enums"]["seat_state"];
          booking_passenger_id?: string | null;
          held_until?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_seats"]["Insert"]>;
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
      schedule_vendor: { Args: { p_schedule: string }; Returns: string };
      schedule_public: { Args: { p_schedule: string }; Returns: boolean };
      publish_schedule: { Args: { p_schedule: string }; Returns: undefined };
      reconcile_expired_holds: { Args: { p_schedule: string }; Returns: number };
      hold_seats: {
        Args: {
          p_schedule: string;
          p_seat_ids: string[];
          p_hold_token: string;
          p_minutes?: number;
        };
        Returns: string;
      };
      release_hold: { Args: { p_schedule: string; p_hold_token: string }; Returns: undefined };
      search_journeys: {
        Args: {
          p_origin: string;
          p_dest: string;
          p_date: string;
          p_pax?: number;
          p_category?: string;
        };
        Returns: {
          schedule_id: string;
          vendor_name: string;
          origin_name: string;
          destination_name: string;
          departure_at: string;
          arrival_estimate_at: string | null;
          base_fare_kobo: number | null;
          category_key: string | null;
          available_seats: number;
        }[];
      };
      create_booking_from_hold: {
        Args: { p_schedule: string; p_hold_token: string; p_contact: Json; p_passengers: Json };
        Returns: { booking_id: string; reference: string }[];
      };
      confirm_payment: {
        Args: {
          p_provider: Database["public"]["Enums"]["payment_provider"];
          p_event_id: string;
          p_reference: string;
          p_amount_kobo: number;
        };
        Returns: string;
      };
      cancel_booking: { Args: { p_booking: string; p_reason?: string }; Returns: undefined };
    };
    Enums: {
      seat_type: "standard" | "window" | "aisle" | "driver" | "blocked";
      schedule_status: "draft" | "published" | "cancelled" | "departed" | "completed";
      seat_state: "available" | "booked" | "held" | "blocked";
      booking_status: "pending_payment" | "paid" | "failed" | "cancelled" | "refunded" | "expired";
      boarding_status: "not_checked_in" | "checked_in" | "boarded" | "no_show";
      payment_provider: "paystack" | "flutterwave";
      payment_status: "initialized" | "pending" | "success" | "failed" | "abandoned";
      ledger_entry_type:
        | "booking_gross"
        | "platform_commission"
        | "vendor_net"
        | "provider_fee"
        | "refund"
        | "reversal"
        | "adjustment";
      commission_basis: "base_fare" | "fare_plus_fees";
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
export type ScheduleStatus = Database["public"]["Enums"]["schedule_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentProvider = Database["public"]["Enums"]["payment_provider"];
export type SeatState = Database["public"]["Enums"]["seat_state"];
