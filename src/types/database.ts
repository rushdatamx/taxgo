export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          rfc: string | null
          nombre_fiscal: string | null
          regimen: string | null
          fecha_alta_resico: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          rfc?: string | null
          nombre_fiscal?: string | null
          regimen?: string | null
          fecha_alta_resico?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          rfc?: string | null
          nombre_fiscal?: string | null
          regimen?: string | null
          fecha_alta_resico?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      banks: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          parser_config: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          parser_config?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          parser_config?: Json | null
          created_at?: string
        }
      }
      bank_statements: {
        Row: {
          id: string
          user_id: string
          bank_id: string
          period: string
          file_url: string
          status: 'pending' | 'processing' | 'completed' | 'error'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_id: string
          period: string
          file_url: string
          status?: 'pending' | 'processing' | 'completed' | 'error'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_id?: string
          period?: string
          file_url?: string
          status?: 'pending' | 'processing' | 'completed' | 'error'
          created_at?: string
        }
      }
      bank_transactions: {
        Row: {
          id: string
          statement_id: string
          date: string
          description: string
          amount: number
          type: 'ingreso' | 'egreso'
          category: string | null
          matched_invoice_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          statement_id: string
          date: string
          description: string
          amount: number
          type: 'ingreso' | 'egreso'
          category?: string | null
          matched_invoice_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          statement_id?: string
          date?: string
          description?: string
          amount?: number
          type?: 'ingreso' | 'egreso'
          category?: string | null
          matched_invoice_id?: string | null
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          uuid_fiscal: string
          type: 'emitida' | 'recibida'
          fecha: string
          rfc_emisor: string
          rfc_receptor: string
          subtotal: number
          iva: number
          total: number
          concepto: string | null
          xml_url: string | null
          pdf_url: string | null
          period: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          uuid_fiscal: string
          type: 'emitida' | 'recibida'
          fecha: string
          rfc_emisor: string
          rfc_receptor: string
          subtotal: number
          iva: number
          total: number
          concepto?: string | null
          xml_url?: string | null
          pdf_url?: string | null
          period: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          uuid_fiscal?: string
          type?: 'emitida' | 'recibida'
          fecha?: string
          rfc_emisor?: string
          rfc_receptor?: string
          subtotal?: number
          iva?: number
          total?: number
          concepto?: string | null
          xml_url?: string | null
          pdf_url?: string | null
          period?: string
          created_at?: string
        }
      }
      reconciliations: {
        Row: {
          id: string
          user_id: string
          period: string
          status: 'pendiente' | 'completo' | 'con_diferencias'
          total_ingresos_banco: number
          total_ingresos_facturas: number
          diferencia_ingresos: number
          total_egresos_banco: number
          total_egresos_facturas: number
          diferencia_egresos: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          status?: 'pendiente' | 'completo' | 'con_diferencias'
          total_ingresos_banco?: number
          total_ingresos_facturas?: number
          diferencia_ingresos?: number
          total_egresos_banco?: number
          total_egresos_facturas?: number
          diferencia_egresos?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: string
          status?: 'pendiente' | 'completo' | 'con_diferencias'
          total_ingresos_banco?: number
          total_ingresos_facturas?: number
          diferencia_ingresos?: number
          total_egresos_banco?: number
          total_egresos_facturas?: number
          diferencia_egresos?: number
          created_at?: string
          updated_at?: string
        }
      }
      tax_calculations: {
        Row: {
          id: string
          user_id: string
          period: string
          base_isr: number
          isr_calculado: number
          iva_trasladado: number
          iva_acreditable: number
          iva_a_pagar: number
          fecha_limite_pago: string
          status: 'pendiente' | 'pagado' | 'vencido'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          base_isr?: number
          isr_calculado?: number
          iva_trasladado?: number
          iva_acreditable?: number
          iva_a_pagar?: number
          fecha_limite_pago: string
          status?: 'pendiente' | 'pagado' | 'vencido'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: string
          base_isr?: number
          isr_calculado?: number
          iva_trasladado?: number
          iva_acreditable?: number
          iva_a_pagar?: number
          fecha_limite_pago?: string
          status?: 'pendiente' | 'pagado' | 'vencido'
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          message: string
          sent_at: string | null
          channel: 'whatsapp' | 'sms' | 'email'
          status: 'pending' | 'sent' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          message: string
          sent_at?: string | null
          channel: 'whatsapp' | 'sms' | 'email'
          status?: 'pending' | 'sent' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          message?: string
          sent_at?: string | null
          channel?: 'whatsapp' | 'sms' | 'email'
          status?: 'pending' | 'sent' | 'failed'
          created_at?: string
        }
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
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
