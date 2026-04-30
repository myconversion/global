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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: string | null
          entity: string
          entity_id: string | null
          entity_name: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: string | null
          entity: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_units: {
        Row: {
          address: string | null
          code: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          business_unit_id: string | null
          cnpj: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_unit_id?: string | null
          cnpj?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_unit_id?: string | null
          cnpj?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_conversations: {
        Row: {
          assigned_to: string | null
          business_unit_id: string | null
          channel: Database["public"]["Enums"]["comm_channel"]
          company_id: string
          contact_identifier: string
          contact_name: string
          created_at: string
          created_by: string | null
          id: string
          queue: string | null
          status: Database["public"]["Enums"]["comm_ticket_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_unit_id?: string | null
          channel?: Database["public"]["Enums"]["comm_channel"]
          company_id: string
          contact_identifier: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          queue?: string | null
          status?: Database["public"]["Enums"]["comm_ticket_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_unit_id?: string | null
          channel?: Database["public"]["Enums"]["comm_channel"]
          company_id?: string
          contact_identifier?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          queue?: string | null
          status?: Database["public"]["Enums"]["comm_ticket_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_conversations_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "communication_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          language: string
          locale: string
          logo_url: string | null
          monthly_sales_goal: number
          monthly_sales_goal_type: string
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          locale?: string
          logo_url?: string | null
          monthly_sales_goal?: number
          monthly_sales_goal_type?: string
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          locale?: string
          logo_url?: string | null
          monthly_sales_goal?: number
          monthly_sales_goal_type?: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_modules: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean
          module: Database["public"]["Enums"]["module_name"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          module: Database["public"]["Enums"]["module_name"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          module?: Database["public"]["Enums"]["module_name"]
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          company_id: string
          created_at: string
          date: string
          deal_id: string
          description: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          date?: string
          deal_id: string
          description?: string | null
          id?: string
          title: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          deal_id?: string
          description?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_automations: {
        Row: {
          body: string
          company_id: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          error_message: string | null
          id: string
          recipient_email: string | null
          recipient_phone: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["automation_status"]
          subject: string | null
          type: Database["public"]["Enums"]["automation_type"]
        }
        Insert: {
          body: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["automation_status"]
          subject?: string | null
          type: Database["public"]["Enums"]["automation_type"]
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["automation_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["automation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_automations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadence_settings: {
        Row: {
          cold_after_days: number
          company_id: string
          created_at: string
          id: string
          updated_at: string
          warm_after_days: number
        }
        Insert: {
          cold_after_days?: number
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
          warm_after_days?: number
        }
        Update: {
          cold_after_days?: number
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          warm_after_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadence_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["crm_campaign_channel"]
          company_id: string
          created_at: string
          created_by: string | null
          frequency_hours: number | null
          id: string
          name: string
          scheduled_at: string | null
          stats: Json | null
          status: Database["public"]["Enums"]["crm_campaign_status"]
          target_filters: Json | null
          template_body: string | null
          template_subject: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["crm_campaign_channel"]
          company_id: string
          created_at?: string
          created_by?: string | null
          frequency_hours?: number | null
          id?: string
          name: string
          scheduled_at?: string | null
          stats?: Json | null
          status?: Database["public"]["Enums"]["crm_campaign_status"]
          target_filters?: Json | null
          template_body?: string | null
          template_subject?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["crm_campaign_channel"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          frequency_hours?: number | null
          id?: string
          name?: string
          scheduled_at?: string | null
          stats?: Json | null
          status?: Database["public"]["Enums"]["crm_campaign_status"]
          target_filters?: Json | null
          template_body?: string | null
          template_subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          business_unit_id: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          last_interaction_at: string | null
          nome_fantasia: string | null
          phone: string | null
          razao_social: string
          responsible_id: string | null
          score: number
          segment: string | null
          size: Database["public"]["Enums"]["crm_company_size"] | null
          status: Database["public"]["Enums"]["crm_contact_status"] | null
          tags: string[] | null
          temperature: Database["public"]["Enums"]["crm_temperature"] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_unit_id?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          nome_fantasia?: string | null
          phone?: string | null
          razao_social: string
          responsible_id?: string | null
          score?: number
          segment?: string | null
          size?: Database["public"]["Enums"]["crm_company_size"] | null
          status?: Database["public"]["Enums"]["crm_contact_status"] | null
          tags?: string[] | null
          temperature?: Database["public"]["Enums"]["crm_temperature"] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_unit_id?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          nome_fantasia?: string | null
          phone?: string | null
          razao_social?: string
          responsible_id?: string | null
          score?: number
          segment?: string | null
          size?: Database["public"]["Enums"]["crm_company_size"] | null
          status?: Database["public"]["Enums"]["crm_contact_status"] | null
          tags?: string[] | null
          temperature?: Database["public"]["Enums"]["crm_temperature"] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_company: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          crm_company_id: string
          id: string
          role: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          crm_company_id: string
          id?: string
          role?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          crm_company_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_company_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_company_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          business_unit_id: string | null
          company_id: string
          cpf: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          last_interaction_at: string | null
          name: string
          origin: Database["public"]["Enums"]["crm_origin"] | null
          phone: string | null
          position: string | null
          responsible_id: string | null
          score: number
          status: Database["public"]["Enums"]["crm_contact_status"] | null
          tags: string[] | null
          temperature: Database["public"]["Enums"]["crm_temperature"] | null
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          name: string
          origin?: Database["public"]["Enums"]["crm_origin"] | null
          phone?: string | null
          position?: string | null
          responsible_id?: string | null
          score?: number
          status?: Database["public"]["Enums"]["crm_contact_status"] | null
          tags?: string[] | null
          temperature?: Database["public"]["Enums"]["crm_temperature"] | null
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          name?: string
          origin?: Database["public"]["Enums"]["crm_origin"] | null
          phone?: string | null
          position?: string | null
          responsible_id?: string | null
          score?: number
          status?: Database["public"]["Enums"]["crm_contact_status"] | null
          tags?: string[] | null
          temperature?: Database["public"]["Enums"]["crm_temperature"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_logs: {
        Row: {
          action_executed: string
          company_id: string
          contact_id: string | null
          created_at: string
          flow_id: string
          id: string
          result: string | null
        }
        Insert: {
          action_executed: string
          company_id: string
          contact_id?: string | null
          created_at?: string
          flow_id: string
          id?: string
          result?: string | null
        }
        Update: {
          action_executed?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string
          flow_id?: string
          id?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flows: {
        Row: {
          actions: Json | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json | null
          trigger_type: string
        }
        Insert: {
          actions?: Json | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json | null
          trigger_type: string
        }
        Update: {
          actions?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followups: {
        Row: {
          alert_minutes_before: number | null
          alert_type: Database["public"]["Enums"]["crm_alert_type"]
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          deal_id: string | null
          description: string | null
          id: string
          is_completed: boolean
          scheduled_at: string
          snoozed_to: string | null
          type: Database["public"]["Enums"]["crm_followup_type"]
        }
        Insert: {
          alert_minutes_before?: number | null
          alert_type?: Database["public"]["Enums"]["crm_alert_type"]
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          scheduled_at: string
          snoozed_to?: string | null
          type?: Database["public"]["Enums"]["crm_followup_type"]
        }
        Update: {
          alert_minutes_before?: number | null
          alert_type?: Database["public"]["Enums"]["crm_alert_type"]
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          scheduled_at?: string
          snoozed_to?: string | null
          type?: Database["public"]["Enums"]["crm_followup_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followups_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          crm_company_id: string | null
          deal_id: string | null
          description: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["crm_interaction_type"]
          user_id: string | null
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          crm_company_id?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          title: string
          type?: Database["public"]["Enums"]["crm_interaction_type"]
          user_id?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          crm_company_id?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["crm_interaction_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_deals: {
        Row: {
          business_unit_id: string | null
          company_id: string
          contact_id: string | null
          converted_project_id: string | null
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          entered_stage_at: string
          expected_close_date: string | null
          id: string
          loss_reason: string | null
          pipeline_id: string
          responsible_id: string | null
          stage_name: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          business_unit_id?: string | null
          company_id: string
          contact_id?: string | null
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          entered_stage_at?: string
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          pipeline_id: string
          responsible_id?: string | null
          stage_name: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          business_unit_id?: string | null
          company_id?: string
          contact_id?: string | null
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          entered_stage_at?: string
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          pipeline_id?: string
          responsible_id?: string | null
          stage_name?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_deals_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_deals_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          product_service: string | null
          stages: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          product_service?: string | null
          stages?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          product_service?: string | null
          stages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospecting_cadences: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          delay_days: number
          id: string
          pipeline_id: string
          step_order: number
          template_name: string
          template_script: string | null
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          delay_days?: number
          id?: string
          pipeline_id: string
          step_order: number
          template_name: string
          template_script?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          delay_days?: number
          id?: string
          pipeline_id?: string
          step_order?: number
          template_name?: string
          template_script?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_prospecting_cadences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_prospecting_cadences_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          company_id: string
          created_at: string
          entity_type: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          sort_order: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_type: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_type?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          company_id: string
          created_at: string
          hidden_widgets: string[]
          id: string
          updated_at: string
          user_id: string
          widget_order: string[]
        }
        Insert: {
          company_id: string
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          updated_at?: string
          user_id: string
          widget_order?: string[]
        }
        Update: {
          company_id?: string
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          updated_at?: string
          user_id?: string
          widget_order?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          business_unit_id: string | null
          client_id: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          owner_id: string | null
          probability: number
          source: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          business_unit_id?: string | null
          client_id?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          probability?: number
          source?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          business_unit_id?: string | null
          client_id?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          probability?: number
          source?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          business_unit_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department: string | null
          email: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          hire_date: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string
          salary: number | null
          user_id: string | null
        }
        Insert: {
          business_unit_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          hire_date?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role?: string
          salary?: number | null
          user_id?: string | null
        }
        Update: {
          business_unit_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          hire_date?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string
          salary?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          access_type: string
          company_id: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          access_type?: string
          company_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_user_access: {
        Row: {
          company_id: string
          created_at: string
          id: string
          integration_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          integration_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          integration_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_user_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_user_access_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_unit_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issued_at: string | null
          number: string
          status: Database["public"]["Enums"]["invoice_status"]
          transaction_id: string | null
          value: number
        }
        Insert: {
          business_unit_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issued_at?: string | null
          number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          transaction_id?: string | null
          value?: number
        }
        Update: {
          business_unit_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issued_at?: string | null
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          transaction_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_deliverables: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          labor_cost: number
          name: string
          owner_id: string | null
          revenue: number
          source_deal_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          supplies_cost: number
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          labor_cost?: number
          name: string
          owner_id?: string | null
          revenue?: number
          source_deal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          supplies_cost?: number
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          labor_cost?: number
          name?: string
          owner_id?: string | null
          revenue?: number
          source_deal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          supplies_cost?: number
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          business_unit_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          items: Json
          notes: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string
          total_value: number
        }
        Insert: {
          business_unit_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string
          total_value?: number
        }
        Update: {
          business_unit_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          business_unit_id: string | null
          category: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          business_unit_id?: string | null
          category?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          business_unit_id?: string | null
          category?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_deliverable_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          workspace_column_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_deliverable_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          workspace_column_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_deliverable_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          workspace_column_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_deliverable_id_fkey"
            columns: ["project_deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_column_id_fkey"
            columns: ["workspace_column_id"]
            isOneToOne: false
            referencedRelation: "workspace_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          business_unit_id: string | null
          category: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          due_date: string | null
          id: string
          project_id: string | null
          recurrence: Database["public"]["Enums"]["recurrence_frequency"]
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          value: number
        }
        Insert: {
          business_unit_id?: string | null
          category?: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_frequency"]
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          value?: number
        }
        Update: {
          business_unit_id?: string | null
          category?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_frequency"]
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_business_units: {
        Row: {
          business_unit_id: string
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_unit_id: string
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_unit_id?: string
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_business_units_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_business_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sector_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          company_id: string
          created_at: string
          id: string
          sector: Database["public"]["Enums"]["sector_enum"]
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_id: string
          created_at?: string
          id?: string
          sector: Database["public"]["Enums"]["sector_enum"]
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_id?: string
          created_at?: string
          id?: string
          sector?: Database["public"]["Enums"]["sector_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sector_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_columns: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "workspace_columns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_company_integrations: {
        Args: { _company_id: string }
        Returns: {
          access_type: string
          id: string
          is_active: boolean
          name: string
          type: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_type: "call" | "email" | "meeting" | "note" | "task"
      app_role: "super_admin" | "admin" | "collaborator"
      automation_status: "scheduled" | "sent" | "failed" | "cancelled"
      automation_type: "email" | "whatsapp"
      comm_channel: "whatsapp" | "email" | "instagram" | "facebook" | "telegram"
      comm_ticket_status: "open" | "waiting" | "resolved"
      crm_alert_type: "none" | "email" | "whatsapp" | "both"
      crm_campaign_channel: "email" | "whatsapp" | "both"
      crm_campaign_status: "draft" | "scheduled" | "sent"
      crm_company_size: "mei" | "small" | "medium" | "large"
      crm_contact_status: "lead" | "client"
      crm_followup_type:
        | "call"
        | "email"
        | "whatsapp"
        | "meeting"
        | "visit"
        | "proposal"
      crm_interaction_type:
        | "email"
        | "whatsapp"
        | "call"
        | "meeting"
        | "note"
        | "stage_change"
        | "followup"
      crm_origin:
        | "indicacao"
        | "inbound"
        | "outbound"
        | "social_media"
        | "evento"
        | "other"
        | "facebook"
        | "instagram"
        | "site"
        | "prospeccao_ativa"
        | "midia_offline"
        | "indicacao_gestor"
        | "parcerias"
        | "indicacao_cliente"
      crm_temperature: "cold" | "warm" | "hot"
      deal_stage:
        | "lead"
        | "contact"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      employment_type: "clt" | "pj" | "intern" | "freelancer"
      invoice_status: "draft" | "issued" | "cancelled"
      module_name:
        | "crm"
        | "projects"
        | "tasks"
        | "financial"
        | "fiscal"
        | "purchases"
        | "hr"
        | "communication"
        | "bi"
      project_status: "active" | "paused" | "completed" | "archived"
      purchase_order_status: "pending" | "approved" | "received" | "cancelled"
      recurrence_frequency: "none" | "weekly" | "monthly" | "yearly"
      sector_enum:
        | "crm"
        | "projects"
        | "tasks"
        | "financial"
        | "fiscal"
        | "purchases"
        | "hr"
        | "communication"
        | "bi"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done" | "blocked"
      transaction_status: "pending" | "paid" | "overdue" | "cancelled"
      transaction_type: "income" | "expense"
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
      activity_type: ["call", "email", "meeting", "note", "task"],
      app_role: ["super_admin", "admin", "collaborator"],
      automation_status: ["scheduled", "sent", "failed", "cancelled"],
      automation_type: ["email", "whatsapp"],
      comm_channel: ["whatsapp", "email", "instagram", "facebook", "telegram"],
      comm_ticket_status: ["open", "waiting", "resolved"],
      crm_alert_type: ["none", "email", "whatsapp", "both"],
      crm_campaign_channel: ["email", "whatsapp", "both"],
      crm_campaign_status: ["draft", "scheduled", "sent"],
      crm_company_size: ["mei", "small", "medium", "large"],
      crm_contact_status: ["lead", "client"],
      crm_followup_type: [
        "call",
        "email",
        "whatsapp",
        "meeting",
        "visit",
        "proposal",
      ],
      crm_interaction_type: [
        "email",
        "whatsapp",
        "call",
        "meeting",
        "note",
        "stage_change",
        "followup",
      ],
      crm_origin: [
        "indicacao",
        "inbound",
        "outbound",
        "social_media",
        "evento",
        "other",
        "facebook",
        "instagram",
        "site",
        "prospeccao_ativa",
        "midia_offline",
        "indicacao_gestor",
        "parcerias",
        "indicacao_cliente",
      ],
      crm_temperature: ["cold", "warm", "hot"],
      deal_stage: [
        "lead",
        "contact",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      employment_type: ["clt", "pj", "intern", "freelancer"],
      invoice_status: ["draft", "issued", "cancelled"],
      module_name: [
        "crm",
        "projects",
        "tasks",
        "financial",
        "fiscal",
        "purchases",
        "hr",
        "communication",
        "bi",
      ],
      project_status: ["active", "paused", "completed", "archived"],
      purchase_order_status: ["pending", "approved", "received", "cancelled"],
      recurrence_frequency: ["none", "weekly", "monthly", "yearly"],
      sector_enum: [
        "crm",
        "projects",
        "tasks",
        "financial",
        "fiscal",
        "purchases",
        "hr",
        "communication",
        "bi",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "done", "blocked"],
      transaction_status: ["pending", "paid", "overdue", "cancelled"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
