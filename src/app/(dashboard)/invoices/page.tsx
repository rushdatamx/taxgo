'use client'

import { useState } from 'react'
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
import { Upload, Receipt, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

// Mock data
const mockInvoices = {
  emitidas: [
    {
      id: '1',
      uuid: 'ABC123...',
      fecha: '2024-01-10',
      receptor: 'Empresa ABC SA de CV',
      rfcReceptor: 'EAB123456ABC',
      subtotal: 15000,
      iva: 2400,
      total: 17400,
      concepto: 'Servicios de consultoria',
    },
    {
      id: '2',
      uuid: 'DEF456...',
      fecha: '2024-01-05',
      receptor: 'Cliente XYZ',
      rfcReceptor: 'CXY987654XYZ',
      subtotal: 8500,
      iva: 1360,
      total: 9860,
      concepto: 'Desarrollo de software',
    },
  ],
  recibidas: [
    {
      id: '3',
      uuid: 'GHI789...',
      fecha: '2024-01-08',
      emisor: 'Proveedor Tech SA',
      rfcEmisor: 'PTE123456PTE',
      subtotal: 3500,
      iva: 560,
      total: 4060,
      concepto: 'Equipo de computo',
    },
    {
      id: '4',
      uuid: 'JKL012...',
      fecha: '2024-01-03',
      emisor: 'Servicios Cloud MX',
      rfcEmisor: 'SCM987654SCM',
      subtotal: 1200,
      iva: 192,
      total: 1392,
      concepto: 'Hosting mensual',
    },
  ],
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

export default function InvoicesPage() {
  const [isDragging, setIsDragging] = useState(false)

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

  const handleFileUpload = (file: File) => {
    // TODO: Implement CSV parsing
    console.log('Uploading file:', file.name)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const totalEmitidas = mockInvoices.emitidas.reduce((acc, inv) => acc + inv.total, 0)
  const totalRecibidas = mockInvoices.recibidas.reduce((acc, inv) => acc + inv.total, 0)
  const ivaTrasladadoTotal = mockInvoices.emitidas.reduce((acc, inv) => acc + inv.iva, 0)
  const ivaAcreditableTotal = mockInvoices.recibidas.reduce((acc, inv) => acc + inv.iva, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
        <p className="text-muted-foreground">
          Importa y visualiza tus facturas de miadmin
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Emitidas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEmitidas)}</div>
            <p className="text-xs text-muted-foreground">
              {mockInvoices.emitidas.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Recibidas</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecibidas)}</div>
            <p className="text-xs text-muted-foreground">
              {mockInvoices.recibidas.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Trasladado</CardTitle>
            <Badge variant="outline" className="text-xs">Cobrado</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ivaTrasladadoTotal)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Acreditable</CardTitle>
            <Badge variant="outline" className="text-xs">Pagado</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ivaAcreditableTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Importar Facturas</CardTitle>
          <CardDescription>
            Sube el archivo CSV exportado de miadmin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragging ? 'Suelta el archivo aqui' : 'Arrastra tu archivo CSV de miadmin'}
              </p>
              <Button variant="outline" className="mt-3" type="button" size="sm">
                Seleccionar archivo
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="emitidas">
            <TabsList>
              <TabsTrigger value="emitidas" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Emitidas ({mockInvoices.emitidas.length})
              </TabsTrigger>
              <TabsTrigger value="recibidas" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Recibidas ({mockInvoices.recibidas.length})
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
                  {mockInvoices.emitidas.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.fecha}</TableCell>
                      <TableCell className="font-medium">{invoice.receptor}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{invoice.rfcReceptor}</TableCell>
                      <TableCell>{invoice.concepto}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.iva)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                    </TableRow>
                  ))}
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
                  {mockInvoices.recibidas.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.fecha}</TableCell>
                      <TableCell className="font-medium">{invoice.emisor}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{invoice.rfcEmisor}</TableCell>
                      <TableCell>{invoice.concepto}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.iva)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
