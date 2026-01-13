'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Upload, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

// Mock data
const mockStatements = [
  {
    id: '1',
    bank: 'Santander',
    period: '2024-01',
    status: 'completed',
    uploadedAt: '2024-01-15',
    transactions: 28,
  },
  {
    id: '2',
    bank: 'Santander',
    period: '2023-12',
    status: 'completed',
    uploadedAt: '2024-01-05',
    transactions: 32,
  },
  {
    id: '3',
    bank: 'Santander',
    period: '2023-11',
    status: 'completed',
    uploadedAt: '2023-12-03',
    transactions: 25,
  },
]

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' as const },
  processing: { label: 'Procesando', icon: Clock, variant: 'outline' as const },
  completed: { label: 'Completado', icon: CheckCircle2, variant: 'default' as const },
  error: { label: 'Error', icon: AlertCircle, variant: 'destructive' as const },
}

export default function StatementsPage() {
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
    // TODO: Implement file upload to Supabase Storage
    console.log('Uploading file:', file.name)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estados de Cuenta</h1>
        <p className="text-muted-foreground">
          Sube y gestiona tus estados de cuenta bancarios
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Subir Estado de Cuenta</CardTitle>
          <CardDescription>
            Arrastra y suelta tu archivo PDF o haz clic para seleccionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragging ? 'Suelta el archivo aqui' : 'Arrastra tu estado de cuenta PDF'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Soportamos: Santander, BBVA, Banorte y mas
              </p>
              <Button variant="outline" className="mt-4" type="button">
                Seleccionar archivo
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Statements History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>
            Estados de cuenta procesados anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Fecha de Subida</TableHead>
                <TableHead>Transacciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStatements.map((statement) => {
                const status = statusConfig[statement.status as keyof typeof statusConfig]
                const StatusIcon = status.icon
                return (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {statement.bank}
                      </div>
                    </TableCell>
                    <TableCell>{statement.period}</TableCell>
                    <TableCell>{statement.uploadedAt}</TableCell>
                    <TableCell>{statement.transactions}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Ver detalles
                      </Button>
                    </TableCell>
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
