export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          password: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          password: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          password?: string
          username?: string
        }
        Relationships: []
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          name: string
          price: number
          quantity: number
          total: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          name: string
          price: number
          quantity: number
          total: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          name?: string
          price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          cash_amount: number | null
          created_at: string
          customer_id: string | null
          discount: number
          discount_type: string
          discount_value: number
          id: string
          is_split_payment: boolean | null
          loyalty_points_earned: number
          loyalty_points_used: number
          payment_method: string
          subtotal: number
          total: number
          upi_amount: number | null
        }
        Insert: {
          cash_amount?: number | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          is_split_payment?: boolean | null
          loyalty_points_earned?: number
          loyalty_points_used?: number
          payment_method: string
          subtotal: number
          total: number
          upi_amount?: number | null
        }
        Update: {
          cash_amount?: number | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          is_split_payment?: boolean | null
          loyalty_points_earned?: number
          loyalty_points_used?: number
          payment_method?: string
          subtotal?: number
          total?: number
          upi_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_views: {
        Row: {
          access_code: string
          booking_id: string
          created_at: string
          id: string
          last_accessed_at: string | null
        }
        Insert: {
          access_code: string
          booking_id: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
        }
        Update: {
          access_code?: string
          booking_id?: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_views_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_group_id: string | null
          coupon_code: string | null
          created_at: string
          customer_id: string
          discount_percentage: number | null
          duration: number
          end_time: string
          final_price: number | null
          id: string
          notes: string | null
          original_price: number | null
          start_time: string
          station_id: string
          status: string
          status_updated_at: string | null
          status_updated_by: string | null
        }
        Insert: {
          booking_date: string
          booking_group_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_id: string
          discount_percentage?: number | null
          duration: number
          end_time: string
          final_price?: number | null
          id?: string
          notes?: string | null
          original_price?: number | null
          start_time: string
          station_id: string
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
        }
        Update: {
          booking_date?: string
          booking_group_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_id?: string
          discount_percentage?: number | null
          duration?: number
          end_time?: string
          final_price?: number | null
          id?: string
          notes?: string | null
          original_price?: number | null
          start_time?: string
          station_id?: string
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customer_users: {
        Row: {
          auth_id: string | null
          created_at: string | null
          customer_id: string | null
          email: string
          id: string
          pin: string | null
          referral_code: string | null
          reset_pin: string | null
          reset_pin_expiry: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          email: string
          id?: string
          pin?: string | null
          referral_code?: string | null
          reset_pin?: string | null
          reset_pin_expiry?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          email?: string
          id?: string
          pin?: string | null
          referral_code?: string | null
          reset_pin?: string | null
          reset_pin_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_member: boolean
          loyalty_points: number
          membership_duration: string | null
          membership_expiry_date: string | null
          membership_hours_left: number | null
          membership_plan: string | null
          membership_seconds_left: number | null
          membership_start_date: string | null
          name: string
          phone: string
          total_play_time: number
          total_spent: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_member?: boolean
          loyalty_points?: number
          membership_duration?: string | null
          membership_expiry_date?: string | null
          membership_hours_left?: number | null
          membership_plan?: string | null
          membership_seconds_left?: number | null
          membership_start_date?: string | null
          name: string
          phone: string
          total_play_time?: number
          total_spent?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_member?: boolean
          loyalty_points?: number
          membership_duration?: string | null
          membership_expiry_date?: string | null
          membership_hours_left?: number | null
          membership_plan?: string | null
          membership_seconds_left?: number | null
          membership_start_date?: string | null
          name?: string
          phone?: string
          total_play_time?: number
          total_spent?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          frequency: string
          id: string
          is_recurring: boolean
          name: string
          notes: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          frequency: string
          id: string
          is_recurring?: boolean
          name: string
          notes?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          frequency?: string
          id?: string
          is_recurring?: boolean
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          points: number
          source: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          points: number
          source: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          points?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          buying_price: number | null
          category: string
          created_at: string
          duration: string | null
          id: string
          image: string | null
          membership_hours: number | null
          name: string
          offer_price: number | null
          original_price: number | null
          price: number
          profit: number | null
          selling_price: number | null
          stock: number
          student_price: number | null
        }
        Insert: {
          buying_price?: number | null
          category: string
          created_at?: string
          duration?: string | null
          id?: string
          image?: string | null
          membership_hours?: number | null
          name: string
          offer_price?: number | null
          original_price?: number | null
          price: number
          profit?: number | null
          selling_price?: number | null
          stock: number
          student_price?: number | null
        }
        Update: {
          buying_price?: number | null
          category?: string
          created_at?: string
          duration?: string | null
          id?: string
          image?: string | null
          membership_hours?: number | null
          name?: string
          offer_price?: number | null
          original_price?: number | null
          price?: number
          profit?: number | null
          selling_price?: number | null
          stock?: number
          student_price?: number | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          points_awarded: number | null
          referred_email: string
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          referred_email: string
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          referred_email?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          points_spent: number
          redeemed_at: string | null
          redemption_code: string
          reward_id: string
          staff_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          points_spent: number
          redeemed_at?: string | null
          redemption_code: string
          reward_id: string
          staff_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          points_spent?: number
          redeemed_at?: string | null
          redemption_code?: string
          reward_id?: string
          staff_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_customer_id_fkey_new"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          customer_id: string | null
          duration: number | null
          end_time: string | null
          id: string
          is_paused: boolean | null
          notes: string | null
          paused_at: string | null
          price: number | null
          start_time: string
          station_id: string
          status: string | null
          total_paused_time: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          is_paused?: boolean | null
          notes?: string | null
          paused_at?: string | null
          price?: number | null
          start_time?: string
          station_id: string
          status?: string | null
          total_paused_time?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          is_paused?: boolean | null
          notes?: string | null
          paused_at?: string | null
          price?: number | null
          start_time?: string
          station_id?: string
          status?: string | null
          total_paused_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          consolidated_name: string | null
          created_at: string
          hourly_rate: number
          id: string
          is_controller: boolean | null
          is_occupied: boolean
          name: string
          parent_station_id: string | null
          type: string
        }
        Insert: {
          consolidated_name?: string | null
          created_at?: string
          hourly_rate: number
          id?: string
          is_controller?: boolean | null
          is_occupied?: boolean
          name: string
          parent_station_id?: string | null
          type: string
        }
        Update: {
          consolidated_name?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          is_controller?: boolean | null
          is_occupied?: boolean
          name?: string
          parent_station_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_parent_station_id_fkey"
            columns: ["parent_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_public_registrations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          entry_fee: number | null
          id: string
          registration_date: string
          registration_source: string | null
          status: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          entry_fee?: number | null
          id?: string
          registration_date?: string
          registration_source?: string | null
          status?: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          entry_fee?: number | null
          id?: string
          registration_date?: string
          registration_source?: string | null
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_public_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_public_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          entry_fee: number | null
          id: string
          registration_date: string | null
          registration_source: string | null
          status: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          entry_fee?: number | null
          id?: string
          registration_date?: string | null
          registration_source?: string | null
          status?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          entry_fee?: number | null
          id?: string
          registration_date?: string | null
          registration_source?: string | null
          status?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          budget: number | null
          created_at: string
          date: string
          game_title: string | null
          game_type: string
          game_variant: string | null
          id: string
          matches: Json
          name: string
          players: Json
          runner_up_prize: number | null
          status: string
          updated_at: string | null
          winner: Json | null
          winner_prize: number | null
        }
        Insert: {
          budget?: number | null
          created_at?: string
          date: string
          game_title?: string | null
          game_type: string
          game_variant?: string | null
          id?: string
          matches?: Json
          name: string
          players?: Json
          runner_up_prize?: number | null
          status: string
          updated_at?: string | null
          winner?: Json | null
          winner_prize?: number | null
        }
        Update: {
          budget?: number | null
          created_at?: string
          date?: string
          game_title?: string | null
          game_type?: string
          game_variant?: string | null
          id?: string
          matches?: Json
          name?: string
          players?: Json
          runner_up_prize?: number | null
          status?: string
          updated_at?: string | null
          winner?: Json | null
          winner_prize?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      tournament_stats: {
        Row: {
          budget: number | null
          date: string | null
          game_title: string | null
          game_type: string | null
          game_variant: string | null
          id: string | null
          matches: Json | null
          max_players: number | null
          name: string | null
          players: Json | null
          runner_up_prize: number | null
          status: string | null
          total_registrations: number | null
          winner: Json | null
          winner_prize: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_stations_availability: {
        Args: {
          p_date: string
          p_start_time: string
          p_end_time: string
          p_station_ids: string[]
        }
        Returns: {
          station_id: string
          is_available: boolean
        }[]
      }
      generate_booking_access_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_slots: {
        Args: { p_date: string; p_station_id: string; p_slot_duration?: number }
        Returns: {
          start_time: string
          end_time: string
          is_available: boolean
        }[]
      }
      save_bill_edit_audit: {
        Args: { p_bill_id: string; p_editor_name: string; p_changes: string }
        Returns: undefined
      }
      update_missed_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
