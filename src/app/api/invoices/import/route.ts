import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseMiAdminExcel, detectFileType } from '@/lib/parsers/miadmin'
import type { InvoiceType, ImportResult } from '@/types/invoice'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const forcedType = formData.get('type') as InvoiceType | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    if (!isExcel) {
      return NextResponse.json({
        error: 'Formato no soportado. Por favor sube un archivo Excel (.xlsx)'
      }, { status: 400 })
    }

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el límite de 5MB' }, { status: 400 })
    }

    // Leer archivo
    const buffer = await file.arrayBuffer()

    // Parsear Excel de MiAdmin
    const parseResult = parseMiAdminExcel(buffer, file.name, forcedType || undefined)

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Error al procesar archivo',
        details: parseResult.errors,
      }, { status: 400 })
    }

    if (parseResult.invoices.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron facturas válidas en el archivo',
        warnings: parseResult.warnings,
      }, { status: 400 })
    }

    // Preparar datos para insertar
    const invoicesToInsert = parseResult.invoices.map(inv => ({
      user_id: user.id,
      uuid_fiscal: inv.uuid_fiscal,
      type: inv.type,
      invoice_type: inv.invoice_type,
      status: inv.status,
      fecha: inv.fecha,
      stamp_date: inv.stamp_date,
      rfc_emisor: inv.rfc_emisor,
      nombre_emisor: inv.nombre_emisor,
      rfc_receptor: inv.rfc_receptor,
      nombre_receptor: inv.nombre_receptor,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      iva: inv.iva,
      iva_16: inv.iva_16,
      iva_8: inv.iva_8,
      ieps_total: inv.ieps_total,
      retained_iva: inv.retained_iva,
      retained_isr: inv.retained_isr,
      forma_pago: inv.forma_pago,
      metodo_pago: inv.metodo_pago,
      currency: inv.currency,
      exchange_rate: inv.exchange_rate,
      concepto: inv.concepto,
      cfdi_use: inv.cfdi_use,
      period: inv.period,
      fiscal_year: inv.fiscal_year,
      fiscal_month: inv.fiscal_month,
      raw_data: inv.raw_data,
    }))

    // Upsert facturas (actualizar si ya existe por UUID)
    const { data, error } = await supabase
      .from('invoices')
      .upsert(invoicesToInsert, {
        onConflict: 'user_id,uuid_fiscal',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      console.error('Import error:', error)
      return NextResponse.json({
        error: 'Error al guardar facturas',
        details: error.message,
      }, { status: 500 })
    }

    // Calcular estadísticas
    const inserted = data?.length || 0
    const vigentes = parseResult.invoices.filter(i => i.status === 'vigente').length
    const canceladas = parseResult.invoices.filter(i => i.status === 'cancelado').length

    const result: ImportResult = {
      success: true,
      type: parseResult.type,
      period: parseResult.period,
      fileName: file.name,
      total: parseResult.invoices.length,
      inserted,
      updated: parseResult.invoices.length - inserted,
      skipped: parseResult.warnings.length,
      errors: parseResult.errors,
    }

    return NextResponse.json({
      ...result,
      vigentes,
      canceladas,
      warnings: parseResult.warnings.slice(0, 10), // Limitar warnings
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno',
    }, { status: 500 })
  }
}

// GET para obtener resumen de facturas
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') // YYYY-MM
  const type = searchParams.get('type') as InvoiceType | null

  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'vigente')
      .order('fecha', { ascending: false })

    if (period) {
      query = query.eq('period', period)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Calcular totales - usar tipo genérico para evitar problemas con columnas nuevas
    const invoices = (data || []) as Array<Record<string, unknown>>
    const emitidas = invoices.filter(i => i.type === 'emitida')
    const recibidas = invoices.filter(i => i.type === 'recibida')

    const summary = {
      total: invoices.length,
      emitidas: {
        count: emitidas.length,
        subtotal: emitidas.reduce((sum, i) => sum + Number(i.subtotal || 0), 0),
        iva: emitidas.reduce((sum, i) => sum + Number(i.iva || 0), 0),
        total: emitidas.reduce((sum, i) => sum + Number(i.total || 0), 0),
        retainedIva: emitidas.reduce((sum, i) => sum + Number(i.retained_iva || 0), 0),
        retainedIsr: emitidas.reduce((sum, i) => sum + Number(i.retained_isr || 0), 0),
      },
      recibidas: {
        count: recibidas.length,
        subtotal: recibidas.reduce((sum, i) => sum + Number(i.subtotal || 0), 0),
        iva: recibidas.reduce((sum, i) => sum + Number(i.iva || 0), 0),
        total: recibidas.reduce((sum, i) => sum + Number(i.total || 0), 0),
      },
    }

    return NextResponse.json({
      invoices,
      summary,
    })

  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno',
    }, { status: 500 })
  }
}
