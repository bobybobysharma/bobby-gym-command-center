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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          check_in_at: string
          check_in_method: string
          checked_in_by: string | null
          gym_id: string
          id: string
          member_id: string
          notes: string | null
        }
        Insert: {
          check_in_at?: string
          check_in_method?: string
          checked_in_by?: string | null
          gym_id: string
          id?: string
          member_id: string
          notes?: string | null
        }
        Update: {
          check_in_at?: string
          check_in_method?: string
          checked_in_by?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_member_id_gym_id_fkey"
            columns: ["member_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "gym_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          gym_id: string | null
          id: number
          meta: Json
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          gym_id?: string | null
          id?: never
          meta?: Json
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          gym_id?: string | null
          id?: never
          meta?: Json
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      checkin_attempts: {
        Row: {
          created_at: string
          id: number
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          success: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      checkin_challenges: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          gym_id: string
          id: string
          token_hash: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          gym_id: string
          id?: string
          token_hash: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          gym_id?: string
          id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_challenges_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          gym_id: string
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["enquiry_kind"]
          member_id: string | null
          message: string | null
          phone: string | null
          plan_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          gym_id: string
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["enquiry_kind"]
          member_id?: string | null
          message?: string | null
          phone?: string | null
          plan_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          gym_id?: string
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["enquiry_kind"]
          member_id?: string | null
          message?: string | null
          phone?: string | null
          plan_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_plan_id_gym_id_fkey"
            columns: ["plan_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id", "gym_id"]
          },
        ]
      }
      facilities: {
        Row: {
          created_at: string
          description: string | null
          gym_id: string
          id: string
          image_url: string | null
          is_active: boolean
          is_demo: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          gym_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_demo?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          gym_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_demo?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "facilities_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_counters: {
        Row: {
          gym_id: string
          member_seq: number
        }
        Insert: {
          gym_id: string
          member_seq?: number
        }
        Update: {
          gym_id?: string
          member_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_counters_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_domains: {
        Row: {
          created_at: string
          gym_id: string
          hostname: string
          id: string
          status: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          gym_id: string
          hostname: string
          id?: string
          status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          gym_id?: string
          hostname?: string
          id?: string
          status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_domains_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_settings: {
        Row: {
          contact: Json
          content: Json
          enquiries_enabled: boolean
          favicon_url: string | null
          gallery: Json
          grace_days: number
          gym_id: string
          hero: Json
          logo_url: string | null
          opening_hours: Json
          payment_message: string
          reminder_days: number
          social: Json
          tagline: string | null
          theme: Json
          updated_at: string
        }
        Insert: {
          contact?: Json
          content?: Json
          enquiries_enabled?: boolean
          favicon_url?: string | null
          gallery?: Json
          grace_days?: number
          gym_id: string
          hero?: Json
          logo_url?: string | null
          opening_hours?: Json
          payment_message?: string
          reminder_days?: number
          social?: Json
          tagline?: string | null
          theme?: Json
          updated_at?: string
        }
        Update: {
          contact?: Json
          content?: Json
          enquiries_enabled?: boolean
          favicon_url?: string | null
          gallery?: Json
          grace_days?: number
          gym_id?: string
          hero?: Json
          logo_url?: string | null
          opening_hours?: Json
          payment_message?: string
          reminder_days?: number
          social?: Json
          tagline?: string | null
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_settings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          is_demo: boolean
          name: string
          slug: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_demo?: boolean
          name: string
          slug: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_demo?: boolean
          name?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      member_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_member_id_gym_id_fkey"
            columns: ["member_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "gym_id"]
          },
        ]
      }
      member_qr_passes: {
        Row: {
          created_at: string
          gym_id: string
          is_active: boolean
          member_id: string
          qr_token: string
          rotated_at: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          is_active?: boolean
          member_id: string
          qr_token?: string
          rotated_at?: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          is_active?: boolean
          member_id?: string
          qr_token?: string
          rotated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_qr_passes_member_id_gym_id_fkey"
            columns: ["member_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "gym_id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gym_id: string
          id: string
          is_demo: boolean
          joined_on: string
          member_code: string
          phone: string
          photo_url: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gym_id: string
          id?: string
          is_demo?: boolean
          joined_on?: string
          member_code: string
          phone: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gym_id?: string
          id?: string
          is_demo?: boolean
          joined_on?: string
          member_code?: string
          phone?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          benefits: string[]
          created_at: string
          description: string | null
          duration_months: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price_paise: number
          promo_label: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          benefits?: string[]
          created_at?: string
          description?: string | null
          duration_months: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price_paise: number
          promo_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          benefits?: string[]
          created_at?: string
          description?: string | null
          duration_months?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price_paise?: number
          promo_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          cancel_reason: string | null
          cancelled_on: string | null
          created_at: string
          created_by: string | null
          duration_months: number
          end_date: string
          fee_paise: number
          gym_id: string
          id: string
          is_demo: boolean
          member_id: string
          notes: string | null
          paused_on: string | null
          plan_id: string | null
          plan_name: string
          renewed_from: string | null
          start_date: string
          state: Database["public"]["Enums"]["membership_state"]
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_on?: string | null
          created_at?: string
          created_by?: string | null
          duration_months: number
          end_date: string
          fee_paise: number
          gym_id: string
          id?: string
          is_demo?: boolean
          member_id: string
          notes?: string | null
          paused_on?: string | null
          plan_id?: string | null
          plan_name: string
          renewed_from?: string | null
          start_date: string
          state?: Database["public"]["Enums"]["membership_state"]
        }
        Update: {
          cancel_reason?: string | null
          cancelled_on?: string | null
          created_at?: string
          created_by?: string | null
          duration_months?: number
          end_date?: string
          fee_paise?: number
          gym_id?: string
          id?: string
          is_demo?: boolean
          member_id?: string
          notes?: string | null
          paused_on?: string | null
          plan_id?: string | null
          plan_name?: string
          renewed_from?: string | null
          start_date?: string
          state?: Database["public"]["Enums"]["membership_state"]
        }
        Relationships: [
          {
            foreignKeyName: "memberships_member_id_gym_id_fkey"
            columns: ["member_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "gym_id"]
          },
          {
            foreignKeyName: "memberships_plan_id_gym_id_fkey"
            columns: ["plan_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id", "gym_id"]
          },
          {
            foreignKeyName: "memberships_renewed_from_fkey"
            columns: ["renewed_from"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          member_id: string
          membership_id: string | null
          paid_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_number: string
          reference_note: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          created_by?: string | null
          gym_id: string
          id?: string
          member_id: string
          membership_id?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_number: string
          reference_note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          created_by?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          membership_id?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_number?: string
          reference_note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_gym_id_fkey"
            columns: ["member_id", "gym_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id", "gym_id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          created_at: string
          gym_id: string
          id: string
          is_active: boolean
          is_demo: boolean
          quote: string
          rating: number | null
          sort_order: number
        }
        Insert: {
          author_name: string
          created_at?: string
          gym_id: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          quote: string
          rating?: number | null
          sort_order?: number
        }
        Update: {
          author_name?: string
          created_at?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          quote?: string
          rating?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          gym_id: string
          id: string
          image_url: string | null
          is_active: boolean
          is_demo: boolean
          name: string
          sort_order: number
          specialty: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          gym_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_demo?: boolean
          name: string
          sort_order?: number
          specialty?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          gym_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_demo?: boolean
          name?: string
          sort_order?: number
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          gym_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_gym: { Args: { _gym: string }; Returns: boolean }
      change_membership_state: {
        Args: { _action: string; _id: string; _reason?: string }
        Returns: undefined
      }
      claim_member_account: { Args: never; Returns: number }
      clear_demo_members: { Args: { _gym: string }; Returns: undefined }
      convert_enquiry: {
        Args: { _enquiry: string; _plan?: string; _start?: string }
        Returns: string
      }
      default_gym_id: { Args: never; Returns: string }
      gym_today: { Args: { _gym: string }; Returns: string }
      has_gym_role: {
        Args: {
          _gym: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_gym_owner: { Args: { _gym: string }; Returns: boolean }
      is_gym_staff: { Args: { _gym: string }; Returns: boolean }
      issue_checkin_challenge: { Args: { _gym: string }; Returns: Json }
      load_demo_members: { Args: { _gym: string }; Returns: number }
      member_check_in: {
        Args: { _code?: string; _token?: string }
        Returns: Json
      }
      my_access: {
        Args: never
        Returns: {
          gym_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      record_manual_check_in: {
        Args: { _gym: string; _member: string; _notes?: string }
        Returns: Json
      }
      record_qr_check_in: {
        Args: { _gym: string; _qr_token: string }
        Returns: Json
      }
      renew_membership: {
        Args: { _member: string; _plan: string; _start?: string }
        Returns: string
      }
      resolve_gym_by_host: { Args: { _host: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "owner"
        | "receptionist"
        | "trainer"
        | "member"
      enquiry_kind: "join" | "contact" | "renewal"
      enquiry_status:
        | "new"
        | "contacted"
        | "approved"
        | "rejected"
        | "converted"
      member_status: "active" | "inactive" | "archived"
      membership_state: "active" | "paused" | "cancelled"
      payment_method: "cash" | "upi" | "bank_transfer" | "other"
      payment_status: "completed" | "pending" | "failed" | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "platform_admin",
        "owner",
        "receptionist",
        "trainer",
        "member",
      ],
      enquiry_kind: ["join", "contact", "renewal"],
      enquiry_status: ["new", "contacted", "approved", "rejected", "converted"],
      member_status: ["active", "inactive", "archived"],
      membership_state: ["active", "paused", "cancelled"],
      payment_method: ["cash", "upi", "bank_transfer", "other"],
      payment_status: ["completed", "pending", "failed", "refunded"],
    },
  },
} as const
