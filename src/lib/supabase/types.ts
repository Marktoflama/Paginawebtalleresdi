/**
 * Database types. Hand-maintained to mirror supabase/migrations/*.sql
 * (the CLI generator needs Docker, which isn't available on the dev machine).
 */

export type BookingStatus = "confirmed" | "cancelled";
export type CancelActor = "student" | "admin";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingRow = {
  id: string;
  user_id: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: CancelActor | null;
}

export type SlotReservationRow = {
  booking_id: string;
  slot_date: string;
  slot_start: string;
  user_id: string;
  created_at: string;
}

export type JobClaimRow = {
  id: number;
  kind: string;
  ref_id: string;
  attempts: number;
}

export type JobsSummaryRow = {
  kind: string;
  status: string;
  total: number;
  last_error: string | null;
}

export type IntegrationRow = {
  provider: string;
  account_email: string | null;
  refresh_token_enc: string | null;
  scopes: string | null;
  connected_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: { id: string; email: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Update: { full_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: {
          id?: string;
          user_id: string;
          slot_date: string;
          slot_start: string;
          status?: BookingStatus;
          created_at?: string;
          cancelled_at?: string | null;
          cancelled_by?: CancelActor | null;
        };
        Update: {
          status?: BookingStatus;
          cancelled_at?: string | null;
          cancelled_by?: CancelActor | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_reservations: {
        Row: SlotReservationRow;
        Insert: { booking_id: string; slot_date: string; slot_start: string; user_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "slot_reservations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      book_slot: { Args: { p_date: string; p_start: string }; Returns: BookingRow };
      cancel_booking: { Args: { p_booking_id: string }; Returns: BookingRow };
      get_week_slots: {
        Args: { p_from: string; p_to: string };
        Returns: Array<{ slot_date: string; slot_start: string; mine: boolean }>;
      };
      admin_cancel_booking: { Args: { p_booking_id: string }; Returns: BookingRow };
      occupied_slots: {
        Args: { p_from: string; p_to: string };
        Returns: Array<{ slot_date: string; slot_start: string }>;
      };
      jobs_claim: { Args: { p_kinds: string[]; p_limit: number }; Returns: JobClaimRow[] };
      jobs_complete: { Args: { p_id: number }; Returns: undefined };
      jobs_fail: { Args: { p_id: number; p_error: string; p_max_attempts: number }; Returns: undefined };
      jobs_summary: { Args: Record<string, never>; Returns: JobsSummaryRow[] };
      jobs_retry_failed: { Args: Record<string, never>; Returns: number };
      jobs_enqueue: { Args: { p_kind: string; p_ref_id: string }; Returns: undefined };
      lease_acquire: { Args: { p_name: string; p_holder: string; p_seconds: number }; Returns: boolean };
      lease_release: { Args: { p_name: string; p_holder: string }; Returns: undefined };
      integration_get: { Args: { p_provider: string }; Returns: IntegrationRow[] };
      integration_save: {
        Args: { p_provider: string; p_account_email: string; p_refresh_token_enc: string; p_scopes: string };
        Returns: undefined;
      };
      integration_mark: { Args: { p_provider: string; p_ok: boolean; p_error: string | null }; Returns: undefined };
      integration_delete: { Args: { p_provider: string }; Returns: undefined };
      cron_configure: { Args: { p_url: string; p_secret: string }; Returns: undefined };
      booking_rules_snapshot: {
        Args: Record<string, never>;
        Returns: Array<{
          timezone: string;
          allowed_domain: string;
          first_slot_hour: number;
          last_slot_end_hour: number;
          slot_minutes: number;
          max_per_day: number;
          max_per_week: number;
          weeks_ahead: number;
        }>;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      cancel_actor: CancelActor;
    };
    CompositeTypes: Record<string, never>;
  };
};
