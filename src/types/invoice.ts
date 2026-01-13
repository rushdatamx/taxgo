// Tipos para facturas importadas de MiAdmin

export type InvoiceType = 'emitida' | 'recibida'
export type InvoiceStatus = 'vigente' | 'cancelado'
export type MatchStatus = 'pending' | 'matched' | 'unmatched' | 'manual'
export type CFDIType = 'Factura' | 'NotaCredito' | 'Pago' | 'Egreso' | 'Traslado' | 'Nomina'

export interface Invoice {
  id: string
  user_id: string

  // Identificación CFDI
  uuid_fiscal: string
  type: InvoiceType
  invoice_type: CFDIType | null
  status: InvoiceStatus

  // Fechas
  fecha: string // YYYY-MM-DD
  stamp_date: string | null

  // Partes
  rfc_emisor: string
  nombre_emisor: string | null
  rfc_receptor: string
  nombre_receptor: string | null

  // Montos
  subtotal: number
  discount: number
  total: number

  // Impuestos trasladados
  iva: number
  iva_16: number
  iva_8: number
  ieps_total: number

  // Retenciones
  retained_iva: number
  retained_isr: number

  // Pago
  forma_pago: string | null
  metodo_pago: string | null
  currency: string
  exchange_rate: number | null

  // Descripción
  concepto: string | null
  cfdi_use: string | null

  // Conciliación
  matched_transaction_id: string | null
  match_confidence: number | null
  match_status: MatchStatus

  // Periodo
  period: string // YYYY-MM
  fiscal_year: number
  fiscal_month: number

  // Auditoría
  created_at: string
  updated_at: string
}

// Fila del Excel de MiAdmin
export interface MiAdminRow {
  'Verificado ó Asoc.': string | null
  'Estado SAT': string
  'Version': number
  'Tipo': string
  'Fecha Emision': string
  'Fecha Timbrado': string
  'EstadoPago': string | null
  'FechaPago': string | null
  'Serie': string | null
  'Folio': string | null
  'UUID': string
  'UUID Relacion': string | null
  'RFC Emisor': string
  'Nombre Emisor': string
  'LugarDeExpedicion': string | null
  'RFC Receptor': string
  'Nombre Receptor': string
  'ResidenciaFiscal': string | null
  'NumRegIdTrib': string | null
  'UsoCFDI': string | null
  'SubTotal': number
  'Descuento': number
  'Total IEPS': number
  'IVA 16%': number
  'Retenido IVA': number
  'Retenido ISR': number
  'ISH': number
  'Total': number
  'TotalOriginal': number | null
  'Total Trasladados': number
  'Total Retenidos': number
  'Total LocalTrasladado': number
  'Total LocalRetenido': number
  'Complemento': string | null
  'Moneda': string
  'Tipo De Cambio': number | null
  'FormaDePago': string | null
  'Metodo de Pago': string | null
  'NumCtaPago': string | null
  'Condicion de Pago': string | null
  'Conceptos': string | null
  'Combustible': string | null
  'IVA 8%': number
  'RegimenFiscalReceptor': string | null
  'DomicilioFiscalReceptor': number | null
}

// Resultado de importación
export interface ImportResult {
  success: boolean
  type: InvoiceType
  period: string
  fileName: string
  total: number
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

// Resultado de conciliación
export interface ReconciliationMatch {
  invoiceId: string
  transactionId: string
  confidence: number
  matchType: 'auto' | 'suggested' | 'manual'
  reasons: string[]
}

export interface ReconciliationResult {
  totalInvoices: number
  totalTransactions: number
  matched: number
  suggested: number
  unmatched: number
  matches: ReconciliationMatch[]
}
