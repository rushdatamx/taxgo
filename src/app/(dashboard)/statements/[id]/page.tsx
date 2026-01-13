'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Building2, Calendar, TrendingUp, TrendingDown, FileText } from 'lucide-react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'egreso'
  counterparty_rfc: string | null
  reference_number: string | null
}

interface StatementDetail {
  id: string
  period: string
  status: string
  created_at: string
  processed_at: string | null
  file_url: string
  raw_response: {
    bank_detected: string
    opening_balance: number
    closing_balance: number
    total_deposits: number
    total_withdrawals: number
    account_number: string
  } | null
  banks: {
    name: string
    logo_url: string | null
  } | null
}

export default function StatementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [statement, setStatement] = useState<StatementDetail | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const statementId = params.id as string

      // Fetch statement details
      const { data: statementData, error: statementError } = await supabase
        .from('bank_statements')
        .select(`
          *,
          banks (name, logo_url)
        `)
        .eq('id', statementId)
        .single()

      if (statementError) {
        console.error('Error fetching statement:', statementError)
        setLoading(false)
        return
      }

      setStatement(statementData as StatementDetail)

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('statement_id', statementId)
        .order('date', { ascending: false })

      if (txError) {
        console.error('Error fetching transactions:', txError)
      } else {
        setTransactions((txData || []) as Transaction[])
      }

      setLoading(false)
    }

    fetchData()
  }, [params.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatPeriod = (period: string) => {
    if (!period || period === 'pending') return 'Pendiente'
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F4511E]"></div>
      </div>
    )
  }

  if (!statement) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Regresar
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Estado de cuenta no encontrado
          </CardContent>
        </Card>
      </div>
    )
  }

  const rawResponse = statement.raw_response
  const totalIngresos = transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalEgresos = transactions
    .filter(t => t.type === 'egreso')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/statements')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Regresar a Estados de Cuenta
        </Button>
        <Badge
          variant={statement.status === 'completed' ? 'default' : 'secondary'}
          className={statement.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
        >
          {statement.status === 'completed' ? 'Completado' : statement.status}
        </Badge>
      </div>

      {/* Statement Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-[#F4511E]" />
            {statement.banks?.name || rawResponse?.bank_detected || 'Banco'}
            <span className="text-muted-foreground font-normal">—</span>
            <span className="flex items-center gap-2 text-muted-foreground font-normal">
              <Calendar className="h-4 w-4" />
              {formatPeriod(statement.period)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rawResponse?.opening_balance !== undefined && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                <p className="text-xl font-semibold">{formatCurrency(rawResponse.opening_balance)}</p>
              </div>
            )}
            {rawResponse?.closing_balance !== undefined && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Saldo Final</p>
                <p className="text-xl font-semibold">{formatCurrency(rawResponse.closing_balance)}</p>
              </div>
            )}
            <div className="p-4 rounded-lg bg-green-50">
              <p className="text-sm text-green-600 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Total Ingresos
              </p>
              <p className="text-xl font-semibold text-green-700">{formatCurrency(totalIngresos)}</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50">
              <p className="text-sm text-red-600 flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Total Egresos
              </p>
              <p className="text-xl font-semibold text-red-700">{formatCurrency(totalEgresos)}</p>
            </div>
          </div>
          {rawResponse?.account_number && (
            <p className="mt-4 text-sm text-muted-foreground">
              Cuenta: {rawResponse.account_number}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transacciones
            <Badge variant="secondary" className="ml-2">
              {transactions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay transacciones registradas
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[100px] text-center">Tipo</TableHead>
                    <TableHead className="w-[150px] text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[400px]">
                          <p className="truncate" title={tx.description}>
                            {tx.description}
                          </p>
                          {tx.reference_number && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {tx.reference_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            tx.type === 'ingreso'
                              ? 'border-green-500 text-green-600 bg-green-50'
                              : 'border-red-500 text-red-600 bg-red-50'
                          }
                        >
                          {tx.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        tx.type === 'ingreso' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
