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
import { Upload, Receipt, ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Invoice {
  id: string
  uuid_fiscal: string
  type: 'emitida' | 'recibida'
  fecha: string
  rfc_emisor: string
  nombre_emisor: string | null
  rfc_receptor: string
  nombre_receptor: string | null
  subtotal: number
  iva: number
  total: number
  concepto: string | null
  period: string
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
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

    setInvoices((data || []) as Invoice[])
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
      // Validate file type
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        throw new Error('Solo se aceptan archivos CSV')
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

      setUploadResult({
        success: true,
        message: `Importadas ${data.imported} facturas (${data.emitidas} emitidas, ${data.recibidas} recibidas)`
      })

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

  const emitidas = invoices.filter(inv => inv.type === 'emitida')
  const recibidas = invoices.filter(inv => inv.type === 'recibida')

  const totalEmitidas = emitidas.reduce((acc, inv) => acc + Number(inv.total), 0)
  const totalRecibidas = recibidas.reduce((acc, inv) => acc + Number(inv.total), 0)
  const ivaTrasladadoTotal = emitidas.reduce((acc, inv) => acc + Number(inv.iva), 0)
  const ivaAcreditableTotal = recibidas.reduce((acc, inv) => acc + Number(inv.iva), 0)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Facturas</h1>
        <p className="text-sm text-muted-foreground">
          Importa y visualiza tus facturas de MiAdmin
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturas Emitidas</CardTitle>
            <div className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalEmitidas)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {emitidas.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturas Recibidas</CardTitle>
            <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalRecibidas)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recibidas.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA Trasladado</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal bg-accent text-primary">Cobrado</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(ivaTrasladadoTotal)}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none hover:bg-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA Acreditable</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal bg-secondary">Pagado</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(ivaAcreditableTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Importar Facturas</CardTitle>
          <CardDescription className="text-sm">
            Sube el archivo CSV exportado de MiAdmin
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
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
              disabled={isUploading}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
                  <p className="text-sm font-medium">Importando facturas...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragging ? 'Suelta el archivo aqui' : 'Arrastra tu archivo CSV de MiAdmin'}
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
                {uploadResult.success && <CheckCircle2 className="h-4 w-4" />}
                {uploadResult.message}
              </div>
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
              <p className="text-xs mt-1">Sube tu CSV de MiAdmin para comenzar</p>
            </div>
          ) : (
            <Tabs defaultValue="emitidas">
              <TabsList className="mb-4">
                <TabsTrigger value="emitidas" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Emitidas ({emitidas.length})
                </TabsTrigger>
                <TabsTrigger value="recibidas" className="gap-2">
                  <ArrowDownLeft className="h-4 w-4" />
                  Recibidas ({recibidas.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="emitidas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Receptor</TableHead>
                      <TableHead>RFC</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emitidas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No hay facturas emitidas
                        </TableCell>
                      </TableRow>
                    ) : (
                      emitidas.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="text-sm">{formatDate(invoice.fecha)}</TableCell>
                          <TableCell className="text-sm font-medium">{invoice.nombre_receptor || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{invoice.rfc_receptor}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{invoice.concepto || '-'}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(invoice.subtotal)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(invoice.iva)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(invoice.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="recibidas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Emisor</TableHead>
                      <TableHead>RFC</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recibidas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No hay facturas recibidas
                        </TableCell>
                      </TableRow>
                    ) : (
                      recibidas.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="text-sm">{formatDate(invoice.fecha)}</TableCell>
                          <TableCell className="text-sm font-medium">{invoice.nombre_emisor || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{invoice.rfc_emisor}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{invoice.concepto || '-'}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(invoice.subtotal)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(invoice.iva)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(invoice.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
