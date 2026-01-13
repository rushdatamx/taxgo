import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'

// Mock data - will be replaced with real data from Supabase
const mockMetrics = {
  ingresosMes: 45200,
  egresosMes: 12400,
  isrEstimado: 678,
  ivaEstimado: 5232,
  facturasSinConciliar: 3,
  diasParaPago: 12,
}

const mockPendingTasks = [
  { id: 1, title: 'Subir estado de cuenta Enero 2024', type: 'statement', urgent: true },
  { id: 2, title: '3 facturas sin conciliar', type: 'reconciliation', urgent: false },
  { id: 3, title: 'Pago de ISR vence en 12 dias', type: 'payment', urgent: false },
]

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de tu situacion fiscal del mes actual
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
            <div className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(mockMetrics.ingresosMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos del Mes</CardTitle>
            <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(mockMetrics.egresosMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              -5% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ISR Estimado</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal bg-accent text-primary">RESICO</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(mockMetrics.isrEstimado)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasa: 1.5% sobre ingresos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA a Pagar</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal bg-secondary">16%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(mockMetrics.ivaEstimado)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              IVA trasladado - IVA acreditable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status and Pending Tasks */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Tareas Pendientes</CardTitle>
            <CardDescription className="text-sm">
              Acciones que requieren tu atencion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockPendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                {task.urgent ? (
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm">{task.title}</p>
                </div>
                {task.urgent && (
                  <Badge className="text-xs font-normal bg-primary/10 text-primary hover:bg-primary/20 border-0">Urgente</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Estado de Conciliacion</CardTitle>
            <CardDescription className="text-sm">
              Resumen del mes actual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-md bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-sm">Transacciones conciliadas</span>
              </div>
              <span className="text-sm font-medium">24</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm">Pendientes de conciliar</span>
              </div>
              <span className="text-sm font-medium">{mockMetrics.facturasSinConciliar}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm">Dias para fecha limite</span>
              </div>
              <span className="text-sm font-medium">{mockMetrics.diasParaPago} dias</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
