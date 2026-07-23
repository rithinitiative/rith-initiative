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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_form_fields: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          options: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "blog_post_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_form_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          responses: Json
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          responses?: Json
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          responses?: Json
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "blog_post_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          post_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          post_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          post_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_forms_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_archived: boolean
          is_published: boolean
          project_display_order: number
          project_slug: string | null
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          project_display_order?: number
          project_slug?: string | null
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          project_display_order?: number
          project_slug?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          email: string
          id: string
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      nav_items: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_published: boolean
          label: string
          opens_new_tab: boolean
          parent_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          label: string
          opens_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          label?: string
          opens_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nav_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nav_items"
            referencedColumns: ["id"]
          },
        ]
      }
      event_programs: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          event_id: string
          id: string
          is_published: boolean
          poster_url: string | null
          registration_enabled: boolean
          registration_mode: string
          registration_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          event_id: string
          id?: string
          is_published?: boolean
          poster_url?: string | null
          registration_enabled?: boolean
          registration_mode?: string
          registration_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          event_id?: string
          id?: string
          is_published?: boolean
          poster_url?: string | null
          registration_enabled?: boolean
          registration_mode?: string
          registration_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_programs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          adults: number
          created_at: string
          email: string
          event_id: string
          id: string
          minors: number
          name: string
          notes: string | null
          phone: string | null
          program_id: string
        }
        Insert: {
          adults?: number
          created_at?: string
          email: string
          event_id: string
          id?: string
          minors?: number
          name: string
          notes?: string | null
          phone?: string | null
          program_id: string
        }
        Update: {
          adults?: number
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          minors?: number
          name?: string
          notes?: string | null
          phone?: string | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "event_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          featured_image_url: string | null
          id: string
          is_archived: boolean
          is_project: boolean
          location: string | null
          project_content: string | null
          project_display_order: number
          project_featured_image_url: string | null
          project_is_published: boolean
          project_slug: string | null
          project_summary: string | null
          registration_link: string | null
          start_date: string
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          featured_image_url?: string | null
          id?: string
          is_archived?: boolean
          is_project?: boolean
          location?: string | null
          project_content?: string | null
          project_display_order?: number
          project_featured_image_url?: string | null
          project_is_published?: boolean
          project_slug?: string | null
          project_summary?: string | null
          registration_link?: string | null
          start_date: string
          time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          featured_image_url?: string | null
          id?: string
          is_archived?: boolean
          is_project?: boolean
          location?: string | null
          project_content?: string | null
          project_display_order?: number
          project_featured_image_url?: string | null
          project_is_published?: boolean
          project_slug?: string | null
          project_summary?: string | null
          registration_link?: string | null
          start_date?: string
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          entity_id: string
          entity_type: string
          id: string
          media_type: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          entity_id: string
          entity_type: string
          id?: string
          media_type: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          media_type?: string
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_interviews: {
        Row: {
          audio_url: string | null
          category: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          interviewee_description: string | null
          interviewee_name: string | null
          is_published: boolean
          portrait_url: string | null
          project_id: string
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          interviewee_description?: string | null
          interviewee_name?: string | null
          is_published?: boolean
          portrait_url?: string | null
          project_id: string
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          interviewee_description?: string | null
          interviewee_name?: string | null
          is_published?: boolean
          portrait_url?: string | null
          project_id?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_interviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subsection_tiers: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          subsection_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          subsection_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          subsection_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_subsection_tiers_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "project_subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subsections: {
        Row: {
          anchor_slug: string | null
          body: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_published: boolean
          payment_note: string | null
          payment_paypal_button_id: string | null
          payment_zelle_qr_url: string | null
          project_id: string
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          anchor_slug?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          payment_note?: string | null
          payment_paypal_button_id?: string | null
          payment_zelle_qr_url?: string | null
          project_id: string
          section_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          anchor_slug?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          payment_note?: string | null
          payment_paypal_button_id?: string | null
          payment_zelle_qr_url?: string | null
          project_id?: string
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_subsections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_archived: boolean
          is_published: boolean
          price: number
          purchase_link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          is_published?: boolean
          price: number
          purchase_link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          is_published?: boolean
          price?: number
          purchase_link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          section_key: string
          title: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          section_key: string
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          section_key?: string
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      site_gallery: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          section_key: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          section_key: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          section_key?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_gallery_section_key_fkey"
            columns: ["section_key"]
            isOneToOne: false
            referencedRelation: "site_content"
            referencedColumns: ["section_key"]
          },
        ]
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          name: string
          photo_url: string | null
          role: string | null
          section: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name: string
          photo_url?: string | null
          role?: string | null
          section: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name?: string
          photo_url?: string | null
          role?: string | null
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      updates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_published: boolean
          media_type: string | null
          media_url: string | null
          published_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          media_type?: string | null
          media_url?: string | null
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          media_type?: string | null
          media_url?: string | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: { Args: { _email: string }; Returns: Json }
      get_all_admins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string | null
          user_id: string
        }[]
      }
      get_admin_invitations: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          invited_by_email: string | null
        }[]
      }
      get_program_availability: {
        Args: { p_program_ids: string[] }
        Returns: {
          program_id: string
          registered: number
          capacity: number | null
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      remove_email_subscriber: { Args: { _subscriber_id: string }; Returns: Json }
      remove_admin_by_email: { Args: { _email: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
    Enums: {
      app_role: ["admin", "moderator"],
    },
  },
} as const
