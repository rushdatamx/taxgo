import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { statementId } = await request.json()

    if (!statementId) {
      return NextResponse.json({ error: 'statementId requerido' }, { status: 400 })
    }

    // Verify statement belongs to user
    const { data: statement, error: fetchError } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('id', statementId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !statement) {
      return NextResponse.json({ error: 'Estado de cuenta no encontrado' }, { status: 404 })
    }

    // Check if already processing or completed
    if (statement.status === 'processing') {
      return NextResponse.json({ error: 'Ya se está procesando' }, { status: 409 })
    }

    if (statement.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Ya fue procesado',
        status: 'completed'
      })
    }

    // Update status to 'processing'
    await supabase
      .from('bank_statements')
      .update({ status: 'processing' })
      .eq('id', statementId)

    // Invoke Edge Function
    const { data, error } = await supabase.functions.invoke('parse-bank-statement', {
      body: {
        statementId: statement.id,
        fileUrl: statement.file_url,
        userId: user.id,
      },
    })

    if (error) {
      console.error('Edge function error:', error)
      // Update status back to pending or error
      await supabase
        .from('bank_statements')
        .update({
          status: 'error',
          error_message: error.message || 'Error al procesar'
        })
        .eq('id', statementId)

      return NextResponse.json({
        error: 'Error al procesar el estado de cuenta',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...data
    })

  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno'
    }, { status: 500 })
  }
}

// GET to check status
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statementId = searchParams.get('id')

  if (!statementId) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const { data: statement, error } = await supabase
    .from('bank_statements')
    .select(`
      *,
      banks (name, logo_url),
      bank_transactions (count)
    `)
    .eq('id', statementId)
    .eq('user_id', user.id)
    .single()

  if (error || !statement) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  return NextResponse.json(statement)
}
