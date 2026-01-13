'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header con logo */}
      <header className="p-6">
        <Image
          src="/taxogo-logo.png"
          alt="TaxGo"
          width={140}
          height={45}
          className="object-contain"
        />
      </header>

      {/* Contenido centrado */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[340px] space-y-8">
          {/* Titulo y subtitulo */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Simplifica tus impuestos.
            </h1>
            <p className="text-muted-foreground text-sm">
              Calcula. Concilia. Cumple. Con la inteligencia de{' '}
              <span className="text-foreground font-medium">TaxGo</span>.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-sm font-normal">
                Correo electronico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 bg-background border-input rounded-md focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-sm font-normal">
                Contrasena
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 bg-background border-input rounded-md focus:border-primary focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
            >
              {loading ? 'Ingresando...' : 'Continuar'}
            </Button>
          </form>

          {/* Footer del form */}
          <p className="text-center text-xs text-muted-foreground">
            Panel exclusivo para contribuyentes RESICO.
          </p>
        </div>
      </main>
    </div>
  )
}
