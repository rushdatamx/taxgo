import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface MiAdminRow {
  UUID?: string
  'UUID Fiscal'?: string
  Tipo?: string
  Fecha?: string
  'RFC Emisor'?: string
  'Nombre Emisor'?: string
  'RFC Receptor'?: string
  'Nombre Receptor'?: string
  Subtotal?: string
  IVA?: string
  Total?: string
  Concepto?: string
  'Metodo Pago'?: string
  'Forma Pago'?: string
  [key: string]: string | undefined
}

function parseCSV(csvText: string): MiAdminRow[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header - handle quoted values
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const record: MiAdminRow = {}
    headers.forEach((header, index) => {
      record[header] = values[index] || ''
    })
    return record
  }).filter(row => row.UUID || row['UUID Fiscal']) // Filter empty rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result.map(v => v.replace(/^"|"$/g, ''))
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]

  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }

  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10)
  }

  return dateStr
}

function parseNumber(str: string | undefined): number {
  if (!str) return 0
  // Remove currency symbols, commas, spaces
  const clean = str.replace(/[$,\s]/g, '')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Accept CSV and TXT files
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'El archivo debe ser CSV' }, { status: 400 })
    }

    // Read CSV content
    const csvText = await file.text()
    const records = parseCSV(csvText)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No se encontraron facturas en el archivo' }, { status: 400 })
    }

    // Transform to database format
    const invoices = records.map((record) => {
      const uuid = record.UUID || record['UUID Fiscal'] || ''
      const fecha = parseDate(record.Fecha || '')
      const period = fecha.substring(0, 7) // YYYY-MM

      // Determine type: emitida if user is emisor, recibida if user is receptor
      let tipo = (record.Tipo || '').toLowerCase()
      if (!tipo || (tipo !== 'emitida' && tipo !== 'recibida')) {
        tipo = 'emitida' // Default
      }

      return {
        user_id: user.id,
        uuid_fiscal: uuid,
        type: tipo as 'emitida' | 'recibida',
        fecha: fecha,
        rfc_emisor: record['RFC Emisor'] || '',
        nombre_emisor: record['Nombre Emisor'] || null,
        rfc_receptor: record['RFC Receptor'] || '',
        nombre_receptor: record['Nombre Receptor'] || null,
        subtotal: parseNumber(record.Subtotal),
        iva: parseNumber(record.IVA),
        total: parseNumber(record.Total),
        concepto: record.Concepto || null,
        metodo_pago: record['Metodo Pago'] || null,
        forma_pago: record['Forma Pago'] || null,
        period: period,
      }
    }).filter(inv => inv.uuid_fiscal) // Filter out invalid records

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'No se encontraron facturas válidas' }, { status: 400 })
    }

    // Upsert invoices (handle duplicates via uuid_fiscal)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('invoices')
      .upsert(invoices as any, {
        onConflict: 'user_id,uuid_fiscal',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('Import error:', error)
      return NextResponse.json({
        error: 'Error al importar facturas',
        details: error.message
      }, { status: 500 })
    }

    // Count by type
    const emitidas = invoices.filter(i => i.type === 'emitida').length
    const recibidas = invoices.filter(i => i.type === 'recibida').length

    return NextResponse.json({
      success: true,
      imported: data?.length || invoices.length,
      total: records.length,
      emitidas,
      recibidas,
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno'
    }, { status: 500 })
  }
}
