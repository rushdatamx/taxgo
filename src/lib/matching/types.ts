export interface BankTransaction {
  id: string
  statement_id: string
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'egreso'
  category?: string | null
  matched_invoice_id?: string | null
  match_confidence?: number | null
  match_method?: string | null
  counterparty_rfc?: string | null
}

export interface Invoice {
  id: string
  user_id: string
  uuid_fiscal: string
  type: 'emitida' | 'recibida'
  fecha: string
  rfc_emisor: string
  nombre_emisor?: string | null
  rfc_receptor: string
  nombre_receptor?: string | null
  subtotal: number
  iva: number | null
  total: number
  concepto?: string | null
  period: string
}

export interface MatchResult {
  transactionId: string
  invoiceId: string
  confidence: number
  matchFactors: MatchFactors
}

export interface MatchFactors {
  amountMatch: number
  dateProximity: number
  rfcMatch: number
  descriptionMatch: number
}

export interface MatchingConfig {
  amountTolerance: number      // Percentage tolerance (e.g., 0.01 = 1%)
  maxDateDiff: number          // Maximum days difference
  minConfidence: number        // Minimum confidence to consider a match
}

export const DEFAULT_CONFIG: MatchingConfig = {
  amountTolerance: 0.005,      // 0.5% tolerance for rounding
  maxDateDiff: 7,              // 7 days
  minConfidence: 0.65,         // 65% minimum confidence
}
