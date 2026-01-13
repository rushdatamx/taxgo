'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Building2, Bell, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    nombre: '',
    rfc: '',
    email: 'usuario@ejemplo.com',
    phone: '',
    fechaAltaResico: '',
  })

  const handleSave = () => {
    // TODO: Implement save to Supabase
    console.log('Saving profile:', profile)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Perfil</CardTitle>
          </div>
          <CardDescription>
            Informacion de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={profile.nombre}
                onChange={(e) => setProfile({ ...profile, nombre: e.target.value })}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono (WhatsApp)</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Informacion Fiscal</CardTitle>
          </div>
          <CardDescription>
            Datos para el calculo de impuestos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                value={profile.rfc}
                onChange={(e) => setProfile({ ...profile, rfc: e.target.value.toUpperCase() })}
                placeholder="XAXX010101000"
                maxLength={13}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaResico">Fecha de alta en RESICO</Label>
              <Input
                id="fechaResico"
                type="date"
                value={profile.fechaAltaResico}
                onChange={(e) => setProfile({ ...profile, fechaAltaResico: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Badge variant="outline">RESICO</Badge>
            <span className="text-sm text-muted-foreground">
              Regimen Simplificado de Confianza
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notificaciones</CardTitle>
          </div>
          <CardDescription>
            Preferencias de alertas y recordatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Recordatorio mensual</p>
              <p className="text-sm text-muted-foreground">
                Recibe un mensaje el dia 5 de cada mes para subir tu estado de cuenta
              </p>
            </div>
            <Badge variant="default">Activo</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alerta de fecha limite</p>
              <p className="text-sm text-muted-foreground">
                Notificacion 2 dias antes de la fecha limite de pago
              </p>
            </div>
            <Badge variant="default">Activo</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Canal de notificaciones</p>
              <p className="text-sm text-muted-foreground">
                Recibe alertas por WhatsApp
              </p>
            </div>
            <Badge variant="outline">WhatsApp</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Seguridad</CardTitle>
          </div>
          <CardDescription>
            Opciones de seguridad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cambiar contrasena</p>
              <p className="text-sm text-muted-foreground">
                Actualiza tu contrasena de acceso
              </p>
            </div>
            <Button variant="outline" size="sm">
              Cambiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
