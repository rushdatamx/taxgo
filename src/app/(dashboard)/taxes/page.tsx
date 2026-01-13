'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, RefreshCw, CheckCircle2, Clock, AlertCircle, Loader2, TrendingUp, TrendingDown, Receipt, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateISR, calculateIVA, ISR_RESICO_TABLE, formatMXN } from '@/lib/tax-config'

interface TaxSummary {
  period: string
  // Facturas
  ingresosFacturados: number
  gastosFacturados: number
  ivaTrasladado: number
  ivaAcreditable: number
  ivaRetenido: number
  isrRetenido: number
  // Banco
  ingresosBanco: number
  egresosBanco: number
  // Conciliación
  transaccionesTotal: number
  transaccionesConciliadas: number
  facturasSinConciliar: number
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-')
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${months[parseInt(month) - 1]} ${year}`
}

// Generar lista de períodos (últimos 12 meses)
function getAvailablePeriods(): string[] {
  const periods: string[] = []
  const today = new Date()

  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    periods.push(`${year}-${month}`)
  }

  return periods
}

// Calcular fecha límite de pago (día 17 del mes siguiente)
function getPaymentDeadline(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-17`
}

export default function TaxesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)

  const supabase = createClient()
  const availablePeriods = getAvailablePeriods()

  // Set default period to current month
  useEffect(() => {
    if (!selectedPeriod && availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[0])
    }
  }, [availablePeriods, selectedPeriod])

  const fetchTaxData = useCallback(async () => {
    if (!selectedPeriod) return

    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // 1. Obtener facturas del período
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .eq('period', selectedPeriod)
        .eq('status', 'vigente')

      const invoiceList = (invoices || []) as Array<Record<string, unknown>>
      const emitidas = invoiceList.filter(i => i.type === 'emitida')
      const recibidas = invoiceList.filter(i => i.type === 'recibida')

      // 2. Obtener transacciones bancarias del período
      const { data: statements } = await supabase
        .from('bank_statements')
        .select('id')
        .eq('user_id', user.id)
        .eq('period', selectedPeriod)

      const statementIds = (statements || []).map(s => s.id)

      let transactions: Array<Record<string, unknown>> = []
      if (statementIds.length > 0) {
        const { data: txData } = await supabase
          .from('bank_transactions')
          .select('*')
          .in('statement_id', statementIds)

        transactions = (txData || []) as Array<Record<string, unknown>>
      }

      // 3. Calcular totales
      const summary: TaxSummary = {
        period: selectedPeriod,
        // Facturas
        ingresosFacturados: emitidas.reduce((sum, i) => sum + Number(i.subtotal || 0), 0),
        gastosFacturados: recibidas.reduce((sum, i) => sum + Number(i.subtotal || 0), 0),
        ivaTrasladado: emitidas.reduce((sum, i) => sum + Number(i.iva || 0), 0),
        ivaAcreditable: recibidas.reduce((sum, i) => sum + Number(i.iva || 0), 0),
        ivaRetenido: emitidas.reduce((sum, i) => sum + Number(i.retained_iva || 0), 0),
        isrRetenido: emitidas.reduce((sum, i) => sum + Number(i.retained_isr || 0), 0),
        // Banco
        ingresosBanco: transactions.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + Number(t.amount || 0), 0),
        egresosBanco: transactions.filter(t => t.type === 'egreso').reduce((sum, t) => sum + Number(t.amount || 0), 0),
        // Conciliación
        transaccionesTotal: transactions.length,
        transaccionesConciliadas: transactions.filter(t => t.matched_invoice_id).length,
        facturasSinConciliar: invoiceList.filter(i => !i.matched_transaction_id).length,
      }

      setTaxSummary(summary)
    } catch (error) {
      console.error('Error fetching tax data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriod, supabase])

  useEffect(() => {
    if (selectedPeriod) {
      fetchTaxData()
    }
  }, [selectedPeriod, fetchTaxData])

  const handleRunReconciliation = async () => {
    if (!selectedPeriod) return

    setIsCalculating(true)
    try {
      // Ejecutar conciliación automática
      await fetch('/api/matching/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: selectedPeriod }),
      })

      // Refrescar datos
      await fetchTaxData()
    } catch (error) {
      console.error('Reconciliation error:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Calcular impuestos usando las funciones centralizadas
  const isr = taxSummary ? calculateISR(taxSummary.ingresosFacturados, taxSummary.isrRetenido) : null
  const iva = taxSummary ? calculateIVA(taxSummary.ivaTrasladado, taxSummary.ivaAcreditable, taxSummary.ivaRetenido) : null
  const totalAPagar = (isr?.isrPorPagar || 0) + (iva?.porPagar || 0)

  // Status del período
  const today = new Date()
  const deadline = selectedPeriod ? new Date(getPaymentDeadline(selectedPeriod)) : null
  const isPastDeadline = deadline ? today > deadline : false
  const hasData = taxSummary && (taxSummary.ingresosFacturados > 0 || taxSummary.ingresosBanco > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cálculo de Impuestos</h1>
          <p className="text-sm text-muted-foreground">
            ISR e IVA calculados bajo el régimen RESICO
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map(period => (
                <SelectItem key={period} value={period}>
                  {formatPeriod(period)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTaxData()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium">Sin datos para {formatPeriod(selectedPeriod)}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Importa facturas o sube estados de cuenta para este período
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen de Datos */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Facturados</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(taxSummary?.ingresosFacturados || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Banco: {formatCurrency(taxSummary?.ingresosBanco || 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Facturados</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(taxSummary?.gastosFacturados || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Banco: {formatCurrency(taxSummary?.egresosBanco || 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ISR a Pagar</CardTitle>
                <Badge variant="outline" className="text-xs">{((isr?.tasa || 0) * 100).toFixed(1)}%</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-amber-600">{formatCurrency(isr?.isrPorPagar || 0)}</div>
                {(taxSummary?.isrRetenido || 0) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Retenido: {formatCurrency(taxSummary?.isrRetenido || 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">IVA a Pagar</CardTitle>
                {(iva?.aFavor || 0) > 0 && <Badge className="text-xs bg-blue-100 text-blue-700">A favor</Badge>}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-semibold ${(iva?.aFavor || 0) > 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                  {(iva?.aFavor || 0) > 0 ? `-${formatCurrency(iva?.aFavor || 0)}` : formatCurrency(iva?.porPagar || 0)}
                </div>
                {(taxSummary?.ivaRetenido || 0) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Retenido: {formatCurrency(taxSummary?.ivaRetenido || 0)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cálculo Detallado */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Cálculo de {formatPeriod(selectedPeriod)}
                  </CardTitle>
                  <CardDescription>
                    Fecha límite: {deadline?.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </CardDescription>
                </div>
                <Badge variant={isPastDeadline ? 'destructive' : 'outline'} className="gap-1">
                  {isPastDeadline ? (
                    <><AlertCircle className="h-3 w-3" /> Vencido</>
                  ) : (
                    <><Clock className="h-3 w-3" /> Pendiente</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* ISR */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    ISR (Impuesto Sobre la Renta)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos facturados (base)</span>
                      <span>{formatCurrency(taxSummary?.ingresosFacturados || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasa RESICO aplicable</span>
                      <span>{((isr?.tasa || 0) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ISR causado</span>
                      <span>{formatCurrency(isr?.isrCausado || 0)}</span>
                    </div>
                    {(taxSummary?.isrRetenido || 0) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>(-) ISR retenido por terceros</span>
                        <span>-{formatCurrency(taxSummary?.isrRetenido || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-medium">
                      <span>ISR a pagar</span>
                      <span className="text-lg text-amber-600">{formatCurrency(isr?.isrPorPagar || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* IVA */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    IVA (Impuesto al Valor Agregado)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA trasladado (cobrado)</span>
                      <span className="text-green-600">+{formatCurrency(iva?.trasladado || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA acreditable (pagado)</span>
                      <span className="text-red-600">-{formatCurrency(iva?.acreditable || 0)}</span>
                    </div>
                    {(iva?.retenido || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IVA retenido por clientes</span>
                        <span className="text-red-600">-{formatCurrency(iva?.retenido || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-medium">
                      <span>{(iva?.aFavor || 0) > 0 ? 'IVA a favor' : 'IVA a pagar'}</span>
                      <span className={`text-lg ${(iva?.aFavor || 0) > 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {(iva?.aFavor || 0) > 0 ? formatCurrency(iva?.aFavor || 0) : formatCurrency(iva?.porPagar || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total a pagar este mes</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalAPagar)}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Conciliación: {taxSummary?.transaccionesConciliadas || 0}/{taxSummary?.transaccionesTotal || 0} transacciones</p>
                    <p>{taxSummary?.facturasSinConciliar || 0} facturas sin conciliar</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conciliación */}
          {(taxSummary?.facturasSinConciliar || 0) > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">Conciliación pendiente</p>
                      <p className="text-sm text-amber-600">
                        Hay {taxSummary?.facturasSinConciliar} facturas sin empatar con transacciones bancarias
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleRunReconciliation}
                    disabled={isCalculating}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {isCalculating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conciliando...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Conciliar automáticamente</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de Tasas RESICO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabla de Tasas RESICO</CardTitle>
              <CardDescription>
                Tasa de ISR según el monto de ingresos mensuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingresos mensuales</TableHead>
                    <TableHead className="text-right">Tasa ISR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ISR_RESICO_TABLE.map((bracket, index) => {
                    const isCurrentBracket = isr && (taxSummary?.ingresosFacturados || 0) >= bracket.minIncome && (taxSummary?.ingresosFacturados || 0) <= bracket.maxIncome
                    return (
                      <TableRow key={index} className={isCurrentBracket ? 'bg-primary/5' : ''}>
                        <TableCell>
                          {bracket.maxIncome === 3500000
                            ? `Más de ${formatCurrency(bracket.minIncome)}`
                            : `${formatCurrency(bracket.minIncome)} - ${formatCurrency(bracket.maxIncome)}`}
                          {isCurrentBracket && <Badge className="ml-2 text-xs">Actual</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(bracket.rate * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
