import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { findBestMatches } from '@/lib/matching/algorithm'
import { BankTransaction, Invoice } from '@/lib/matching/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { period, statementId } = body

    // Get user's RFC for matching context
    const { data: profile } = await supabase
      .from('profiles')
      .select('rfc')
      .eq('user_id', user.id)
      .single()

    const userRfc = (profile as { rfc: string } | null)?.rfc || ''

    // Build query for unmatched transactions
    let txQuery = supabase
      .from('bank_transactions')
      .select(`
        id,
        statement_id,
        date,
        description,
        amount,
        type,
        category,
        matched_invoice_id,
        match_confidence,
        match_method,
        counterparty_rfc,
        bank_statements!inner(user_id, period)
      `)
      .is('matched_invoice_id', null)
      .eq('bank_statements.user_id', user.id)

    if (statementId) {
      txQuery = txQuery.eq('statement_id', statementId)
    } else if (period) {
      txQuery = txQuery.eq('bank_statements.period', period)
    }

    const { data: transactionsData, error: txError } = await txQuery
    if (txError) {
      console.error('Transactions query error:', txError)
      return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 })
    }

    if (!transactionsData || transactionsData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay transacciones sin empatar',
        matchesFound: 0,
        totalTransactions: 0,
        matches: [],
      })
    }

    // Get periods from transactions
    const periods = [...new Set(transactionsData.map(tx =>
      (tx.bank_statements as { period: string }).period
    ))]

    // Get invoices for matching (unmatched or all in period)
    const { data: invoicesData, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .in('period', periods)

    if (invError) {
      console.error('Invoices query error:', invError)
      return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 })
    }

    // Transform to matching types
    const transactions: BankTransaction[] = transactionsData.map(tx => ({
      id: tx.id,
      statement_id: tx.statement_id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type as 'ingreso' | 'egreso',
      category: tx.category,
      matched_invoice_id: tx.matched_invoice_id,
      match_confidence: tx.match_confidence,
      match_method: tx.match_method,
      counterparty_rfc: tx.counterparty_rfc,
    }))

    const invoices: Invoice[] = (invoicesData || []).map(inv => ({
      id: inv.id,
      user_id: inv.user_id,
      uuid_fiscal: inv.uuid_fiscal,
      type: inv.type as 'emitida' | 'recibida',
      fecha: inv.fecha,
      rfc_emisor: inv.rfc_emisor,
      nombre_emisor: inv.nombre_emisor,
      rfc_receptor: inv.rfc_receptor,
      nombre_receptor: inv.nombre_receptor,
      subtotal: inv.subtotal,
      iva: inv.iva,
      total: inv.total,
      concepto: inv.concepto,
      period: inv.period,
    }))

    // Run matching algorithm
    const matches = findBestMatches(transactions, invoices, userRfc)

    // Apply matches to database
    for (const match of matches) {
      // Update transaction with match
      const { error: updateError } = await supabase
        .from('bank_transactions')
        .update({
          matched_invoice_id: match.invoiceId,
          match_confidence: match.confidence,
          match_method: 'auto',
        })
        .eq('id', match.transactionId)

      if (updateError) {
        console.error('Match update error:', updateError)
        continue
      }

      // Record matching attempt for audit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase
        .from('matching_attempts')
        .insert({
          transaction_id: match.transactionId,
          invoice_id: match.invoiceId,
          confidence_score: match.confidence,
          match_factors: match.matchFactors,
          was_selected: true,
        } as any)
    }

    return NextResponse.json({
      success: true,
      matchesFound: matches.length,
      totalTransactions: transactions.length,
      totalInvoices: invoices.length,
      matches: matches.map(m => ({
        transactionId: m.transactionId,
        invoiceId: m.invoiceId,
        confidence: m.confidence,
        factors: m.matchFactors,
      })),
    })

  } catch (error) {
    console.error('Matching error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno'
    }, { status: 500 })
  }
}
