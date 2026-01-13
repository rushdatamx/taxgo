/**
 * Configuración centralizada de cálculos fiscales para RESICO
 *
 * NOTA: Modifica este archivo para ajustar tasas y reglas de cálculo.
 * Todos los cálculos de impuestos en la aplicación usan esta configuración.
 */

// =============================================================================
// TASAS DE ISR RESICO
// =============================================================================

/**
 * Tabla de tasas ISR para RESICO (SAT 2024)
 * El ISR se calcula sobre los INGRESOS COBRADOS (no facturados)
 *
 * Para modificar: Actualiza los rangos y tasas según la tabla del SAT vigente
 */
export const ISR_RESICO_TABLE = [
  { minIncome: 0, maxIncome: 25000, rate: 0.01, fixedFee: 0 },           // 1.00%
  { minIncome: 25000.01, maxIncome: 50000, rate: 0.011, fixedFee: 0 },   // 1.10%
  { minIncome: 50000.01, maxIncome: 83333.33, rate: 0.015, fixedFee: 0 }, // 1.50%
  { minIncome: 83333.34, maxIncome: 208333.33, rate: 0.02, fixedFee: 0 }, // 2.00%
  { minIncome: 208333.34, maxIncome: 3500000, rate: 0.025, fixedFee: 0 }, // 2.50%
] as const

/**
 * Tasa simplificada de ISR RESICO
 * Usar cuando no se requiere el cálculo escalonado
 */
export const ISR_RESICO_FLAT_RATE = 0.0125 // 1.25% tasa promedio simplificada

/**
 * Límite anual de ingresos para RESICO
 * Si se excede, el contribuyente sale del régimen
 */
export const RESICO_ANNUAL_LIMIT = 3500000 // $3,500,000 MXN

// =============================================================================
// TASAS DE IVA
// =============================================================================

/**
 * Tasa general de IVA en México
 */
export const IVA_GENERAL_RATE = 0.16 // 16%

/**
 * Tasa de IVA en zona fronteriza
 */
export const IVA_FRONTERA_RATE = 0.08 // 8%

/**
 * Tasa de retención de IVA (cuando aplica)
 */
export const IVA_RETENTION_RATE = 0.1067 // 10.67% (2/3 del IVA)

// =============================================================================
// FUNCIONES DE CÁLCULO
// =============================================================================

export interface TaxCalculationInput {
  // Ingresos
  ingresosFacturados: number    // Total facturado (emitidas)
  ingresosCobrados: number      // Ingresos efectivamente cobrados (conciliados)

  // Gastos
  gastosFacturados: number      // Total de facturas recibidas
  gastosPagados: number         // Gastos efectivamente pagados (conciliados)

  // IVA
  ivaTrasladado: number         // IVA cobrado en facturas emitidas
  ivaAcreditable: number        // IVA pagado en facturas recibidas
  ivaRetenido: number           // IVA que nos retuvieron

  // ISR
  isrRetenido: number           // ISR que nos retuvieron
}

export interface TaxCalculationResult {
  // ISR
  isr: {
    baseGravable: number        // Ingresos cobrados
    tasaAplicada: number        // Tasa según tabla
    isrCausado: number          // ISR calculado
    isrRetenido: number         // ISR ya retenido por clientes
    isrPorPagar: number         // ISR a pagar (causado - retenido)
  }

  // IVA
  iva: {
    trasladado: number          // IVA cobrado
    acreditable: number         // IVA pagado en gastos
    retenido: number            // IVA retenido por clientes
    porPagar: number            // IVA a pagar (puede ser 0)
    aFavor: number              // IVA a favor (si acreditable > trasladado)
  }

  // Totales
  totalPorPagar: number         // ISR + IVA por pagar
  totalAFavor: number           // IVA a favor (si aplica)
}

/**
 * Calcula la tasa de ISR según la tabla de RESICO
 */
export function getISRRate(monthlyIncome: number): number {
  for (const bracket of ISR_RESICO_TABLE) {
    if (monthlyIncome >= bracket.minIncome && monthlyIncome <= bracket.maxIncome) {
      return bracket.rate
    }
  }
  // Si excede el límite, usar tasa máxima
  return ISR_RESICO_TABLE[ISR_RESICO_TABLE.length - 1].rate
}

/**
 * Calcula ISR mensual para RESICO
 *
 * @param monthlyIncome - Ingresos del mes (cobrados, no facturados)
 * @param isrRetenido - ISR ya retenido por clientes
 */
export function calculateISR(monthlyIncome: number, isrRetenido: number = 0): {
  baseGravable: number
  tasa: number
  isrCausado: number
  isrRetenido: number
  isrPorPagar: number
} {
  const tasa = getISRRate(monthlyIncome)
  const isrCausado = monthlyIncome * tasa
  const isrPorPagar = Math.max(0, isrCausado - isrRetenido)

  return {
    baseGravable: monthlyIncome,
    tasa,
    isrCausado: Math.round(isrCausado * 100) / 100,
    isrRetenido,
    isrPorPagar: Math.round(isrPorPagar * 100) / 100,
  }
}

/**
 * Calcula IVA mensual
 *
 * @param ivaTrasladado - IVA cobrado en facturas emitidas
 * @param ivaAcreditable - IVA pagado en facturas recibidas
 * @param ivaRetenido - IVA retenido por clientes
 */
export function calculateIVA(
  ivaTrasladado: number,
  ivaAcreditable: number,
  ivaRetenido: number = 0
): {
  trasladado: number
  acreditable: number
  retenido: number
  porPagar: number
  aFavor: number
} {
  // IVA por pagar = Trasladado - Acreditable - Retenido
  const diferencia = ivaTrasladado - ivaAcreditable - ivaRetenido

  return {
    trasladado: Math.round(ivaTrasladado * 100) / 100,
    acreditable: Math.round(ivaAcreditable * 100) / 100,
    retenido: Math.round(ivaRetenido * 100) / 100,
    porPagar: Math.round(Math.max(0, diferencia) * 100) / 100,
    aFavor: Math.round(Math.max(0, -diferencia) * 100) / 100,
  }
}

/**
 * Calcula todos los impuestos del período
 */
export function calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
  const isr = calculateISR(input.ingresosCobrados, input.isrRetenido)
  const iva = calculateIVA(input.ivaTrasladado, input.ivaAcreditable, input.ivaRetenido)

  return {
    isr: {
      baseGravable: isr.baseGravable,
      tasaAplicada: isr.tasa,
      isrCausado: isr.isrCausado,
      isrRetenido: isr.isrRetenido,
      isrPorPagar: isr.isrPorPagar,
    },
    iva,
    totalPorPagar: isr.isrPorPagar + iva.porPagar,
    totalAFavor: iva.aFavor,
  }
}

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Formatea un monto en pesos mexicanos
 */
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

/**
 * Verifica si el contribuyente excede el límite de RESICO
 */
export function checkRESICOLimit(annualIncome: number): {
  exceeded: boolean
  remaining: number
  percentage: number
} {
  return {
    exceeded: annualIncome > RESICO_ANNUAL_LIMIT,
    remaining: Math.max(0, RESICO_ANNUAL_LIMIT - annualIncome),
    percentage: (annualIncome / RESICO_ANNUAL_LIMIT) * 100,
  }
}
