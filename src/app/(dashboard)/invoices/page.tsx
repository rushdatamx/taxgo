'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link2,
  Link2Off,
  FileSpreadsheet
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Invoice {
  id: string
  uuid_fiscal: string
  type: 'emitida' | 'recibida'
  invoice_type: string | null
  status: string
  fecha: string
  rfc_emisor: string
  nombre_emisor: string | null
  rfc_receptor: string
  nombre_receptor: string | null
  subtotal: number
  iva: number
  iva_16: number
  retained_iva: number
  retained_isr: number
  total: number
  concepto: string | null
  forma_pago: string | null
  metodo_pago: string | null
  period: string
  match_status: string
  matched_transaction_id: string | null
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

export default function InvoicesPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: string[]
  } | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'emitidas' | 'recibidas'>('emitidas')

  const supabase = createClient()

  const fetchInvoices = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      return
    }

    // Cast con valores por defecto para columnas que pueden no existir
    const invoicesWithDefaults = (data || []).map((inv: Record<string, unknown>) => ({
      id: inv.id as string,
      uuid_fiscal: inv.uuid_fiscal as string,
      type: inv.type as 'emitida' | 'recibida',
      invoice_type: (inv.invoice_type as string) || null,
      status: (inv.status as string) || 'vigente',
      fecha: inv.fecha as string,
      rfc_emisor: inv.rfc_emisor as string,
      nombre_emisor: inv.nombre_emisor as string | null,
      rfc_receptor: inv.rfc_receptor as string,
      nombre_receptor: inv.nombre_receptor as string | null,
      subtotal: Number(inv.subtotal) || 0,
      iva: Number(inv.iva) || 0,
      iva_16: Number(inv.iva_16) || 0,
      retained_iva: Number(inv.retained_iva) || 0,
      retained_isr: Number(inv.retained_isr) || 0,
      total: Number(inv.total) || 0,
      concepto: inv.concepto as string | null,
      forma_pago: inv.forma_pago as string | null,
      metodo_pago: inv.metodo_pago as string | null,
      period: inv.period as string,
      match_status: (inv.match_status as string) || 'pending',
      matched_transaction_id: inv.matched_transaction_id as string | null,
    }))
    setInvoices(invoicesWithDefaults)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadResult(null)

    try {
      // Validate file type - now accepts Excel
      const fileName = file.name.toLowerCase()
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        throw new Error('Solo se aceptan archivos Excel (.xlsx)')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/invoices/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar')
      }

      // Detectar tipo para mostrar mensaje apropiado
      const tipoStr = data.type === 'emitida' ? 'emitidas' : 'recibidas'

      setUploadResult({
        success: true,
        message: `Importadas ${data.total} facturas ${tipoStr} (${data.vigentes} vigentes, ${data.canceladas} canceladas)`,
        details: data.warnings && data.warnings.length > 0 ? data.warnings : undefined
      })

      // Cambiar tab al tipo importado
      setActiveTab(data.type === 'emitida' ? 'emitidas' : 'recibidas')

      // Refresh list
      await fetchInvoices()

    } catch (error) {
      console.error('Import error:', error)
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
    e.target.value = ''
  }

  // Filtrar solo facturas vigentes para cálculos
  const vigentes = invoices.filter(inv => inv.status === 'vigente')
  const emitidas = vigentes.filter(inv => inv.type === 'emitida')
  const recibidas = vigentes.filter(inv => inv.type === 'recibida')

  // Totales
  const totalEmitidas = emitidas.reduce((acc, inv) => acc + Number(inv.total), 0)
  const totalRecibidas = recibidas.reduce((acc, inv) => acc + Number(inv.total), 0)
  const ivaTrasladadoTotal = emitidas.reduce((acc, inv) => acc + Number(inv.iva || 0), 0)
  const ivaAcreditableTotal = recibidas.reduce((acc, inv) => acc + Number(inv.iva || 0), 0)
  const ivaRetenidoTotal = emitidas.reduce((acc, inv) => acc + Number(inv.retained_iva || 0), 0)
  const isrRetenidoTotal = emitidas.reduce((acc, inv) => acc + Number(inv.retained_isr || 0), 0)

  // Para mostrar en tabla (incluye canceladas con indicador)
  const emitidasAll = invoices.filter(inv => inv.type === 'emitida')
  const recibidasAll = invoices.filter(inv => inv.type === 'recibida')

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMatchStatusBadge = (status: string, hasMatch: boolean) => {
    if (hasMatch || status === 'matched') {
      return <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50"><Link2 className="h-3 w-3" />Conciliada</Badge>
    }
    if (status === 'unmatched') {
      return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50"><Link2Off className="h-3 w-3" />Sin match</Badge>
    }
    return <Badge variant="outline" className="gap-1 text-muted-foreground"><Link2Off className="h-3 w-3" />Pendiente</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Facturas</h1>
        <p className="text-sm text-muted-foreground">
          Importa tus facturas de MiAdmin y concílialas con tus estados de cuenta
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Facturados</CardTitle>
            <div className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalEmitidas)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {emitidas.length} facturas emitidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Facturados</CardTitle>
            <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalRecibidas)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recibidas.length} facturas recibidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA Trasladado</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal bg-green-100 text-green-700">Cobrado</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{formatCurrency(ivaTrasladadoTotal)}</div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {ivaRetenidoTotal > 0 && (
                <p>Retenido: -{formatCurrency(ivaRetenidoTotal)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA Acreditable</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal bg-blue-100 text-blue-700">Deducible</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-600">{formatCurrency(ivaAcreditableTotal)}</div>
            {isrRetenidoTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ISR Retenido: {formatCurrency(isrRetenidoTotal)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Importar Facturas de MiAdmin</CardTitle>
          <CardDescription className="text-sm">
            Sube el archivo Excel exportado de MiAdmin (Emitidas o Recibidas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-md p-6 text-center transition-colors
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              ${isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-secondary/30'}
            `}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="excel-upload"
              disabled={isUploading}
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
                  <p className="text-sm font-medium">Importando facturas...</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo Excel de MiAdmin'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {'{RFC}_Emitidas_2025_12_Facturas.xlsx'} o {'{RFC}_Recibidas_2025_12_Facturas.xlsx'}
                  </p>
                  <Button variant="outline" className="mt-3" type="button" size="sm">
                    Seleccionar archivo
                  </Button>
                </>
              )}
            </label>
          </div>

          {uploadResult && (
            <div className={`mt-4 p-3 text-sm rounded-md border ${
              uploadResult.success
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-destructive bg-destructive/10 border-destructive/20'
            }`}>
              <div className="flex items-center gap-2">
                {uploadResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {uploadResult.message}
              </div>
              {uploadResult.details && uploadResult.details.length > 0 && (
                <div className="mt-2 text-xs opacity-80">
                  {uploadResult.details.slice(0, 3).map((d, i) => (
                    <p key={i}>{d}</p>
                  ))}
                  {uploadResult.details.length > 3 && (
                    <p>...y {uploadResult.details.length - 3} advertencias más</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Listado de Facturas</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInvoices()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay facturas importadas</p>
              <p className="text-xs mt-1">Sube tu archivo Excel de MiAdmin para comenzar</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'emitidas' | 'recibidas')}>
              <TabsList className="mb-4">
                <TabsTrigger value="emitidas" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Emitidas ({emitidasAll.length})
                </TabsTrigger>
                <TabsTrigger value="recibidas" className="gap-2">
                  <ArrowDownLeft className="h-4 w-4" />
                  Recibidas ({recibidasAll.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="emitidas">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Fecha</TableHead>
                        <TableHead>Receptor</TableHead>
                        <TableHead className="w-[120px]">RFC</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                        <TableHead className="text-right w-[80px]">IVA</TableHead>
                        <TableHead className="text-right w-[100px]">Total</TableHead>
                        <TableHead className="w-[100px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emitidasAll.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No hay facturas emitidas
                          </TableCell>
                        </TableRow>
                      ) : (
                        emitidasAll.map((invoice) => (
                          <TableRow key={invoice.id} className={invoice.status === 'cancelado' ? 'opacity-50' : ''}>
                            <TableCell className="text-sm">{formatDate(invoice.fecha)}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {invoice.nombre_receptor || '-'}
                              {invoice.status === 'cancelado' && (
                                <Badge variant="destructive" className="ml-2 text-xs">Cancelada</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{invoice.rfc_receptor}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate" title={invoice.concepto || ''}>
                              {invoice.concepto || '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(invoice.subtotal)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(invoice.iva || 0)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(invoice.total)}</TableCell>
                            <TableCell>
                              {invoice.status === 'vigente' && getMatchStatusBadge(invoice.match_status, !!invoice.matched_transaction_id)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="recibidas">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Fecha</TableHead>
                        <TableHead>Emisor</TableHead>
                        <TableHead className="w-[120px]">RFC</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                        <TableHead className="text-right w-[80px]">IVA</TableHead>
                        <TableHead className="text-right w-[100px]">Total</TableHead>
                        <TableHead className="w-[100px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recibidasAll.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No hay facturas recibidas
                          </TableCell>
                        </TableRow>
                      ) : (
                        recibidasAll.map((invoice) => (
                          <TableRow key={invoice.id} className={invoice.status === 'cancelado' ? 'opacity-50' : ''}>
                            <TableCell className="text-sm">{formatDate(invoice.fecha)}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {invoice.nombre_emisor || '-'}
                              {invoice.status === 'cancelado' && (
                                <Badge variant="destructive" className="ml-2 text-xs">Cancelada</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{invoice.rfc_emisor}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate" title={invoice.concepto || ''}>
                              {invoice.concepto || '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(invoice.subtotal)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(invoice.iva || 0)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(invoice.total)}</TableCell>
                            <TableCell>
                              {invoice.status === 'vigente' && getMatchStatusBadge(invoice.match_status, !!invoice.matched_transaction_id)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
