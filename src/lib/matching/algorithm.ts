import {
  BankTransaction,
  Invoice,
  MatchResult,
  MatchFactors,
  MatchingConfig,
  DEFAULT_CONFIG,
} from './types'

/**
 * Calculate match score between a bank transaction and an invoice
 */
export function calculateMatch(
  transaction: BankTransaction,
  invoice: Invoice,
  userRfc: string,
  config: MatchingConfig = DEFAULT_CONFIG
): MatchResult | null {
  const factors: MatchFactors = {
    amountMatch: 0,
    dateProximity: 0,
    rfcMatch: 0,
    descriptionMatch: 0,
  }

  // Type matching: ingreso = emitida (we received payment), egreso = recibida (we paid)
  const expectedInvoiceType = transaction.type === 'ingreso' ? 'emitida' : 'recibida'
  if (invoice.type !== expectedInvoiceType) {
    return null
  }

  // 1. Amount matching (40% weight)
  const txAmount = Math.abs(transaction.amount)
  const invAmount = Math.abs(invoice.total)

  if (invAmount === 0) return null

  const amountDiff = Math.abs(txAmount - invAmount) / invAmount

  if (amountDiff <= config.amountTolerance) {
    factors.amountMatch = 1.0  // Exact match (within tolerance)
  } else if (amountDiff <= 0.01) {
    factors.amountMatch = 0.85  // Within 1%
  } else if (amountDiff <= 0.03) {
    factors.amountMatch = 0.6  // Within 3%
  } else if (amountDiff <= 0.05) {
    factors.amountMatch = 0.4  // Within 5%
  } else {
    // Amount doesn't match enough, skip this pair
    return null
  }

  // 2. Date proximity (30% weight)
  const txDate = new Date(transaction.date)
  const invDate = new Date(invoice.fecha)
  const daysDiff = Math.abs((txDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 1) {
    factors.dateProximity = 1.0
  } else if (daysDiff <= 3) {
    factors.dateProximity = 0.85
  } else if (daysDiff <= 5) {
    factors.dateProximity = 0.7
  } else if (daysDiff <= config.maxDateDiff) {
    factors.dateProximity = 0.5
  } else if (daysDiff <= 15) {
    factors.dateProximity = 0.3
  } else if (daysDiff <= 30) {
    factors.dateProximity = 0.15
  } else {
    factors.dateProximity = 0.05
  }

  // 3. RFC matching (20% weight)
  // For 'ingreso' (emitida): transaction counterparty should be receptor (who paid us)
  // For 'egreso' (recibida): transaction counterparty should be emisor (who we paid)
  const relevantRfc = transaction.type === 'ingreso'
    ? invoice.rfc_receptor
    : invoice.rfc_emisor

  if (transaction.counterparty_rfc) {
    if (transaction.counterparty_rfc.toUpperCase() === relevantRfc?.toUpperCase()) {
      factors.rfcMatch = 1.0
    } else {
      // RFC present but doesn't match - could be wrong invoice
      factors.rfcMatch = 0.1
    }
  } else {
    // No RFC in transaction, neutral
    factors.rfcMatch = 0.5
  }

  // 4. Description matching (10% weight)
  const description = transaction.description.toLowerCase()
  const concepto = (invoice.concepto || '').toLowerCase()
  const nombreContraparte = transaction.type === 'ingreso'
    ? (invoice.nombre_receptor || '').toLowerCase()
    : (invoice.nombre_emisor || '').toLowerCase()

  let descriptionScore = 0.3 // Base score

  // Check if concepto keywords appear in description
  if (concepto && concepto.length > 5) {
    const keywords = concepto.split(' ').filter(w => w.length > 3)
    const matchedKeywords = keywords.filter(kw => description.includes(kw))
    if (matchedKeywords.length > 0) {
      descriptionScore = Math.min(0.5 + (matchedKeywords.length / keywords.length) * 0.5, 1.0)
    }
  }

  // Check if counterparty name appears in description
  if (nombreContraparte && nombreContraparte.length > 3) {
    const nameParts = nombreContraparte.split(' ').filter(w => w.length > 2)
    const matchedParts = nameParts.filter(part => description.includes(part))
    if (matchedParts.length >= 1) {
      descriptionScore = Math.max(descriptionScore, 0.8)
    }
  }

  factors.descriptionMatch = descriptionScore

  // Calculate weighted confidence
  const confidence =
    factors.amountMatch * 0.40 +
    factors.dateProximity * 0.30 +
    factors.rfcMatch * 0.20 +
    factors.descriptionMatch * 0.10

  if (confidence < config.minConfidence) {
    return null
  }

  return {
    transactionId: transaction.id,
    invoiceId: invoice.id,
    confidence: Math.round(confidence * 100) / 100,
    matchFactors: factors,
  }
}

/**
 * Find best matches between transactions and invoices using greedy algorithm
 */
export function findBestMatches(
  transactions: BankTransaction[],
  invoices: Invoice[],
  userRfc: string,
  config: MatchingConfig = DEFAULT_CONFIG
): MatchResult[] {
  const results: MatchResult[] = []
  const matchedInvoices = new Set<string>()
  const matchedTransactions = new Set<string>()

  // Generate all possible matches
  const allMatches: MatchResult[] = []

  for (const tx of transactions) {
    // Skip already matched transactions
    if (tx.matched_invoice_id) continue

    for (const inv of invoices) {
      const match = calculateMatch(tx, inv, userRfc, config)
      if (match) {
        allMatches.push(match)
      }
    }
  }

  // Sort by confidence (highest first)
  allMatches.sort((a, b) => b.confidence - a.confidence)

  // Greedy selection: pick best matches first (1:1 matching)
  for (const match of allMatches) {
    if (matchedTransactions.has(match.transactionId)) continue
    if (matchedInvoices.has(match.invoiceId)) continue

    results.push(match)
    matchedTransactions.add(match.transactionId)
    matchedInvoices.add(match.invoiceId)
  }

  return results
}

/**
 * Get suggested matches (all candidates above threshold, not just best)
 */
export function getSuggestedMatches(
  transaction: BankTransaction,
  invoices: Invoice[],
  userRfc: string,
  config: MatchingConfig = DEFAULT_CONFIG
): MatchResult[] {
  const suggestions: MatchResult[] = []

  for (const inv of invoices) {
    const match = calculateMatch(transaction, inv, userRfc, config)
    if (match) {
      suggestions.push(match)
    }
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence)

  return suggestions.slice(0, 5) // Return top 5 suggestions
}
