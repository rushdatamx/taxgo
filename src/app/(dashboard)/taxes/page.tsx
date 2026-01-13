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
import { Calculator, Download, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

// Mock data
const mockCurrentPeriod = {
  period: '2024-01',
  ingresosTotales: 45200,
  baseISR: 45200,
  tasaISR: 0.015,
  isrCalculado: 678,
  ivaTrasladadado: 7232,
  ivaAcreditable: 2000,
  ivaAPagar: 5232,
  fechaLimite: '2024-02-17',
  status: 'pendiente',
}

const mockHistory = [
  {
    period: '2023-12',
    isr: 520,
    iva: 4100,
    total: 4620,
    status: 'pagado',
    fechaPago: '2024-01-15',
  },
  {
    period: '2023-11',
    isr: 480,
    iva: 3800,
    total: 4280,
    status: 'pagado',
    fechaPago: '2023-12-14',
  },
  {
    period: '2023-10',
    isr: 550,
    iva: 4500,
    total: 5050,
    status: 'pagado',
    fechaPago: '2023-11-16',
  },
]

// RESICO tax rate table
const resicoRates = [
  { limite: 25000, tasa: 1.0 },
  { limite: 50000, tasa: 1.1 },
  { limite: 83333.33, tasa: 1.5 },
  { limite: 208333.33, tasa: 2.0 },
  { limite: Infinity, tasa: 2.5 },
]

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

const statusConfig = {
  pendiente: { label: 'Pendiente', icon: Clock, variant: 'outline' as const },
  pagado: { label: 'Pagado', icon: CheckCircle2, variant: 'default' as const },
  vencido: { label: 'Vencido', icon: AlertCircle, variant: 'destructive' as const },
}

export default function TaxesPage() {
  const currentStatus = statusConfig[mockCurrentPeriod.status as keyof typeof statusConfig]
  const StatusIcon = currentStatus.icon

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calculo de Impuestos</h1>
        <p className="text-muted-foreground">
          ISR e IVA calculados bajo el regimen RESICO
        </p>
      </div>

      {/* Current Period Calculation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {formatPeriod(mockCurrentPeriod.period)}
              </CardTitle>
              <CardDescription>
                Fecha limite de pago: {mockCurrentPeriod.fechaLimite}
              </CardDescription>
            </div>
            <Badge variant={currentStatus.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {currentStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* ISR Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">ISR (Impuesto Sobre la Renta)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingresos del periodo</span>
                  <span>{formatCurrency(mockCurrentPeriod.ingresosTotales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base gravable</span>
                  <span>{formatCurrency(mockCurrentPeriod.baseISR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasa RESICO aplicable</span>
                  <span>{(mockCurrentPeriod.tasaISR * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>ISR a pagar</span>
                  <span className="text-lg">{formatCurrency(mockCurrentPeriod.isrCalculado)}</span>
                </div>
              </div>
            </div>

            {/* IVA Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">IVA (Impuesto al Valor Agregado)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA trasladado (cobrado)</span>
                  <span className="text-green-600">+{formatCurrency(mockCurrentPeriod.ivaTrasladadado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA acreditable (pagado)</span>
                  <span className="text-red-600">-{formatCurrency(mockCurrentPeriod.ivaAcreditable)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>IVA a pagar</span>
                  <span className="text-lg">{formatCurrency(mockCurrentPeriod.ivaAPagar)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a pagar este mes</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(mockCurrentPeriod.isrCalculado + mockCurrentPeriod.ivaAPagar)}
                </p>
              </div>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Descargar calculo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RESICO Rate Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla de Tasas RESICO 2024</CardTitle>
          <CardDescription>
            Tasa de ISR segun el monto de ingresos mensuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingresos mensuales hasta</TableHead>
                <TableHead className="text-right">Tasa ISR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resicoRates.map((rate, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {rate.limite === Infinity
                      ? 'Mas de ' + formatCurrency(resicoRates[index - 1].limite)
                      : formatCurrency(rate.limite)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rate.tasa.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            Registro de impuestos de meses anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">ISR</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHistory.map((record) => {
                const status = statusConfig[record.status as keyof typeof statusConfig]
                const RecordStatusIcon = status.icon
                return (
                  <TableRow key={record.period}>
                    <TableCell className="font-medium">{formatPeriod(record.period)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(record.isr)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(record.iva)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(record.total)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <RecordStatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.fechaPago}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
