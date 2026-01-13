'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Statement {
  id: string
  bank_id: string | null
  period: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  file_url: string
  error_message: string | null
  created_at: string | null
  banks: { name: string } | null
  transaction_count?: number
}

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' as const, color: 'text-muted-foreground', animate: false },
  processing: { label: 'Procesando...', icon: Loader2, variant: 'outline' as const, color: 'text-blue-500', animate: true },
  completed: { label: 'Completado', icon: CheckCircle2, variant: 'default' as const, color: 'text-green-500', animate: false },
  error: { label: 'Error', icon: AlertCircle, variant: 'destructive' as const, color: 'text-destructive', animate: false },
}

export default function StatementsPage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [statements, setStatements] = useState<Statement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchStatements = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('bank_statements')
      .select(`
        id,
        bank_id,
        period,
        status,
        file_url,
        error_message,
        created_at,
        banks (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching statements:', error)
      return
    }

    if (!data) {
      setStatements([])
      setIsLoading(false)
      return
    }

    // Get transaction counts
    const statementsWithCounts = await Promise.all(
      data.map(async (stmt: { id: string; bank_id: string | null; period: string; status: string | null; file_url: string; error_message: string | null; created_at: string | null; banks: { name: string } | null }) => {
        const { count } = await supabase
          .from('bank_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('statement_id', stmt.id)

        return {
          id: stmt.id,
          bank_id: stmt.bank_id,
          period: stmt.period,
          status: stmt.status as 'pending' | 'processing' | 'completed' | 'error',
          file_url: stmt.file_url,
          error_message: stmt.error_message,
          created_at: stmt.created_at,
          banks: stmt.banks,
          transaction_count: count || 0,
        }
      })
    )

    setStatements(statementsWithCounts)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStatements()
  }, [fetchStatements])

  // Poll for processing statements
  useEffect(() => {
    const processingStatements = statements.filter(s => s.status === 'processing')
    if (processingStatements.length === 0) return

    const interval = setInterval(() => {
      fetchStatements()
    }, 3000)

    return () => clearInterval(interval)
  }, [statements, fetchStatements])

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
    setUploadError(null)

    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('Solo se aceptan archivos PDF')
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('El archivo excede el limite de 10MB')
      }

      // 1. Upload file
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/statements/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Error al subir archivo')
      }

      const { statementId } = await uploadResponse.json()

      // 2. Trigger processing
      const processResponse = await fetch('/api/statements/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId }),
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        console.error('Process error:', errorData)
        // Don't throw - statement was uploaded, just processing failed
      }

      // 3. Refresh list
      await fetchStatements()

    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
    // Reset input
    e.target.value = ''
  }

  const handleRetry = async (statementId: string) => {
    try {
      const response = await fetch('/api/statements/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al procesar')
      }

      await fetchStatements()
    } catch (error) {
      console.error('Retry error:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPeriod = (period: string) => {
    if (period === 'pending' || !period) return 'Detectando...'
    const [year, month] = period.split('-')
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Estados de Cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Sube y gestiona tus estados de cuenta bancarios
        </p>
      </div>

      {/* Upload Zone */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Subir Estado de Cuenta</CardTitle>
          <CardDescription className="text-sm">
            Arrastra tu archivo PDF o haz clic para seleccionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-md p-8 text-center transition-colors
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              ${isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-secondary/30'}
            `}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {isUploading ? (
                <>
                  <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-sm font-medium">Subiendo y procesando...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esto puede tomar unos segundos
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragging ? 'Suelta el archivo aqui' : 'Arrastra tu estado de cuenta PDF'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Santander, Citibanamex, BBVA, Banorte y mas
                  </p>
                  <Button variant="outline" className="mt-4" type="button">
                    Seleccionar archivo
                  </Button>
                </>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {uploadError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statements History */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Historial</CardTitle>
              <CardDescription className="text-sm">
                Estados de cuenta procesados
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchStatements()}
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
          ) : statements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay estados de cuenta</p>
              <p className="text-xs mt-1">Sube tu primer PDF para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Subido</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => {
                  const status = statusConfig[statement.status]
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={statement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm">
                            {statement.banks?.name || 'Detectando...'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatPeriod(statement.period)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {statement.created_at ? formatDate(statement.created_at) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {statement.status === 'completed' ? statement.transaction_count : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className={`gap-1 ${status.variant === 'default' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                        >
                          <StatusIcon className={`h-3 w-3 ${status.animate ? 'animate-spin' : ''}`} />
                          {status.label}
                        </Badge>
                        {statement.status === 'error' && statement.error_message && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">
                            {statement.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {statement.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(statement.id)}
                          >
                            Reintentar
                          </Button>
                        )}
                        {statement.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/statements/${statement.id}`)}
                          >
                            Ver detalles
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
