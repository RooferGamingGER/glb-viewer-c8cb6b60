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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      pv_material_reports: {
        Row: {
          created_at: string
          id: string
          material_id: string
          reason: string
          reported_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          reason: string
          reported_by: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          reason?: string
          reported_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_material_reports_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "pv_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_materials: {
        Row: {
          article_number: string | null
          category: string
          created_at: string
          created_by: string
          id: string
          manufacturer: string
          notes: string | null
          product_name: string
          unit: string
          updated_at: string
        }
        Insert: {
          article_number?: string | null
          category: string
          created_at?: string
          created_by: string
          id?: string
          manufacturer: string
          notes?: string | null
          product_name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          article_number?: string | null
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          manufacturer?: string
          notes?: string | null
          product_name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_measurements: {
        Row: {
          created_at: string
          id: string
          measurements: Json
          project_id: number
          project_name: string | null
          task_id: string
          task_name: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurements: Json
          project_id: number
          project_name?: string | null
          task_id: string
          task_name?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          measurements?: Json
          project_id?: number
          project_name?: string | null
          task_id?: string
          task_name?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      shared_views: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          file_name: string
          id: string
          measurements: Json
          project_id: number
          share_token: string
          task_id: string
          webodm_server_url: string
          webodm_token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          file_name: string
          id?: string
          measurements?: Json
          project_id: number
          share_token: string
          task_id: string
          webodm_server_url: string
          webodm_token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          measurements?: Json
          project_id?: number
          share_token?: string
          task_id?: string
          webodm_server_url?: string
          webodm_token?: string
        }
        Relationships: []
      }
      user_inverters: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          has_battery_input: boolean | null
          id: string
          inverter_key: string
          is_public: boolean | null
          manufacturer: string
          model: string
          nominal_power_ac: number
          phases: number
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          has_battery_input?: boolean | null
          id?: string
          inverter_key: string
          is_public?: boolean | null
          manufacturer: string
          model: string
          nominal_power_ac: number
          phases: number
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          has_battery_input?: boolean | null
          id?: string
          inverter_key?: string
          is_public?: boolean | null
          manufacturer?: string
          model?: string
          nominal_power_ac?: number
          phases?: number
        }
        Relationships: []
      }
      user_mounting_systems: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          manufacturer: string
          roof_type: string
          system_key: string
          system_name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          manufacturer: string
          roof_type: string
          system_key: string
          system_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          manufacturer?: string
          roof_type?: string
          system_key?: string
          system_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
