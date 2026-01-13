/**
 * Parser de archivos Excel exportados de MiAdmin
 *
 * Soporta archivos de facturas Emitidas y Recibidas
 * Formato: {RFC}_{Emitidas|Recibidas}_{año}_{mes}_Facturas.xlsx
 */

import * as XLSX from 'xlsx'
import type { InvoiceType, MiAdminRow } from '@/types/invoice'

export interface ParsedInvoice {
  uuid_fiscal: string
  type: InvoiceType
  invoice_type: string | null
  status: 'vigente' | 'cancelado'
  fecha: string // YYYY-MM-DD
  stamp_date: string | null
  rfc_emisor: string
  nombre_emisor: string | null
  rfc_receptor: string
  nombre_receptor: string | null
  subtotal: number
  discount: number
  total: number
  iva: number
  iva_16: number
  iva_8: number
  ieps_total: number
  retained_iva: number
  retained_isr: number
  forma_pago: string | null
  metodo_pago: string | null
  currency: string
  exchange_rate: number | null
  concepto: string | null
  cfdi_use: string | null
  period: string // YYYY-MM
  fiscal_year: number
  fiscal_month: number
  raw_data: Record<string, unknown>
}

export interface ParseResult {
  success: boolean
  type: InvoiceType
  period: string
  invoices: ParsedInvoice[]
  errors: string[]
  warnings: string[]
}

/**
 * Detecta el tipo de archivo (Emitidas o Recibidas) por el nombre
 */
export function detectFileType(fileName: string): InvoiceType | null {
  const lower = fileName.toLowerCase()
  if (lower.includes('emitida')) return 'emitida'
  if (lower.includes('recibida')) return 'recibida'
  return null
}

/**
 * Extrae el período del nombre del archivo
 * Formato esperado: {RFC}_{tipo}_{año}_{mes}_Facturas.xlsx
 */
export function extractPeriodFromFileName(fileName: string): { year: number; month: number } | null {
  // Buscar patrón: _2025_12_ o _2024_01_
  const match = fileName.match(/_(\d{4})_(\d{1,2})_/)
  if (match) {
    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]),
    }
  }
  return null
}

/**
 * Parsea fecha de MiAdmin (DD/MM/YYYY) a formato ISO (YYYY-MM-DD)
 */
function parseDate(dateStr: string | number | null | undefined): string | null {
  if (!dateStr) return null

  // Si es un número (fecha de Excel), convertir
  if (typeof dateStr === 'number') {
    const date = XLSX.SSF.parse_date_code(dateStr)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    return null
  }

  // Si es string en formato DD/MM/YYYY
  const match = String(dateStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Intentar parsear como fecha ISO
  const isoMatch = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  return null
}

/**
 * Parsea fecha con hora (timestamp)
 */
function parseTimestamp(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  // Formato: 2025-12-16T17:11:42
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch {
    // Ignorar errores de parsing
  }
  return null
}

/**
 * Limpia y normaliza un número
 */
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,$]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
  return 0
}

/**
 * Normaliza el tipo de comprobante
 */
function normalizeInvoiceType(tipo: string | null | undefined): string | null {
  if (!tipo) return null
  const lower = tipo.toLowerCase().trim()
  if (lower.includes('factura')) return 'Factura'
  if (lower.includes('nota') && lower.includes('credito')) return 'NotaCredito'
  if (lower.includes('pago')) return 'Pago'
  if (lower.includes('egreso')) return 'Egreso'
  if (lower.includes('traslado')) return 'Traslado'
  if (lower.includes('nomina')) return 'Nomina'
  return tipo
}

/**
 * Normaliza el estado del SAT
 */
function normalizeStatus(estado: string | null | undefined): 'vigente' | 'cancelado' {
  if (!estado) return 'vigente'
  const lower = estado.toLowerCase().trim()
  if (lower.includes('cancel')) return 'cancelado'
  return 'vigente'
}

/**
 * Parsea un archivo Excel de MiAdmin
 */
export function parseMiAdminExcel(
  buffer: ArrayBuffer,
  fileName: string,
  forcedType?: InvoiceType
): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const invoices: ParsedInvoice[] = []

  try {
    // Leer el archivo Excel
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { success: false, type: 'emitida', period: '', invoices: [], errors: ['Archivo Excel vacío'], warnings: [] }
    }

    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<MiAdminRow>(worksheet, { defval: null })

    if (rows.length === 0) {
      return { success: false, type: 'emitida', period: '', invoices: [], errors: ['No se encontraron facturas en el archivo'], warnings: [] }
    }

    // Detectar tipo de archivo
    const detectedType = forcedType || detectFileType(fileName)
    if (!detectedType) {
      return { success: false, type: 'emitida', period: '', invoices: [], errors: ['No se pudo detectar el tipo de archivo (Emitidas/Recibidas)'], warnings: [] }
    }

    // Detectar período del archivo
    let period = extractPeriodFromFileName(fileName)

    // Procesar cada fila
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 por header y 0-index

      try {
        // Validar UUID
        const uuid = row['UUID']?.trim()
        if (!uuid) {
          warnings.push(`Fila ${rowNum}: UUID vacío, omitida`)
          continue
        }

        // Parsear fecha de emisión
        const fechaEmision = parseDate(row['Fecha Emision'])
        if (!fechaEmision) {
          warnings.push(`Fila ${rowNum}: Fecha de emisión inválida, omitida`)
          continue
        }

        // Extraer año y mes de la fecha si no tenemos período
        const [year, month] = fechaEmision.split('-').map(Number)
        if (!period) {
          period = { year, month }
        }

        // Validar RFCs
        const rfcEmisor = row['RFC Emisor']?.trim()
        const rfcReceptor = row['RFC Receptor']?.trim()
        if (!rfcEmisor || !rfcReceptor) {
          warnings.push(`Fila ${rowNum}: RFC emisor o receptor vacío, omitida`)
          continue
        }

        // Crear objeto de factura parseada
        const invoice: ParsedInvoice = {
          uuid_fiscal: uuid.toUpperCase(),
          type: detectedType,
          invoice_type: normalizeInvoiceType(row['Tipo']),
          status: normalizeStatus(row['Estado SAT']),
          fecha: fechaEmision,
          stamp_date: parseTimestamp(row['Fecha Timbrado']),
          rfc_emisor: rfcEmisor.toUpperCase(),
          nombre_emisor: row['Nombre Emisor']?.trim() || null,
          rfc_receptor: rfcReceptor.toUpperCase(),
          nombre_receptor: row['Nombre Receptor']?.trim() || null,
          subtotal: parseNumber(row['SubTotal']),
          discount: parseNumber(row['Descuento']),
          total: parseNumber(row['Total']),
          iva: parseNumber(row['IVA 16%']) + parseNumber(row['IVA 8%']),
          iva_16: parseNumber(row['IVA 16%']),
          iva_8: parseNumber(row['IVA 8%']),
          ieps_total: parseNumber(row['Total IEPS']),
          retained_iva: parseNumber(row['Retenido IVA']),
          retained_isr: parseNumber(row['Retenido ISR']),
          forma_pago: row['FormaDePago']?.trim() || null,
          metodo_pago: row['Metodo de Pago']?.trim() || null,
          currency: row['Moneda']?.trim() || 'MXN',
          exchange_rate: row['Tipo De Cambio'] || null,
          concepto: row['Conceptos']?.trim() || null,
          cfdi_use: row['UsoCFDI']?.trim() || null,
          period: `${year}-${String(month).padStart(2, '0')}`,
          fiscal_year: year,
          fiscal_month: month,
          raw_data: row as unknown as Record<string, unknown>,
        }

        invoices.push(invoice)
      } catch (rowError) {
        errors.push(`Fila ${rowNum}: Error al procesar - ${rowError instanceof Error ? rowError.message : 'Error desconocido'}`)
      }
    }

    const periodStr = period ? `${period.year}-${String(period.month).padStart(2, '0')}` : 'unknown'

    return {
      success: invoices.length > 0,
      type: detectedType,
      period: periodStr,
      invoices,
      errors,
      warnings,
    }
  } catch (error) {
    return {
      success: false,
      type: 'emitida',
      period: '',
      invoices: [],
      errors: [`Error al leer archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`],
      warnings: [],
    }
  }
}
