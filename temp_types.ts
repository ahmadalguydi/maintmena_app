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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      binding_terms: {
        Row: {
          access_hours: string | null
          cleanup_disposal: boolean | null
          completion_date: string | null
          contract_id: string
          created_at: string | null
          custom_terms: Json | null
          id: string
          materials_by: string | null
          payment_schedule: Json
          penalty_rate_per_day: number | null
          start_date: string | null
          updated_at: string | null
          use_deposit_escrow: boolean | null
          warranty_days: number | null
        }
        Insert: {
          access_hours?: string | null
          cleanup_disposal?: boolean | null
          completion_date?: string | null
          contract_id: string
          created_at?: string | null
          custom_terms?: Json | null
          id?: string
          materials_by?: string | null
          payment_schedule?: Json
          penalty_rate_per_day?: number | null
          start_date?: string | null
          updated_at?: string | null
          use_deposit_escrow?: boolean | null
          warranty_days?: number | null
        }
        Update: {
          access_hours?: string | null
          cleanup_disposal?: boolean | null
          completion_date?: string | null
          contract_id?: string
          created_at?: string | null
          custom_terms?: Json | null
          id?: string
          materials_by?: string | null
          payment_schedule?: Json
          penalty_rate_per_day?: number | null
          start_date?: string | null
          updated_at?: string | null
          use_deposit_escrow?: boolean | null
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "binding_terms_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_avatar: string | null
          author_name: string
          author_name_ar: string | null
          category: string
          category_ar: string | null
          content: string
          content_ar: string | null
          created_at: string
          excerpt: string
          excerpt_ar: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_description_ar: string | null
          meta_keywords: string[] | null
          meta_keywords_ar: string[] | null
          published: boolean | null
          published_at: string | null
          reading_time: number | null
          slug: string
          tags: string[] | null
          tags_ar: string[] | null
          title: string
          title_ar: string | null
          updated_at: string
          views: number | null
        }
        Insert: {
          author_avatar?: string | null
          author_name: string
          author_name_ar?: string | null
          category: string
          category_ar?: string | null
          content: string
          content_ar?: string | null
          created_at?: string
          excerpt: string
          excerpt_ar?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_description_ar?: string | null
          meta_keywords?: string[] | null
          meta_keywords_ar?: string[] | null
          published?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          slug: string
          tags?: string[] | null
          tags_ar?: string[] | null
          title: string
          title_ar?: string | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string
          author_name_ar?: string | null
          category?: string
          category_ar?: string | null
          content?: string
          content_ar?: string | null
          created_at?: string
          excerpt?: string
          excerpt_ar?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_description_ar?: string | null
          meta_keywords?: string[] | null
          meta_keywords_ar?: string[] | null
          published?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          tags?: string[] | null
          tags_ar?: string[] | null
          title?: string
          title_ar?: string | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_name: string
          blocks_ar: Json | null
          blocks_en: Json | null
          category: string
          content_ar: string | null
          content_en: string
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string
          featured_image_url: string | null
          id: string
          published_at: string
          reading_time_minutes: number | null
          scheduled_at: string | null
          seo_description_ar: string | null
          seo_description_en: string | null
          seo_keywords: string | null
          seo_title_ar: string | null
          seo_title_en: string | null
          slug: string
          status: string
          tags: string[] | null
          title_ar: string | null
          title_en: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_name?: string
          blocks_ar?: Json | null
          blocks_en?: Json | null
          category: string
          content_ar?: string | null
          content_en: string
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en: string
          featured_image_url?: string | null
          id?: string
          published_at?: string
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          seo_description_ar?: string | null
          seo_description_en?: string | null
          seo_keywords?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title_ar?: string | null
          title_en: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_name?: string
          blocks_ar?: Json | null
          blocks_en?: Json | null
          category?: string
          content_ar?: string | null
          content_en?: string
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string
          featured_image_url?: string | null
          id?: string
          published_at?: string
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          seo_description_ar?: string | null
          seo_description_en?: string | null
          seo_keywords?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title_ar?: string | null
          title_en?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          auto_closed: boolean | null
          before_photos: Json | null
          budget_range: string | null
          buyer_approved_resolution: boolean | null
          buyer_completion_date: string | null
          buyer_counter_proposal: Json | null
          buyer_id: string
          buyer_last_seen_stage: number | null
          buyer_marked_complete: boolean | null
          cancellation_reason: string | null
          completed_at: string | null
          completion_photos: Json | null
          created_at: string | null
          deposit_amount: number | null
          final_agreed_price: number | null
          final_amount: number | null
          halted: boolean | null
          halted_at: string | null
          halted_reason: string | null
          id: string
          invoice_id: string | null
          job_description: string
          last_nudge_at: string | null
          location_address: string | null
          location_city: string | null
          location_country: string | null
          nudge_count: number | null
          original_price: number | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          photos: string[] | null
          preferred_time_slot: string | null
          price_negotiated_at: string | null
          proposed_end_date: string | null
          proposed_start_date: string | null
          request_type: string
          requires_deposit: boolean | null
          resolved_at: string | null
          responded_at: string | null
          seller_approved_resolution: boolean | null
          seller_completion_date: string | null
          seller_counter_proposal: Json | null
          seller_id: string
          seller_last_seen_stage: number | null
          seller_marked_complete: boolean | null
          seller_on_way_at: string | null
          seller_response: string | null
          service_category: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
          version: number | null
          warranty_activated_at: string | null
          warranty_claim_reason: string | null
          warranty_claimed: boolean | null
          warranty_expires_at: string | null
          work_started_at: string | null
        }
        Insert: {
          auto_closed?: boolean | null
          before_photos?: Json | null
          budget_range?: string | null
          buyer_approved_resolution?: boolean | null
          buyer_completion_date?: string | null
          buyer_counter_proposal?: Json | null
          buyer_id: string
          buyer_last_seen_stage?: number | null
          buyer_marked_complete?: boolean | null
          cancellation_reason?: string | null
          completed_at?: string | null
          completion_photos?: Json | null
          created_at?: string | null
          deposit_amount?: number | null
          final_agreed_price?: number | null
          final_amount?: number | null
          halted?: boolean | null
          halted_at?: string | null
          halted_reason?: string | null
          id?: string
          invoice_id?: string | null
          job_description: string
          last_nudge_at?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          nudge_count?: number | null
          original_price?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          photos?: string[] | null
          preferred_time_slot?: string | null
          price_negotiated_at?: string | null
          proposed_end_date?: string | null
          proposed_start_date?: string | null
          request_type?: string
          requires_deposit?: boolean | null
          resolved_at?: string | null
          responded_at?: string | null
          seller_approved_resolution?: boolean | null
          seller_completion_date?: string | null
          seller_counter_proposal?: Json | null
          seller_id: string
          seller_last_seen_stage?: number | null
          seller_marked_complete?: boolean | null
          seller_on_way_at?: string | null
          seller_response?: string | null
          service_category?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          version?: number | null
          warranty_activated_at?: string | null
          warranty_claim_reason?: string | null
          warranty_claimed?: boolean | null
          warranty_expires_at?: string | null
          work_started_at?: string | null
        }
        Update: {
          auto_closed?: boolean | null
          before_photos?: Json | null
          budget_range?: string | null
          buyer_approved_resolution?: boolean | null
          buyer_completion_date?: string | null
          buyer_counter_proposal?: Json | null
          buyer_id?: string
          buyer_last_seen_stage?: number | null
          buyer_marked_complete?: boolean | null
          cancellation_reason?: string | null
          completed_at?: string | null
          completion_photos?: Json | null
          created_at?: string | null
          deposit_amount?: number | null
          final_agreed_price?: number | null
          final_amount?: number | null
          halted?: boolean | null
          halted_at?: string | null
          halted_reason?: string | null
          id?: string
          invoice_id?: string | null
          job_description?: string
          last_nudge_at?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          nudge_count?: number | null
          original_price?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          photos?: string[] | null
          preferred_time_slot?: string | null
          price_negotiated_at?: string | null
          proposed_end_date?: string | null
          proposed_start_date?: string | null
          request_type?: string
          requires_deposit?: boolean | null
          resolved_at?: string | null
          responded_at?: string | null
          seller_approved_resolution?: boolean | null
          seller_completion_date?: string | null
          seller_counter_proposal?: Json | null
          seller_id?: string
          seller_last_seen_stage?: number | null
          seller_marked_complete?: boolean | null
          seller_on_way_at?: string | null
          seller_response?: string | null
          service_category?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          version?: number | null
          warranty_activated_at?: string | null
          warranty_claim_reason?: string | null
          warranty_claimed?: boolean | null
          warranty_expires_at?: string | null
          work_started_at?: string | null
        }
        Relationships: []
      }
      brief_signals: {
        Row: {
          brief_id: string
          created_at: string | null
          id: string
          signal_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string | null
          id?: string
          signal_id: string
        }
        Update: {
          brief_id?: string
          created_at?: string | null
          id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_signals_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_tenders: {
        Row: {
          brief_id: string
          created_at: string | null
          id: string
          tender_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string | null
          id?: string
          tender_id: string
        }
        Update: {
          brief_id?: string
          created_at?: string | null
          id?: string
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_tenders_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_tenders_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          publication_date: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          publication_date?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          publication_date?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          location: string | null
          metadata: Json | null
          related_content_id: string | null
          related_content_type: string | null
          reminder_sent: boolean | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          location?: string | null
          metadata?: Json | null
          related_content_id?: string | null
          related_content_type?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          metadata?: Json | null
          related_content_id?: string | null
          related_content_type?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_form_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_amendments: {
        Row: {
          amendment_number: number
          cost_delta: number | null
          created_at: string | null
          executed_at: string | null
          html_snapshot: string | null
          id: string
          parent_contract_id: string
          pdf_url: string | null
          scope_delta: string | null
          signed_at_buyer: string | null
          signed_at_seller: string | null
          status: string
          time_delta: number | null
          updated_at: string | null
          version: number
        }
        Insert: {
          amendment_number: number
          cost_delta?: number | null
          created_at?: string | null
          executed_at?: string | null
          html_snapshot?: string | null
          id?: string
          parent_contract_id: string
          pdf_url?: string | null
          scope_delta?: string | null
          signed_at_buyer?: string | null
          signed_at_seller?: string | null
          status?: string
          time_delta?: number | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          amendment_number?: number
          cost_delta?: number | null
          created_at?: string | null
          executed_at?: string | null
          html_snapshot?: string | null
          id?: string
          parent_contract_id?: string
          pdf_url?: string | null
          scope_delta?: string | null
          signed_at_buyer?: string | null
          signed_at_seller?: string | null
          status?: string
          time_delta?: number | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_clauses: {
        Row: {
          category: string
          clause_key: string
          conditions: Json | null
          content_ar: string
          content_en: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          service_tags: string[] | null
          title_ar: string
          title_en: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          category: string
          clause_key: string
          conditions?: Json | null
          content_ar: string
          content_en: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          service_tags?: string[] | null
          title_ar: string
          title_en: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string
          clause_key?: string
          conditions?: Json | null
          content_ar?: string
          content_en?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          service_tags?: string[] | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          contract_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          signature_hash: string
          signature_method: string
          signed_at: string | null
          user_agent: string | null
          user_id: string
          version: number
        }
        Insert: {
          contract_id: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          signature_hash: string
          signature_method: string
          signed_at?: string | null
          user_agent?: string | null
          user_id: string
          version: number
        }
        Update: {
          contract_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          signature_hash?: string
          signature_method?: string
          signed_at?: string | null
          user_agent?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_versions: {
        Row: {
          binding_terms_snapshot: Json
          change_summary: string | null
          changed_by: string | null
          changes_diff: Json | null
          content_hash: string
          contract_id: string
          created_at: string | null
          html_snapshot: string
          id: string
          version: number
        }
        Insert: {
          binding_terms_snapshot: Json
          change_summary?: string | null
          changed_by?: string | null
          changes_diff?: Json | null
          content_hash: string
          contract_id: string
          created_at?: string | null
          html_snapshot: string
          id?: string
          version: number
        }
        Update: {
          binding_terms_snapshot?: Json
          change_summary?: string | null
          changed_by?: string | null
          changes_diff?: Json | null
          content_hash?: string
          contract_id?: string
          created_at?: string | null
          html_snapshot?: string
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          booking_id: string | null
          buyer_accepted_version: number | null
          buyer_id: string
          content_hash: string | null
          content_hash_verified: boolean | null
          created_at: string | null
          edit_notes: string | null
          executed_at: string | null
          html_snapshot: string | null
          id: string
          language_mode: string
          last_edited_by: string | null
          metadata: Json | null
          pdf_url: string | null
          proposed_edits: Json | null
          quote_id: string | null
          request_id: string | null
          seller_accepted_version: number | null
          seller_id: string
          signed_at_buyer: string | null
          signed_at_seller: string | null
          status: string
          updated_at: string | null
          version: number
        }
        Insert: {
          booking_id?: string | null
          buyer_accepted_version?: number | null
          buyer_id: string
          content_hash?: string | null
          content_hash_verified?: boolean | null
          created_at?: string | null
          edit_notes?: string | null
          executed_at?: string | null
          html_snapshot?: string | null
          id?: string
          language_mode?: string
          last_edited_by?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          proposed_edits?: Json | null
          quote_id?: string | null
          request_id?: string | null
          seller_accepted_version?: number | null
          seller_id: string
          signed_at_buyer?: string | null
          signed_at_seller?: string | null
          status?: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          booking_id?: string | null
          buyer_accepted_version?: number | null
          buyer_id?: string
          content_hash?: string | null
          content_hash_verified?: boolean | null
          created_at?: string | null
          edit_notes?: string | null
          executed_at?: string | null
          html_snapshot?: string | null
          id?: string
          language_mode?: string
          last_edited_by?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          proposed_edits?: Json | null
          quote_id?: string | null
          request_id?: string | null
          seller_accepted_version?: number | null
          seller_id?: string
          signed_at_buyer?: string | null
          signed_at_seller?: string | null
          status?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string | null
          details: string | null
          dispute_type: string
          id: string
          job_id: string
          job_type: string
          preferred_resolution: string | null
          reporter_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string | null
          details?: string | null
          dispute_type: string
          id?: string
          job_id: string
          job_type: string
          preferred_resolution?: string | null
          reporter_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string | null
          details?: string | null
          dispute_type?: string
          id?: string
          job_id?: string
          job_type?: string
          preferred_resolution?: string | null
          reporter_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      educational_content: {
        Row: {
          access_tier: string
          category: string
          content_type: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          status: string
          thumbnail_url: string | null
          title: string
          transcript_url: string | null
          updated_at: string
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          access_tier?: string
          category: string
          content_type: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          transcript_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          access_tier?: string
          category?: string
          content_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      industry_reports: {
        Row: {
          access_tier: string
          category: string
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          preview_content: string | null
          publication_date: string
          report_type: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          access_tier?: string
          category: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          preview_content?: string | null
          publication_date?: string
          report_type: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          access_tier?: string
          category?: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          preview_content?: string | null
          publication_date?: string
          report_type?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      job_events: {
        Row: {
          corroboration_type: string | null
          created_at: string | null
          eta_minutes: number | null
          event_type: string
          id: string
          job_id: string
          job_type: string
          location_lat: number | null
          location_lng: number | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          corroboration_type?: string | null
          created_at?: string | null
          eta_minutes?: number | null
          event_type: string
          id?: string
          job_id: string
          job_type: string
          location_lat?: number | null
          location_lng?: number | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          corroboration_type?: string | null
          created_at?: string | null
          eta_minutes?: number | null
          event_type?: string
          id?: string
          job_id?: string
          job_type?: string
          location_lat?: number | null
          location_lng?: number | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      job_issues: {
        Row: {
          context_snapshot: Json
          created_at: string | null
          id: string
          issue_type: string
          job_id: string
          job_type: string
          original_quote_amount: number | null
          outcome_selected: string
          parent_issue_id: string | null
          proposed_new_amount: number | null
          raised_at: string | null
          raised_by: string
          raised_chip: string | null
          raised_note: string | null
          raised_voice_url: string | null
          resolution_type: string | null
          resolved_at: string | null
          responded_at: string | null
          responded_by: string | null
          response_deadline: string
          response_note: string | null
          response_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          context_snapshot?: Json
          created_at?: string | null
          id?: string
          issue_type: string
          job_id: string
          job_type: string
          original_quote_amount?: number | null
          outcome_selected: string
          parent_issue_id?: string | null
          proposed_new_amount?: number | null
          raised_at?: string | null
          raised_by: string
          raised_chip?: string | null
          raised_note?: string | null
          raised_voice_url?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_deadline: string
          response_note?: string | null
          response_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          context_snapshot?: Json
          created_at?: string | null
          id?: string
          issue_type?: string
          job_id?: string
          job_type?: string
          original_quote_amount?: number | null
          outcome_selected?: string
          parent_issue_id?: string | null
          proposed_new_amount?: number | null
          raised_at?: string | null
          raised_by?: string
          raised_chip?: string | null
          raised_note?: string | null
          raised_voice_url?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_deadline?: string
          response_note?: string | null
          response_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_issues_parent_issue_id_fkey"
            columns: ["parent_issue_id"]
            isOneToOne: false
            referencedRelation: "job_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      key_contacts: {
        Row: {
          company: string
          created_at: string
          department: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          recent_activity: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          recent_activity?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          recent_activity?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          assigned_seller_id: string | null
          auto_closed: boolean | null
          before_photos: Json | null
          budget: number | null
          buyer_approved_resolution: boolean | null
          buyer_company_name: string | null
          buyer_completion_date: string | null
          buyer_id: string
          buyer_last_seen_stage: number | null
          buyer_marked_complete: boolean | null
          buyer_type: string | null
          category: string
          city: string | null
          completion_photos: Json | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string
          description_ar: string | null
          description_en: string | null
          estimated_budget_max: number | null
          estimated_budget_min: number | null
          facility_type: string | null
          final_agreed_price: number | null
          halted: boolean | null
          halted_at: string | null
          halted_reason: string | null
          id: string
          last_nudge_at: string | null
          location: string
          nudge_count: number | null
          original_language: string | null
          payment_method: string | null
          photos: string[] | null
          preferred_start_date: string | null
          price_negotiated_at: string | null
          project_duration_days: number | null
          quotes_count: number
          resolved_at: string | null
          scope_of_work: string | null
          seller_approved_resolution: boolean | null
          seller_completion_date: string | null
          seller_last_seen_stage: number | null
          seller_marked_complete: boolean | null
          seller_on_way_at: string | null
          service_type: string | null
          status: string
          tags: Json | null
          title: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
          urgency: string
          views_count: number
          visibility: string | null
          warranty_activated_at: string | null
          warranty_claim_reason: string | null
          warranty_claimed: boolean | null
          warranty_expires_at: string | null
          work_started_at: string | null
        }
        Insert: {
          assigned_seller_id?: string | null
          auto_closed?: boolean | null
          before_photos?: Json | null
          budget?: number | null
          buyer_approved_resolution?: boolean | null
          buyer_company_name?: string | null
          buyer_completion_date?: string | null
          buyer_id: string
          buyer_last_seen_stage?: number | null
          buyer_marked_complete?: boolean | null
          buyer_type?: string | null
          category: string
          city?: string | null
          completion_photos?: Json | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          description_ar?: string | null
          description_en?: string | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          facility_type?: string | null
          final_agreed_price?: number | null
          halted?: boolean | null
          halted_at?: string | null
          halted_reason?: string | null
          id?: string
          last_nudge_at?: string | null
          location: string
          nudge_count?: number | null
          original_language?: string | null
          payment_method?: string | null
          photos?: string[] | null
          preferred_start_date?: string | null
          price_negotiated_at?: string | null
          project_duration_days?: number | null
          quotes_count?: number
          resolved_at?: string | null
          scope_of_work?: string | null
          seller_approved_resolution?: boolean | null
          seller_completion_date?: string | null
          seller_last_seen_stage?: number | null
          seller_marked_complete?: boolean | null
          seller_on_way_at?: string | null
          service_type?: string | null
          status?: string
          tags?: Json | null
          title: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          urgency: string
          views_count?: number
          visibility?: string | null
          warranty_activated_at?: string | null
          warranty_claim_reason?: string | null
          warranty_claimed?: boolean | null
          warranty_expires_at?: string | null
          work_started_at?: string | null
        }
        Update: {
          assigned_seller_id?: string | null
          auto_closed?: boolean | null
          before_photos?: Json | null
          budget?: number | null
          buyer_approved_resolution?: boolean | null
          buyer_company_name?: string | null
          buyer_completion_date?: string | null
          buyer_id?: string
          buyer_last_seen_stage?: number | null
          buyer_marked_complete?: boolean | null
          buyer_type?: string | null
          category?: string
          city?: string | null
          completion_photos?: Json | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          description_ar?: string | null
          description_en?: string | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          facility_type?: string | null
          final_agreed_price?: number | null
          halted?: boolean | null
          halted_at?: string | null
          halted_reason?: string | null
          id?: string
          last_nudge_at?: string | null
          location?: string
          nudge_count?: number | null
          original_language?: string | null
          payment_method?: string | null
          photos?: string[] | null
          preferred_start_date?: string | null
          price_negotiated_at?: string | null
          project_duration_days?: number | null
          quotes_count?: number
          resolved_at?: string | null
          scope_of_work?: string | null
          seller_approved_resolution?: boolean | null
          seller_completion_date?: string | null
          seller_last_seen_stage?: number | null
          seller_marked_complete?: boolean | null
          seller_on_way_at?: string | null
          service_type?: string | null
          status?: string
          tags?: Json | null
          title?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          urgency?: string
          views_count?: number
          visibility?: string | null
          warranty_activated_at?: string | null
          warranty_claim_reason?: string | null
          warranty_claimed?: boolean | null
          warranty_expires_at?: string | null
          work_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string | null
          payload: Json | null
          price_status: string | null
          proposed_price: number | null
          quote_id: string | null
          read_at: string | null
          request_id: string | null
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          payload?: Json | null
          price_status?: string | null
          proposed_price?: number | null
          quote_id?: string | null
          read_at?: string | null
          request_id?: string | null
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          payload?: Json | null
          price_status?: string | null
          proposed_price?: number | null
          quote_id?: string | null
          read_at?: string | null
          request_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          message: string
          notification_type: string
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          message: string
          notification_type: string
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_escape_events: {
        Row: {
          booking_id: string | null
          created_at: string | null
          detected_pattern: string
          id: string
          message_content: string | null
          request_id: string | null
          user_id: string
          warning_shown: boolean | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          detected_pattern: string
          id?: string
          message_content?: string | null
          request_id?: string | null
          user_id: string
          warning_shown?: boolean | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          detected_pattern?: string
          id?: string
          message_content?: string | null
          request_id?: string | null
          user_id?: string
          warning_shown?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_escape_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_escape_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability_status: string | null
          avatar_seed: string | null
          badges: Json | null
          bio: string | null
          bio_ar: string | null
          bio_en: string | null
          buyer_type: string | null
          certifications: string[] | null
          company_description: string | null
          company_description_ar: string | null
          company_description_en: string | null
          company_name: string | null
          company_name_ar: string | null
          company_name_en: string | null
          completed_projects: number | null
          created_at: string
          crew_size_range: string | null
          discoverable: boolean | null
          elite_badge_expiry: string | null
          email: string | null
          email_notifications_enabled: boolean | null
          first_issue_raised_at: string | null
          first_issue_received_at: string | null
          founding_member: boolean | null
          full_name: string | null
          full_name_ar: string | null
          full_name_en: string | null
          id: string
          incidents_30d: number | null
          instant_booking_enabled: boolean | null
          linkedin_url: string | null
          on_time_rate: number | null
          original_language: string | null
          phone: string | null
          portfolio_items: Json | null
          preferred_currency: string | null
          preferred_date_format: string | null
          profile_visibility: string | null
          push_notifications_enabled: boolean | null
          reliability_rate: number | null
          response_time_hours: number | null
          score_last_calculated: string | null
          seller_rating: number | null
          service_categories: string[] | null
          service_cities: string[] | null
          service_focus: string[] | null
          service_radius_km: number | null
          services_pricing: Json | null
          show_past_work: boolean | null
          signature_data: Json | null
          specializations: string[] | null
          system_generated: boolean | null
          total_jobs_30d: number | null
          trust_score: number | null
          trust_score_pending: boolean | null
          updated_at: string
          user_type: string | null
          verified_reviews_count: number | null
          verified_seller: boolean | null
          website_url: string | null
          years_of_experience: number | null
        }
        Insert: {
          availability_status?: string | null
          avatar_seed?: string | null
          badges?: Json | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          buyer_type?: string | null
          certifications?: string[] | null
          company_description?: string | null
          company_description_ar?: string | null
          company_description_en?: string | null
          company_name?: string | null
          company_name_ar?: string | null
          company_name_en?: string | null
          completed_projects?: number | null
          created_at?: string
          crew_size_range?: string | null
          discoverable?: boolean | null
          elite_badge_expiry?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          first_issue_raised_at?: string | null
          first_issue_received_at?: string | null
          founding_member?: boolean | null
          full_name?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          id: string
          incidents_30d?: number | null
          instant_booking_enabled?: boolean | null
          linkedin_url?: string | null
          on_time_rate?: number | null
          original_language?: string | null
          phone?: string | null
          portfolio_items?: Json | null
          preferred_currency?: string | null
          preferred_date_format?: string | null
          profile_visibility?: string | null
          push_notifications_enabled?: boolean | null
          reliability_rate?: number | null
          response_time_hours?: number | null
          score_last_calculated?: string | null
          seller_rating?: number | null
          service_categories?: string[] | null
          service_cities?: string[] | null
          service_focus?: string[] | null
          service_radius_km?: number | null
          services_pricing?: Json | null
          show_past_work?: boolean | null
          signature_data?: Json | null
          specializations?: string[] | null
          system_generated?: boolean | null
          total_jobs_30d?: number | null
          trust_score?: number | null
          trust_score_pending?: boolean | null
          updated_at?: string
          user_type?: string | null
          verified_reviews_count?: number | null
          verified_seller?: boolean | null
          website_url?: string | null
          years_of_experience?: number | null
        }
        Update: {
          availability_status?: string | null
          avatar_seed?: string | null
          badges?: Json | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          buyer_type?: string | null
          certifications?: string[] | null
          company_description?: string | null
          company_description_ar?: string | null
          company_description_en?: string | null
          company_name?: string | null
          company_name_ar?: string | null
          company_name_en?: string | null
          completed_projects?: number | null
          created_at?: string
          crew_size_range?: string | null
          discoverable?: boolean | null
          elite_badge_expiry?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          first_issue_raised_at?: string | null
          first_issue_received_at?: string | null
          founding_member?: boolean | null
          full_name?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          id?: string
          incidents_30d?: number | null
          instant_booking_enabled?: boolean | null
          linkedin_url?: string | null
          on_time_rate?: number | null
          original_language?: string | null
          phone?: string | null
          portfolio_items?: Json | null
          preferred_currency?: string | null
          preferred_date_format?: string | null
          profile_visibility?: string | null
          push_notifications_enabled?: boolean | null
          reliability_rate?: number | null
          response_time_hours?: number | null
          score_last_calculated?: string | null
          seller_rating?: number | null
          service_categories?: string[] | null
          service_cities?: string[] | null
          service_focus?: string[] | null
          service_radius_km?: number | null
          services_pricing?: Json | null
          show_past_work?: boolean | null
          signature_data?: Json | null
          specializations?: string[] | null
          system_generated?: boolean | null
          total_jobs_30d?: number | null
          trust_score?: number | null
          trust_score_pending?: boolean | null
          updated_at?: string
          user_type?: string | null
          verified_reviews_count?: number | null
          verified_seller?: boolean | null
          website_url?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      quote_negotiations: {
        Row: {
          created_at: string
          duration_offer: string | null
          id: string
          initiator_id: string
          message: string | null
          price_offer: number | null
          quote_id: string
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_offer?: string | null
          id?: string
          initiator_id: string
          message?: string | null
          price_offer?: number | null
          quote_id: string
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_offer?: string | null
          id?: string
          initiator_id?: string
          message?: string | null
          price_offer?: number | null
          quote_id?: string
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_negotiations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_submissions: {
        Row: {
          attachments: Json | null
          certifications: string | null
          client_references: string | null
          cover_letter: string | null
          cover_letter_ar: string | null
          cover_letter_en: string | null
          created_at: string
          custom_sections: Json | null
          estimated_duration: string
          id: string
          original_language: string | null
          previous_duration: string | null
          previous_price: number | null
          previous_proposal: string | null
          price: number
          pricing_breakdown: Json | null
          proposal: string
          proposal_ar: string | null
          proposal_en: string | null
          request_id: string
          revision_message: string | null
          revision_requested_at: string | null
          seller_id: string
          start_date: string | null
          status: string
          team_experience: string | null
          technical_approach: string | null
          timeline_details: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          certifications?: string | null
          client_references?: string | null
          cover_letter?: string | null
          cover_letter_ar?: string | null
          cover_letter_en?: string | null
          created_at?: string
          custom_sections?: Json | null
          estimated_duration: string
          id?: string
          original_language?: string | null
          previous_duration?: string | null
          previous_price?: number | null
          previous_proposal?: string | null
          price: number
          pricing_breakdown?: Json | null
          proposal: string
          proposal_ar?: string | null
          proposal_en?: string | null
          request_id: string
          revision_message?: string | null
          revision_requested_at?: string | null
          seller_id: string
          start_date?: string | null
          status?: string
          team_experience?: string | null
          technical_approach?: string | null
          timeline_details?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          certifications?: string | null
          client_references?: string | null
          cover_letter?: string | null
          cover_letter_ar?: string | null
          cover_letter_en?: string | null
          created_at?: string
          custom_sections?: Json | null
          estimated_duration?: string
          id?: string
          original_language?: string | null
          previous_duration?: string | null
          previous_price?: number | null
          previous_proposal?: string | null
          price?: number
          pricing_breakdown?: Json | null
          proposal?: string
          proposal_ar?: string | null
          proposal_en?: string | null
          request_id?: string
          revision_message?: string | null
          revision_requested_at?: string | null
          seller_id?: string
          start_date?: string | null
          status?: string
          team_experience?: string | null
          technical_approach?: string | null
          timeline_details?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_submissions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_quote_templates: {
        Row: {
          created_at: string
          id: string
          request_id: string
          sections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          sections?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          sections?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_quote_templates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_views: {
        Row: {
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_views_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_buyers: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_buyers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_buyers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_requests: {
        Row: {
          created_at: string
          id: string
          request_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_vendors: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          seller_id?: string
        }
        Relationships: []
      }
      seller_achievements: {
        Row: {
          achieved_at: string | null
          achievement_name: string
          achievement_type: string
          id: string
          metadata: Json | null
          seller_id: string
        }
        Insert: {
          achieved_at?: string | null
          achievement_name: string
          achievement_type: string
          id?: string
          metadata?: Json | null
          seller_id: string
        }
        Update: {
          achieved_at?: string | null
          achievement_name?: string
          achievement_type?: string
          id?: string
          metadata?: Json | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_achievements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_reviews: {
        Row: {
          buyer_id: string
          contract_id: string | null
          created_at: string
          id: string
          rating: number
          request_id: string | null
          review_text: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          contract_id?: string | null
          created_at?: string
          id?: string
          rating: number
          request_id?: string | null
          review_text?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          contract_id?: string | null
          created_at?: string
          id?: string
          rating?: number
          request_id?: string | null
          review_text?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          action_items: Json | null
          city: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string
          estimated_value: string | null
          id: string
          location: string | null
          signal_type: string
          source_link: string | null
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          action_items?: Json | null
          city?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          estimated_value?: string | null
          id?: string
          location?: string | null
          signal_type: string
          source_link?: string | null
          status?: string
          updated_at?: string
          urgency: string
        }
        Update: {
          action_items?: Json | null
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          estimated_value?: string | null
          id?: string
          location?: string | null
          signal_type?: string
          source_link?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      support_chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      templates_guides: {
        Row: {
          access_tier: string
          category: string
          created_at: string
          description: string | null
          downloads_count: number | null
          file_type: string
          file_url: string | null
          id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_tier?: string
          category: string
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_tier?: string
          category?: string
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          action_items: Json | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string
          id: string
          location: string | null
          requirements: string | null
          source_link: string | null
          status: string
          submission_deadline: string
          tender_number: string
          title: string
          updated_at: string
          value_max: number | null
          value_min: number | null
        }
        Insert: {
          action_items?: Json | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description: string
          id?: string
          location?: string | null
          requirements?: string | null
          source_link?: string | null
          status?: string
          submission_deadline: string
          tender_number: string
          title: string
          updated_at?: string
          value_max?: number | null
          value_min?: number | null
        }
        Update: {
          action_items?: Json | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string | null
          requirements?: string | null
          source_link?: string | null
          status?: string
          submission_deadline?: string
          tender_number?: string
          title?: string
          updated_at?: string
          value_max?: number | null
          value_min?: number | null
        }
        Relationships: []
      }
      tracked_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_action_items: {
        Row: {
          action_key: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          source_id: string
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_key: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_key?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_type: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          city: string
          created_at: string | null
          full_address: string
          id: string
          is_default: boolean | null
          label: string
          neighborhood: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string | null
          full_address: string
          id?: string
          is_default?: boolean | null
          label: string
          neighborhood?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string | null
          full_address?: string
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          content_preferences: Json | null
          created_at: string
          id: string
          industry_interests: string[] | null
          notification_settings: Json | null
          preferred_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_preferences?: Json | null
          created_at?: string
          id?: string
          industry_interests?: string[] | null
          notification_settings?: Json | null
          preferred_currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_preferences?: Json | null
          created_at?: string
          id?: string
          industry_interests?: string[] | null
          notification_settings?: Json | null
          preferred_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          details: string | null
          evidence_urls: string[] | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          details?: string | null
          evidence_urls?: string[] | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          details?: string | null
          evidence_urls?: string[] | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
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
      warranty_claims: {
        Row: {
          booking_id: string | null
          claim_description: string | null
          claim_reason: string
          claimant_id: string
          created_at: string | null
          evidence_photos: Json | null
          id: string
          request_id: string | null
          resolution: string | null
          resolved_at: string | null
          seller_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          claim_description?: string | null
          claim_reason: string
          claimant_id: string
          created_at?: string | null
          evidence_photos?: Json | null
          id?: string
          request_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          seller_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          claim_description?: string | null
          claim_reason?: string
          claimant_id?: string
          created_at?: string | null
          evidence_photos?: Json | null
          id?: string
          request_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          seller_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_trust_score: {
        Args: { p_approved_score?: number; p_seller_id: string }
        Returns: undefined
      }
      calculate_issue_deadline: {
        Args: { p_issue_type: string; p_job_id: string; p_job_type: string }
        Returns: string
      }
      calculate_seller_trust_score: {
        Args: { p_seller_id: string }
        Returns: number
      }
      capture_context_snapshot: {
        Args: { p_job_id: string; p_job_type: string }
        Returns: Json
      }
      close_issue: {
        Args: { p_issue_id: string; p_resolution_type: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_issue_counterparty: {
        Args: { p_issue_id: string; p_user_id: string }
        Returns: boolean
      }
      is_job_participant: {
        Args: { p_job_id: string; p_job_type: string; p_user_id: string }
        Returns: boolean
      }
      map_outcome_to_type: { Args: { p_outcome: string }; Returns: string }
      process_issue_timeouts: { Args: never; Returns: undefined }
      raise_issue: {
        Args: {
          p_chip?: string
          p_job_id: string
          p_job_type: string
          p_note?: string
          p_original_quote_amount?: number
          p_outcome_selected: string
          p_voice_url?: string
        }
        Returns: string
      }
      reopen_issue: {
        Args: {
          p_note?: string
          p_outcome_selected: string
          p_parent_issue_id: string
        }
        Returns: string
      }
      respond_to_issue: {
        Args: {
          p_issue_id: string
          p_new_quote_amount?: number
          p_response_note?: string
          p_response_type: string
        }
        Returns: undefined
      }
      update_booking_with_lock: {
        Args: {
          p_booking_id: string
          p_expected_version: number
          p_new_status: string
          p_updates?: Json
        }
        Returns: {
          current_version: number
          success: boolean
        }[]
      }
      update_seller_reliability: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      update_seller_trust_score: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "member"
        | "user"
        | "buyer"
        | "seller"
        | "buyer_individual"
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
      app_role: [
        "admin",
        "member",
        "user",
        "buyer",
        "seller",
        "buyer_individual",
      ],
    },
  },
} as const
