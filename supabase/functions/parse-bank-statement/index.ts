import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
})

const EXTRACTION_PROMPT = `Analiza este estado de cuenta bancario mexicano y extrae la informacion en formato JSON.

## DETECCION DE BANCO:

**Santander:**
- Logo rojo con llama de fuego
- Header dice "ESTADO DE CUENTA" en rojo
- Columnas: FECHA | FOLIO | DESCRIPCION | DEPOSITO | RETIRO | SALDO
- Formato fecha: DD-MMM-YYYY (ej: 02-DIC-2025)

**Citibanamex/Banamex:**
- Logo azul "citibanamex" con simbolo de flor
- Header dice "Estado de Cuenta" y "MiCuenta"
- Columnas: FECHA | CONCEPTO | RETIROS | DEPOSITOS | SALDO
- Formato fecha: DD MMM (ej: 21 ENE) - el año viene del periodo

## REGLAS CRITICAS:

1. **TIPO DE TRANSACCION:**
   - "ingreso" = dinero que ENTRA (columna DEPOSITO/DEPOSITOS tiene valor)
   - "egreso" = dinero que SALE (columna RETIRO/RETIROS tiene valor)

2. **SANTANDER - Patrones:**
   - INGRESO: "ABONO TRANSFERENCIA", "DEPOSITO EN EFECTIVO", "TU CASHBACK"
   - EGRESO: "CARGO PAGO TARJETA", "PAGO TRANSFERENCIA SPEI", "RETIRO EFEC", "PAGO DE TARJETA"

3. **BANAMEX - Patrones:**
   - INGRESO: "PAGO RECIBIDO DE [BANCO]"
   - EGRESO: "PAGO DE SERVICIO"
   - IGNORAR: "EXENCION COBRO COMISION" (no es movimiento real)

4. **RFC:** Buscar patron de 12-13 caracteres alfanumericos despues de "RFC" en la descripcion

5. **MONTOS:** Siempre positivos, sin signo. Usar formato numerico (ej: 14017.70 no 14,017.70)

6. **FECHAS:** Convertir TODAS al formato YYYY-MM-DD
   - Santander: 02-DIC-2025 -> 2025-12-02
   - Banamex: 21 ENE (periodo enero 2025) -> 2025-01-21

## FORMATO DE RESPUESTA:
Responde SOLO con JSON valido, sin markdown ni explicaciones:

{
  "bank_detected": "Santander|Citibanamex|BBVA|Banorte|HSBC|Scotiabank|Unknown",
  "period": {
    "month": 1-12,
    "year": 2024-2030
  },
  "account_number": "numero completo o ultimos digitos",
  "opening_balance": numero,
  "closing_balance": numero,
  "total_deposits": numero,
  "total_withdrawals": numero,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descripcion completa",
      "reference": "folio o referencia o null",
      "amount": numero_positivo,
      "type": "ingreso|egreso",
      "counterparty_rfc": "RFC encontrado o null"
    }
  ]
}`

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { statementId, fileUrl, userId } = await req.json()

    if (!statementId || !fileUrl) {
      throw new Error('Missing required parameters: statementId and fileUrl')
    }

    console.log(`Processing statement ${statementId} for user ${userId}`)

    // 1. Download PDF from Storage
    const pdfResponse = await fetch(fileUrl)
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))

    console.log(`PDF downloaded, size: ${pdfBuffer.byteLength} bytes`)

    // 2. Call Claude API with Vision
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT
            }
          ],
        }
      ],
    })

    console.log('Claude API response received')

    // 3. Parse Claude's response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // Clean JSON (remove markdown code blocks if present)
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let extractedData
    try {
      extractedData = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('JSON parse error:', cleanJson.substring(0, 500))
      throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}`)
    }

    console.log(`Detected bank: ${extractedData.bank_detected}, transactions: ${extractedData.transactions?.length || 0}`)

    // 4. Get or create bank_id from detected bank name
    let bankId = null
    const bankName = extractedData.bank_detected

    if (bankName && bankName !== 'Unknown') {
      // Try to find existing bank
      const { data: existingBank } = await supabase
        .from('banks')
        .select('id')
        .ilike('name', `%${bankName}%`)
        .single()

      if (existingBank) {
        bankId = existingBank.id
      } else {
        // Create new bank entry
        const { data: newBank } = await supabase
          .from('banks')
          .insert({ name: bankName })
          .select('id')
          .single()

        bankId = newBank?.id || null
      }
    }

    const period = `${extractedData.period.year}-${String(extractedData.period.month).padStart(2, '0')}`

    // 5. Update bank_statement with detected info
    const { error: updateError } = await supabase
      .from('bank_statements')
      .update({
        bank_id: bankId,
        period: period,
        status: 'completed',
        processed_at: new Date().toISOString(),
        raw_response: extractedData,
      })
      .eq('id', statementId)

    if (updateError) {
      throw new Error(`Failed to update statement: ${updateError.message}`)
    }

    // 6. Insert transactions (filter out informational rows)
    if (extractedData.transactions && extractedData.transactions.length > 0) {
      const validTransactions = extractedData.transactions.filter((tx: any) => {
        // Filter out non-monetary entries
        const desc = (tx.description || '').toUpperCase()
        if (desc.includes('EXENCION') || desc.includes('SALDO ANTERIOR')) {
          return false
        }
        // Must have a valid amount
        return tx.amount && tx.amount > 0
      })

      if (validTransactions.length > 0) {
        const transactions = validTransactions.map((tx: any) => ({
          statement_id: statementId,
          date: tx.date,
          description: tx.description,
          original_description: tx.description,
          reference_number: tx.reference || null,
          amount: Math.abs(parseFloat(tx.amount)),
          type: tx.type,
          counterparty_rfc: tx.counterparty_rfc || null,
        }))

        const { error: txError } = await supabase
          .from('bank_transactions')
          .insert(transactions)

        if (txError) {
          throw new Error(`Failed to insert transactions: ${txError.message}`)
        }

        console.log(`Inserted ${transactions.length} transactions`)
      }
    }

    console.log(`Successfully processed statement ${statementId}`)

    return new Response(
      JSON.stringify({
        success: true,
        bank: extractedData.bank_detected,
        period: period,
        transactionCount: extractedData.transactions?.length || 0,
        openingBalance: extractedData.opening_balance,
        closingBalance: extractedData.closing_balance,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error processing statement:', error)

    // Try to update statement status to error
    try {
      const body = await req.clone().json().catch(() => ({}))
      if (body.statementId) {
        await supabase
          .from('bank_statements')
          .update({
            status: 'error',
            error_message: error.message,
          })
          .eq('id', body.statementId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
