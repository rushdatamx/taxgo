import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { period } = await request.json()

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({
        error: 'Periodo inválido (formato: YYYY-MM)'
      }, { status: 400 })
    }

    // Get bank transactions totals for the period
    const { data: transactions } = await supabase
      .from('bank_transactions')
      .select(`
        id,
        amount,
        type,
        matched_invoice_id,
        bank_statements!inner(user_id, period)
      `)
      .eq('bank_statements.user_id', user.id)
      .eq('bank_statements.period', period)

    // Calculate bank totals
    const totalIngresosBanco = transactions
      ?.filter(tx => tx.type === 'ingreso')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

    const totalEgresosBanco = transactions
      ?.filter(tx => tx.type === 'egreso')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

    // Get invoice totals for the period
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, total, type')
      .eq('user_id', user.id)
      .eq('period', period)

    // Calculate invoice totals
    const totalIngresosFacturas = invoices
      ?.filter(inv => inv.type === 'emitida')
      .reduce((sum, inv) => sum + Number(inv.total), 0) || 0

    const totalEgresosFacturas = invoices
      ?.filter(inv => inv.type === 'recibida')
      .reduce((sum, inv) => sum + Number(inv.total), 0) || 0

    // Calculate differences
    const diferenciaIngresos = totalIngresosBanco - totalIngresosFacturas
    const diferenciaEgresos = totalEgresosBanco - totalEgresosFacturas

    // Count matched/unmatched
    const matchedTxCount = transactions?.filter(tx => tx.matched_invoice_id).length || 0
    const unmatchedTxCount = (transactions?.length || 0) - matchedTxCount

    const matchedInvoiceIds = new Set(
      transactions?.filter(tx => tx.matched_invoice_id).map(tx => tx.matched_invoice_id)
    )
    const unmatchedInvCount = invoices?.filter(inv => !matchedInvoiceIds.has(inv.id)).length || 0

    // Determine status
    let status: 'pendiente' | 'completo' | 'con_diferencias' = 'pendiente'

    const hasTransactions = (transactions?.length || 0) > 0
    const hasInvoices = (invoices?.length || 0) > 0

    if (hasTransactions && hasInvoices) {
      const tolerance = 1.00 // $1 MXN tolerance for rounding
      const ingresosOk = Math.abs(diferenciaIngresos) <= tolerance
      const egresosOk = Math.abs(diferenciaEgresos) <= tolerance

      if (ingresosOk && egresosOk && unmatchedTxCount === 0 && unmatchedInvCount === 0) {
        status = 'completo'
      } else {
        status = 'con_diferencias'
      }
    }

    // Upsert reconciliation record
    const reconciliationData = {
      user_id: user.id,
      period: period,
      status: status,
      total_ingresos_banco: totalIngresosBanco,
      total_ingresos_facturas: totalIngresosFacturas,
      diferencia_ingresos: diferenciaIngresos,
      total_egresos_banco: totalEgresosBanco,
      total_egresos_facturas: totalEgresosFacturas,
      diferencia_egresos: diferenciaEgresos,
    }

    const { data: reconciliation, error } = await supabase
      .from('reconciliations')
      .upsert(reconciliationData, {
        onConflict: 'user_id,period',
      })
      .select()
      .single()

    if (error) {
      console.error('Reconciliation upsert error:', error)
      return NextResponse.json({
        error: 'Error al guardar conciliación'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reconciliation: reconciliation,
      details: {
        totalTransactions: transactions?.length || 0,
        matchedTransactions: matchedTxCount,
        unmatchedTransactions: unmatchedTxCount,
        totalInvoices: invoices?.length || 0,
        unmatchedInvoices: unmatchedInvCount,
      },
      summary: {
        ingresos: {
          banco: totalIngresosBanco,
          facturas: totalIngresosFacturas,
          diferencia: diferenciaIngresos,
        },
        egresos: {
          banco: totalEgresosBanco,
          facturas: totalEgresosFacturas,
          diferencia: diferenciaEgresos,
        },
      },
    })

  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno'
    }, { status: 500 })
  }
}

// GET reconciliation status for a period
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period')

  if (!period) {
    // Return all reconciliations for user
    const { data, error } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('user_id', user.id)
      .order('period', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error al obtener conciliaciones' }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // Return specific period
  const { data, error } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('user_id', user.id)
    .eq('period', period)
    .single()

  if (error) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}
