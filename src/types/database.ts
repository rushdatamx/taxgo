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
      bank_statements: {
        Row: {
          bank_id: string | null
          created_at: string | null
          error_message: string | null
          file_url: string
          id: string
          period: string
          processed_at: string | null
          raw_response: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          bank_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url: string
          id?: string
          period: string
          processed_at?: string | null
          raw_response?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          bank_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string
          id?: string
          period?: string
          processed_at?: string | null
          raw_response?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          category: string | null
          counterparty_rfc: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          match_confidence: number | null
          match_method: string | null
          matched_invoice_id: string | null
          original_description: string | null
          reference_number: string | null
          statement_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          counterparty_rfc?: string | null
          created_at?: string | null
          date: string
          description: string
          id?: string
          match_confidence?: number | null
          match_method?: string | null
          matched_invoice_id?: string | null
          original_description?: string | null
          reference_number?: string | null
          statement_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          counterparty_rfc?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          match_confidence?: number | null
          match_method?: string | null
          matched_invoice_id?: string | null
          original_description?: string | null
          reference_number?: string | null
          statement_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_matched_invoice"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          parser_config: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          parser_config?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          parser_config?: Json | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          concepto: string | null
          created_at: string | null
          fecha: string
          forma_pago: string | null
          id: string
          iva: number | null
          metodo_pago: string | null
          nombre_emisor: string | null
          nombre_receptor: string | null
          pdf_url: string | null
          period: string
          rfc_emisor: string
          rfc_receptor: string
          subtotal: number
          total: number
          type: string
          user_id: string
          uuid_fiscal: string
          xml_url: string | null
        }
        Insert: {
          concepto?: string | null
          created_at?: string | null
          fecha: string
          forma_pago?: string | null
          id?: string
          iva?: number | null
          metodo_pago?: string | null
          nombre_emisor?: string | null
          nombre_receptor?: string | null
          pdf_url?: string | null
          period: string
          rfc_emisor: string
          rfc_receptor: string
          subtotal: number
          total: number
          type: string
          user_id: string
          uuid_fiscal: string
          xml_url?: string | null
        }
        Update: {
          concepto?: string | null
          created_at?: string | null
          fecha?: string
          forma_pago?: string | null
          id?: string
          iva?: number | null
          metodo_pago?: string | null
          nombre_emisor?: string | null
          nombre_receptor?: string | null
          pdf_url?: string | null
          period?: string
          rfc_emisor?: string
          rfc_receptor?: string
          subtotal?: number
          total?: number
          type?: string
          user_id?: string
          uuid_fiscal?: string
          xml_url?: string | null
        }
        Relationships: []
      }
      matching_attempts: {
        Row: {
          confidence_score: number
          created_at: string | null
          id: string
          invoice_id: string | null
          match_factors: Json
          transaction_id: string | null
          was_selected: boolean | null
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          match_factors: Json
          transaction_id?: string | null
          was_selected?: boolean | null
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          match_factors?: Json
          transaction_id?: string | null
          was_selected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_attempts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          message: string
          sent_at: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          message: string
          sent_at?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          fecha_alta_resico: string | null
          id: string
          nombre_fiscal: string | null
          phone: string | null
          regimen: string | null
          rfc: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fecha_alta_resico?: string | null
          id?: string
          nombre_fiscal?: string | null
          phone?: string | null
          regimen?: string | null
          rfc?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fecha_alta_resico?: string | null
          id?: string
          nombre_fiscal?: string | null
          phone?: string | null
          regimen?: string | null
          rfc?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reconciliations: {
        Row: {
          created_at: string | null
          diferencia_egresos: number | null
          diferencia_ingresos: number | null
          id: string
          period: string
          status: string | null
          total_egresos_banco: number | null
          total_egresos_facturas: number | null
          total_ingresos_banco: number | null
          total_ingresos_facturas: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          diferencia_egresos?: number | null
          diferencia_ingresos?: number | null
          id?: string
          period: string
          status?: string | null
          total_egresos_banco?: number | null
          total_egresos_facturas?: number | null
          total_ingresos_banco?: number | null
          total_ingresos_facturas?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          diferencia_egresos?: number | null
          diferencia_ingresos?: number | null
          id?: string
          period?: string
          status?: string | null
          total_egresos_banco?: number | null
          total_egresos_facturas?: number | null
          total_ingresos_banco?: number | null
          total_ingresos_facturas?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tax_calculations: {
        Row: {
          base_isr: number | null
          created_at: string | null
          fecha_limite_pago: string
          id: string
          isr_calculado: number | null
          iva_a_pagar: number | null
          iva_acreditable: number | null
          iva_trasladado: number | null
          period: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_isr?: number | null
          created_at?: string | null
          fecha_limite_pago: string
          id?: string
          isr_calculado?: number | null
          iva_a_pagar?: number | null
          iva_acreditable?: number | null
          iva_trasladado?: number | null
          period: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_isr?: number | null
          created_at?: string | null
          fecha_limite_pago?: string
          id?: string
          isr_calculado?: number | null
          iva_a_pagar?: number | null
          iva_acreditable?: number | null
          iva_trasladado?: number | null
          period?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
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

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
