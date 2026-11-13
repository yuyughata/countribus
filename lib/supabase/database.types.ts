/**
 * Supabase database types — generated from the live `countribus` project.
 * Regenerate with `pnpm run gen:types` after each migration.
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
      boarding_events: {
        Row: {
          actor_id: string | null;
          booking_passenger_id: string;
          created_at: string;
          event: Database["public"]["Enums"]["boarding_event_kind"];
          id: string;
          schedule_id: string;
          terminal_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          booking_passenger_id: string;
          created_at?: string;
          event: Database["public"]["Enums"]["boarding_event_kind"];
          id?: string;
          schedule_id: string;
          terminal_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          booking_passenger_id?: string;
          created_at?: string;
          event?: Database["public"]["Enums"]["boarding_event_kind"];
          id?: string;
          schedule_id?: string;
          terminal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "boarding_events_booking_passenger_id_fkey";
            columns: ["booking_passenger_id"];
            isOneToOne: false;
            referencedRelation: "booking_passengers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boarding_events_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boarding_events_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_passengers: {
        Row: {
          boarding_status: Database["public"]["Enums"]["boarding_status"];
          booking_id: string;
          fare_kobo: number;
          id: string;
          passenger_id: string;
          passenger_type: Database["public"]["Enums"]["passenger_type"];
          schedule_id: string;
          seat_id: string | null;
          seat_label: string | null;
        };
        Insert: {
          boarding_status?: Database["public"]["Enums"]["boarding_status"];
          booking_id: string;
          fare_kobo: number;
          id?: string;
          passenger_id: string;
          passenger_type?: Database["public"]["Enums"]["passenger_type"];
          schedule_id: string;
          seat_id?: string | null;
          seat_label?: string | null;
        };
        Update: {
          boarding_status?: Database["public"]["Enums"]["boarding_status"];
          booking_id?: string;
          fare_kobo?: number;
          id?: string;
          passenger_id?: string;
          passenger_type?: Database["public"]["Enums"]["passenger_type"];
          schedule_id?: string;
          seat_id?: string | null;
          seat_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_passengers_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_passengers_passenger_id_fkey";
            columns: ["passenger_id"];
            isOneToOne: false;
            referencedRelation: "passengers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_passengers_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_status_history: {
        Row: {
          actor_id: string | null;
          booking_id: string;
          created_at: string;
          from_status: Database["public"]["Enums"]["booking_status"] | null;
          id: string;
          note: string | null;
          to_status: Database["public"]["Enums"]["booking_status"];
        };
        Insert: {
          actor_id?: string | null;
          booking_id: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["booking_status"] | null;
          id?: string;
          note?: string | null;
          to_status: Database["public"]["Enums"]["booking_status"];
        };
        Update: {
          actor_id?: string | null;
          booking_id?: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["booking_status"] | null;
          id?: string;
          note?: string | null;
          to_status?: Database["public"]["Enums"]["booking_status"];
        };
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          contact_email: string | null;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          discount_kobo: number;
          grand_total_kobo: number;
          hold_token: string | null;
          id: string;
          luggage_fee_kobo: number;
          passenger_count: number;
          reference: string;
          schedule_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          total_fare_kobo: number;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          contact_email?: string | null;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          discount_kobo?: number;
          grand_total_kobo: number;
          hold_token?: string | null;
          id?: string;
          luggage_fee_kobo?: number;
          passenger_count: number;
          reference: string;
          schedule_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total_fare_kobo: number;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          contact_email?: string | null;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          discount_kobo?: number;
          grand_total_kobo?: number;
          hold_token?: string | null;
          id?: string;
          luggage_fee_kobo?: number;
          passenger_count?: number;
          reference?: string;
          schedule_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total_fare_kobo?: number;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          state_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          state_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          state_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cities_state_id_fkey";
            columns: ["state_id"];
            isOneToOne: false;
            referencedRelation: "states";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_rules: {
        Row: {
          basis: Database["public"]["Enums"]["commission_basis"];
          effective_from: string;
          effective_to: string | null;
          id: string;
          rate_bps: number;
          scope: string;
          vendor_id: string | null;
        };
        Insert: {
          basis?: Database["public"]["Enums"]["commission_basis"];
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          rate_bps: number;
          scope: string;
          vendor_id?: string | null;
        };
        Update: {
          basis?: Database["public"]["Enums"]["commission_basis"];
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          rate_bps?: number;
          scope?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commission_rules_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_ledger: {
        Row: {
          amount_kobo: number;
          booking_id: string | null;
          created_at: string;
          currency: string;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          id: string;
          related_entry_id: string | null;
          vendor_id: string;
        };
        Insert: {
          amount_kobo: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          id?: string;
          related_entry_id?: string | null;
          vendor_id: string;
        };
        Update: {
          amount_kobo?: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"];
          id?: string;
          related_entry_id?: string | null;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_ledger_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_ledger_related_entry_id_fkey";
            columns: ["related_entry_id"];
            isOneToOne: false;
            referencedRelation: "financial_ledger";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_ledger_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
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
        Update: {
          alias?: string;
          city_id?: string | null;
          created_at?: string;
          id?: string;
          terminal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "location_aliases_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "location_aliases_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      luggage_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event: Database["public"]["Enums"]["luggage_event_kind"];
          id: string;
          luggage_tag_id: string;
          notes: string | null;
          terminal_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event: Database["public"]["Enums"]["luggage_event_kind"];
          id?: string;
          luggage_tag_id: string;
          notes?: string | null;
          terminal_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event?: Database["public"]["Enums"]["luggage_event_kind"];
          id?: string;
          luggage_tag_id?: string;
          notes?: string | null;
          terminal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "luggage_events_luggage_tag_id_fkey";
            columns: ["luggage_tag_id"];
            isOneToOne: false;
            referencedRelation: "luggage_tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "luggage_events_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      luggage_items: {
        Row: {
          booking_passenger_id: string;
          created_at: string;
          dimensions: string | null;
          fee_kobo: number;
          handling_notes: string | null;
          id: string;
          photo_path: string | null;
          quantity: number;
          type: Database["public"]["Enums"]["luggage_type"];
          weight_kg: number | null;
        };
        Insert: {
          booking_passenger_id: string;
          created_at?: string;
          dimensions?: string | null;
          fee_kobo?: number;
          handling_notes?: string | null;
          id?: string;
          photo_path?: string | null;
          quantity?: number;
          type: Database["public"]["Enums"]["luggage_type"];
          weight_kg?: number | null;
        };
        Update: {
          booking_passenger_id?: string;
          created_at?: string;
          dimensions?: string | null;
          fee_kobo?: number;
          handling_notes?: string | null;
          id?: string;
          photo_path?: string | null;
          quantity?: number;
          type?: Database["public"]["Enums"]["luggage_type"];
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "luggage_items_booking_passenger_id_fkey";
            columns: ["booking_passenger_id"];
            isOneToOne: false;
            referencedRelation: "booking_passengers";
            referencedColumns: ["id"];
          },
        ];
      };
      luggage_policies: {
        Row: {
          fee_per_extra_bag_kobo: number;
          free_bags: number;
          max_weight_kg: number | null;
          prohibited_items: Json;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          fee_per_extra_bag_kobo?: number;
          free_bags?: number;
          max_weight_kg?: number | null;
          prohibited_items?: Json;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          fee_per_extra_bag_kobo?: number;
          free_bags?: number;
          max_weight_kg?: number | null;
          prohibited_items?: Json;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "luggage_policies_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: true;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      luggage_tags: {
        Row: {
          code: string;
          id: string;
          issued_at: string;
          luggage_item_id: string;
        };
        Insert: {
          code?: string;
          id?: string;
          issued_at?: string;
          luggage_item_id: string;
        };
        Update: {
          code?: string;
          id?: string;
          issued_at?: string;
          luggage_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "luggage_tags_luggage_item_id_fkey";
            columns: ["luggage_item_id"];
            isOneToOne: false;
            referencedRelation: "luggage_items";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          email: boolean;
          sms: boolean;
          updated_at: string;
          user_id: string;
          whatsapp: boolean;
        };
        Insert: {
          email?: boolean;
          sms?: boolean;
          updated_at?: string;
          user_id: string;
          whatsapp?: boolean;
        };
        Update: {
          email?: boolean;
          sms?: boolean;
          updated_at?: string;
          user_id?: string;
          whatsapp?: boolean;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          booking_id: string | null;
          channel: string;
          created_at: string;
          error: string | null;
          id: string;
          payload: Json;
          provider_message_id: string | null;
          recipient: string | null;
          sent_at: string | null;
          status: string;
          template: string;
          user_id: string | null;
        };
        Insert: {
          booking_id?: string | null;
          channel: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          payload?: Json;
          provider_message_id?: string | null;
          recipient?: string | null;
          sent_at?: string | null;
          status?: string;
          template: string;
          user_id?: string | null;
        };
        Update: {
          booking_id?: string | null;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          payload?: Json;
          provider_message_id?: string | null;
          recipient?: string | null;
          sent_at?: string | null;
          status?: string;
          template?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      passengers: {
        Row: {
          booking_id: string;
          email: string | null;
          emergency_contact: string | null;
          full_name: string;
          id: string;
          phone: string | null;
        };
        Insert: {
          booking_id: string;
          email?: string | null;
          emergency_contact?: string | null;
          full_name: string;
          id?: string;
          phone?: string | null;
        };
        Update: {
          booking_id?: string;
          email?: string | null;
          emergency_contact?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "passengers_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_transactions: {
        Row: {
          amount_kobo: number;
          booking_id: string;
          currency: string;
          id: string;
          initialized_at: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_reference: string;
          raw_meta: Json;
          status: Database["public"]["Enums"]["payment_status"];
          verified_at: string | null;
        };
        Insert: {
          amount_kobo: number;
          booking_id: string;
          currency?: string;
          id?: string;
          initialized_at?: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_reference: string;
          raw_meta?: Json;
          status?: Database["public"]["Enums"]["payment_status"];
          verified_at?: string | null;
        };
        Update: {
          amount_kobo?: number;
          booking_id?: string;
          currency?: string;
          id?: string;
          initialized_at?: string;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_reference?: string;
          raw_meta?: Json;
          status?: Database["public"]["Enums"]["payment_status"];
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
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
      route_stops: {
        Row: {
          id: string;
          is_dropoff: boolean;
          is_pickup: boolean;
          route_id: string;
          stop_order: number;
          terminal_id: string;
        };
        Insert: {
          id?: string;
          is_dropoff?: boolean;
          is_pickup?: boolean;
          route_id: string;
          stop_order: number;
          terminal_id: string;
        };
        Update: {
          id?: string;
          is_dropoff?: boolean;
          is_pickup?: boolean;
          route_id?: string;
          stop_order?: number;
          terminal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_stops_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      routes: {
        Row: {
          created_at: string;
          destination_terminal_id: string;
          id: string;
          is_active: boolean;
          name: string;
          origin_terminal_id: string;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          created_at?: string;
          destination_terminal_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          origin_terminal_id: string;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          destination_terminal_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          origin_terminal_id?: string;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "routes_destination_terminal_id_fkey";
            columns: ["destination_terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routes_origin_terminal_id_fkey";
            columns: ["origin_terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routes_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_seats: {
        Row: {
          booking_passenger_id: string | null;
          held_until: string | null;
          hold_token: string | null;
          id: string;
          schedule_id: string;
          seat_id: string;
          seat_label: string;
          state: Database["public"]["Enums"]["seat_state"];
          surcharge_kobo: number;
          updated_at: string;
        };
        Insert: {
          booking_passenger_id?: string | null;
          held_until?: string | null;
          hold_token?: string | null;
          id?: string;
          schedule_id: string;
          seat_id: string;
          seat_label: string;
          state?: Database["public"]["Enums"]["seat_state"];
          surcharge_kobo?: number;
          updated_at?: string;
        };
        Update: {
          booking_passenger_id?: string | null;
          held_until?: string | null;
          hold_token?: string | null;
          id?: string;
          schedule_id?: string;
          seat_id?: string;
          seat_label?: string;
          state?: Database["public"]["Enums"]["seat_state"];
          surcharge_kobo?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_seats_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      schedules: {
        Row: {
          arrival_estimate_at: string | null;
          base_fare_kobo: number | null;
          boarding_address: string | null;
          boarding_contact_phone: string | null;
          booking_cutoff_at: string | null;
          capacity: number | null;
          created_at: string;
          currency: string;
          departure_at: string;
          destination_terminal_id: string;
          id: string;
          origin_terminal_id: string;
          route_id: string;
          seat_template_id: string | null;
          seat_template_version: number | null;
          service_window: unknown;
          status: Database["public"]["Enums"]["schedule_status"];
          updated_at: string;
          vehicle_id: string | null;
          vendor_id: string;
        };
        Insert: {
          arrival_estimate_at?: string | null;
          base_fare_kobo?: number | null;
          boarding_address?: string | null;
          boarding_contact_phone?: string | null;
          booking_cutoff_at?: string | null;
          capacity?: number | null;
          created_at?: string;
          currency?: string;
          departure_at: string;
          destination_terminal_id: string;
          id?: string;
          origin_terminal_id: string;
          route_id: string;
          seat_template_id?: string | null;
          seat_template_version?: number | null;
          service_window?: unknown;
          status?: Database["public"]["Enums"]["schedule_status"];
          updated_at?: string;
          vehicle_id?: string | null;
          vendor_id: string;
        };
        Update: {
          arrival_estimate_at?: string | null;
          base_fare_kobo?: number | null;
          boarding_address?: string | null;
          boarding_contact_phone?: string | null;
          booking_cutoff_at?: string | null;
          capacity?: number | null;
          created_at?: string;
          currency?: string;
          departure_at?: string;
          destination_terminal_id?: string;
          id?: string;
          origin_terminal_id?: string;
          route_id?: string;
          seat_template_id?: string | null;
          seat_template_version?: number | null;
          service_window?: unknown;
          status?: Database["public"]["Enums"]["schedule_status"];
          updated_at?: string;
          vehicle_id?: string | null;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedules_destination_terminal_id_fkey";
            columns: ["destination_terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_origin_terminal_id_fkey";
            columns: ["origin_terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_seat_template_id_fkey";
            columns: ["seat_template_id"];
            isOneToOne: false;
            referencedRelation: "seat_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedules_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      seat_template_seats: {
        Row: {
          col: number;
          id: string;
          is_sellable: boolean;
          row: number;
          seat_class: string;
          seat_label: string;
          seat_template_id: string;
          seat_type: Database["public"]["Enums"]["seat_type"];
          surcharge_kobo: number;
        };
        Insert: {
          col: number;
          id?: string;
          is_sellable?: boolean;
          row: number;
          seat_class?: string;
          seat_label: string;
          seat_template_id: string;
          seat_type?: Database["public"]["Enums"]["seat_type"];
          surcharge_kobo?: number;
        };
        Update: {
          col?: number;
          id?: string;
          is_sellable?: boolean;
          row?: number;
          seat_class?: string;
          seat_label?: string;
          seat_template_id?: string;
          seat_type?: Database["public"]["Enums"]["seat_type"];
          surcharge_kobo?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seat_template_seats_seat_template_id_fkey";
            columns: ["seat_template_id"];
            isOneToOne: false;
            referencedRelation: "seat_templates";
            referencedColumns: ["id"];
          },
        ];
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
        Update: {
          columns?: number;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          name?: string;
          rows?: number;
          updated_at?: string;
          vehicle_id?: string | null;
          vendor_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seat_templates_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_templates_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      states: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
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
        Update: {
          address?: string | null;
          city_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "terminals_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "terminals_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_delivery_events: {
        Row: {
          attempted_at: string;
          channel: string;
          delivery_status: string;
          error: string | null;
          id: string;
          provider_message_id: string | null;
          recipient: string | null;
          ticket_document_id: string;
        };
        Insert: {
          attempted_at?: string;
          channel: string;
          delivery_status?: string;
          error?: string | null;
          id?: string;
          provider_message_id?: string | null;
          recipient?: string | null;
          ticket_document_id: string;
        };
        Update: {
          attempted_at?: string;
          channel?: string;
          delivery_status?: string;
          error?: string | null;
          id?: string;
          provider_message_id?: string | null;
          recipient?: string | null;
          ticket_document_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_delivery_events_ticket_document_id_fkey";
            columns: ["ticket_document_id"];
            isOneToOne: false;
            referencedRelation: "ticket_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_documents: {
        Row: {
          booking_id: string;
          document_version: number;
          generated_at: string;
          id: string;
          passenger_id: string;
          qr_token: string;
          revoke_reason: string | null;
          revoked_at: string | null;
          schedule_id: string;
          status: string;
          storage_path: string | null;
        };
        Insert: {
          booking_id: string;
          document_version?: number;
          generated_at?: string;
          id?: string;
          passenger_id: string;
          qr_token?: string;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          schedule_id: string;
          status?: string;
          storage_path?: string | null;
        };
        Update: {
          booking_id?: string;
          document_version?: number;
          generated_at?: string;
          id?: string;
          passenger_id?: string;
          qr_token?: string;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          schedule_id?: string;
          status?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_documents_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_documents_passenger_id_fkey";
            columns: ["passenger_id"];
            isOneToOne: false;
            referencedRelation: "passengers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_documents_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
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
        Update: {
          description?: string | null;
          id?: string;
          key?: string;
          name?: string;
          sort_order?: number;
        };
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
        Update: {
          capacity?: number;
          category_id?: string;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          photos?: string[];
          registration_no?: string;
          status?: Database["public"]["Enums"]["vehicle_status"];
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicles_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
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
      webhook_events: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          result: string | null;
          signature_valid: boolean | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          result?: string | null;
          signature_valid?: boolean | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_event_id?: string;
          result?: string | null;
          signature_valid?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_dashboard_metrics: {
        Args: { p_from?: string; p_to?: string };
        Returns: Json;
      };
      admin_revenue_by_month: {
        Args: never;
        Returns: {
          gross_kobo: number;
          month: string;
        }[];
      };
      booking_passenger_vendor: { Args: { p_bp: string }; Returns: string };
      cancel_booking: {
        Args: { p_booking: string; p_reason?: string };
        Returns: undefined;
      };
      confirm_payment: {
        Args: {
          p_amount_kobo: number;
          p_event_id: string;
          p_provider: Database["public"]["Enums"]["payment_provider"];
          p_reference: string;
        };
        Returns: string;
      };
      create_booking_from_hold: {
        Args: {
          p_contact: Json;
          p_hold_token: string;
          p_infants?: Json;
          p_passengers: Json;
          p_schedule: string;
        };
        Returns: {
          booking_id: string;
          reference: string;
        }[];
      };
      current_vendor_ids: { Args: never; Returns: string[] };
      declare_luggage: {
        Args: { p_booking: string; p_items: Json };
        Returns: number;
      };
      has_vendor_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["vendor_role"][];
          p_vendor: string;
        };
        Returns: boolean;
      };
      hold_seats: {
        Args: {
          p_hold_token: string;
          p_minutes?: number;
          p_schedule: string;
          p_seat_ids: string[];
        };
        Returns: string;
      };
      is_platform_admin: { Args: never; Returns: boolean };
      is_vendor_creator: { Args: { p_vendor: string }; Returns: boolean };
      publish_schedule: { Args: { p_schedule: string }; Returns: undefined };
      reconcile_expired_holds: { Args: { p_schedule: string }; Returns: number };
      record_boarding: {
        Args: {
          p_bp: string;
          p_event: Database["public"]["Enums"]["boarding_event_kind"];
          p_terminal?: string;
        };
        Returns: undefined;
      };
      record_luggage_event: {
        Args: {
          p_event: Database["public"]["Enums"]["luggage_event_kind"];
          p_notes?: string;
          p_tag: string;
          p_terminal?: string;
        };
        Returns: undefined;
      };
      release_hold: {
        Args: { p_hold_token: string; p_schedule: string };
        Returns: undefined;
      };
      schedule_public: { Args: { p_schedule: string }; Returns: boolean };
      schedule_vendor: { Args: { p_schedule: string }; Returns: string };
      search_journeys: {
        Args: {
          p_category?: string;
          p_date: string;
          p_dest: string;
          p_origin: string;
          p_pax?: number;
        };
        Returns: {
          arrival_estimate_at: string;
          available_seats: number;
          base_fare_kobo: number;
          category_key: string;
          departure_at: string;
          destination_name: string;
          origin_name: string;
          schedule_id: string;
          vendor_name: string;
        }[];
      };
      seat_template_vendor: { Args: { p_template: string }; Returns: string };
      vendor_dashboard_metrics: {
        Args: { p_from?: string; p_to?: string; p_vendor: string };
        Returns: Json;
      };
      set_platform_commission: {
        Args: { p_bps: number };
        Returns: number;
      };
      vendor_staff_list: {
        Args: { p_vendor: string };
        Returns: {
          user_id: string;
          full_name: string | null;
          email: string | null;
          role: Database["public"]["Enums"]["vendor_role"];
          is_active: boolean;
        }[];
      };
      verify_ticket: { Args: { p_qr_token: string }; Returns: Json };
    };
    Enums: {
      boarding_event_kind: "checked_in" | "boarded" | "no_show";
      boarding_status: "not_checked_in" | "checked_in" | "boarded" | "no_show";
      booking_status: "pending_payment" | "paid" | "failed" | "cancelled" | "refunded" | "expired";
      commission_basis: "base_fare" | "fare_plus_fees";
      ledger_entry_type:
        | "booking_gross"
        | "platform_commission"
        | "vendor_net"
        | "provider_fee"
        | "refund"
        | "reversal"
        | "adjustment";
      luggage_event_kind: "accepted" | "loaded" | "unloaded" | "returned" | "exception";
      luggage_type:
        | "handbag"
        | "small_bag"
        | "medium_bag"
        | "large_bag"
        | "suitcase"
        | "carton"
        | "sack"
        | "other";
      passenger_type: "adult" | "child_1_5" | "child_6_10";
      payment_provider: "paystack" | "flutterwave";
      payment_status: "initialized" | "pending" | "success" | "failed" | "abandoned";
      schedule_status: "draft" | "published" | "cancelled" | "departed" | "completed";
      seat_state: "available" | "booked" | "held" | "blocked";
      seat_type:
        | "standard"
        | "window"
        | "aisle"
        | "driver"
        | "blocked"
        | "wc"
        | "entrance"
        | "amenity"
        | "empty";
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      boarding_event_kind: ["checked_in", "boarded", "no_show"],
      boarding_status: ["not_checked_in", "checked_in", "boarded", "no_show"],
      booking_status: ["pending_payment", "paid", "failed", "cancelled", "refunded", "expired"],
      commission_basis: ["base_fare", "fare_plus_fees"],
      ledger_entry_type: [
        "booking_gross",
        "platform_commission",
        "vendor_net",
        "provider_fee",
        "refund",
        "reversal",
        "adjustment",
      ],
      luggage_event_kind: ["accepted", "loaded", "unloaded", "returned", "exception"],
      luggage_type: [
        "handbag",
        "small_bag",
        "medium_bag",
        "large_bag",
        "suitcase",
        "carton",
        "sack",
        "other",
      ],
      passenger_type: ["adult", "child_1_5", "child_6_10"],
      payment_provider: ["paystack", "flutterwave"],
      payment_status: ["initialized", "pending", "success", "failed", "abandoned"],
      schedule_status: ["draft", "published", "cancelled", "departed", "completed"],
      seat_state: ["available", "booked", "held", "blocked"],
      seat_type: [
        "standard",
        "window",
        "aisle",
        "driver",
        "blocked",
        "wc",
        "entrance",
        "amenity",
        "empty",
      ],
      vehicle_status: ["active", "inactive", "maintenance"],
      vendor_role: [
        "vendor_owner",
        "vendor_manager",
        "booking_officer",
        "terminal_staff",
        "luggage_officer",
        "finance_officer",
      ],
      vendor_status: ["pending", "approved", "suspended", "rejected"],
    },
  },
} as const;

/** Hand-added convenience aliases consumed across the app. */
export type VendorRole = Database["public"]["Enums"]["vendor_role"];
export type VendorStatus = Database["public"]["Enums"]["vendor_status"];
export type SeatType = Database["public"]["Enums"]["seat_type"];
export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
export type ScheduleStatus = Database["public"]["Enums"]["schedule_status"];
export type SeatState = Database["public"]["Enums"]["seat_state"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentProvider = Database["public"]["Enums"]["payment_provider"];
export type LuggageType = Database["public"]["Enums"]["luggage_type"];
export type PassengerType = Database["public"]["Enums"]["passenger_type"];
