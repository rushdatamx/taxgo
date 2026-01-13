import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Get file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser PDF' }, { status: 400 })
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede 10MB' }, { status: 400 })
    }

    // Generate unique filename with user folder
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${user.id}/${timestamp}_${safeName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bank-statements')
      .upload(filename, file, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    // Store the file path (not signed URL) - Edge Function will generate fresh URL
    const filePath = filename

    // Create bank_statement record with 'pending' status
    const { data: statement, error: insertError } = await supabase
      .from('bank_statements')
      .insert({
        user_id: user.id,
        bank_id: null, // Will be detected by Edge Function
        period: 'pending', // Will be extracted by Edge Function
        file_url: filePath, // Store path, not signed URL
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      // Try to delete uploaded file
      await supabase.storage.from('bank-statements').remove([filename])
      return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      statementId: statement.id,
      filePath: filePath,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno'
    }, { status: 500 })
  }
}
