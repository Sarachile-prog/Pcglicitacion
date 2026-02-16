
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Settings as SettingsIcon, 
  Key, 
  Globe, 
  Database, 
  ShieldCheck, 
  Save, 
  RefreshCw,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  CalendarClock,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import Link from "next/link"

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [apiKey, setApiKey] = useState("") 
  const [isLive, setIsLive] = useState(true) 
  const [isSaving, setIsSaving] = useState(false)

  // Cargar configuración existente
  const configRef = useMemoFirebase(() => doc(db, "settings", "mercado_publico"), [db])
  const { data: config, isLoading: isConfigLoading } = useDoc(configRef)

  useEffect(() => {
    if (config?.ticket) {
      setApiKey(config.ticket)
    }
  }, [config])

  const handleSave = async () => {
    if (!db || !user) return
    setIsSaving(true)
    
    try {
      await setDoc(doc(db, "settings", "mercado_publico"), {
        ticket: apiKey,
        updatedAt: new Date().toISOString(),
        isLive: isLive
      }, { merge: true })

      toast({
        title: "Configuración guardada",
        description: "El ticket de API se ha actualizado correctamente.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de permisos",
        description: "Debes estar autenticado para realizar cambios.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isConfigLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando configuración segura...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Configuración</h2>
          <p className="text-muted-foreground">Administra las llaves de acceso al ecosistema de Mercado Público.</p>
        </div>
        {!user && (
          <Link href="/login">
            <Button variant="outline" className="border-accent text-accent">
              <Lock className="h-4 w-4 mr-2" /> Iniciar Sesión para Editar
            </Button>
          </Link>
        )}
      </div>

      {!user && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 flex items-center gap-4 text-orange-800">
            <AlertCircle className="h-8 w-8 shrink-0" />
            <p className="text-sm font-medium">
              Actualmente estás en modo lectura. Para actualizar el ticket de la API, haz clic en el botón <b>Acceso Admin</b> y selecciona <b>Acceso Rápido</b>.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className={!user ? "opacity-60 pointer-events-none" : ""}>
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" /> Credenciales API
                  </CardTitle>
                  <CardDescription>Usa tu ticket de desarrollador para sincronizar datos reales.</CardDescription>
                </div>
                <Badge className={isLive ? "bg-green-500" : "bg-muted"}>
                  {isLive ? "PRODUCCIÓN" : "DESARROLLO"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="api-ticket">Ticket Oficial (ChileCompra)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="api-ticket" 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Pega aquí tu ticket..." 
                    className="font-mono"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Puedes obtenerlo registrándote en <a href="https://desarrolladores.mercadopublico.cl/" target="_blank" className="text-primary underline">desarrolladores.mercadopublico.cl</a>
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Modo Conectado</Label>
                  <p className="text-xs text-muted-foreground">Activa las llamadas automáticas a la API oficial.</p>
                </div>
                <Switch 
                  checked={isLive}
                  onCheckedChange={setIsLive}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                <CalendarClock className="h-5 w-5 text-emerald-600" /> Tareas Programadas
              </CardTitle>
              <CardDescription className="text-emerald-700/70">Automatización del flujo de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-900">Sincronización Automática Diaria</p>
                  <p className="text-xs text-emerald-700">Lunes a Viernes, 08:00 AM (Chile)</p>
                </div>
                <Badge className="bg-emerald-600 text-white gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Activo
                </Badge>
              </div>
              <p className="text-xs text-emerald-600 italic px-2">
                * Esta tarea sincroniza automáticamente todas las nuevas licitaciones publicadas en el portal de Mercado Público.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Button 
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 gap-2 shadow-xl" 
            onClick={handleSave}
            disabled={isSaving || !user}
          >
            {!user ? (
              <><Lock className="h-5 w-5" /> Inicia Sesión Primero</>
            ) : isSaving ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-5 w-5" /> Guardar Configuración</>
            )}
          </Button>

          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-accent">Soporte</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-primary-foreground/80 leading-relaxed">
              El sistema realiza una limpieza automática de caché cada 24 horas para asegurar que las licitaciones siempre reflejen el estado más reciente del portal oficial.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
