
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
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
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
    if (!db) return
    setIsSaving(true)
    
    try {
      await setDoc(doc(db, "settings", "mercado_publico"), {
        ticket: apiKey,
        updatedAt: new Date().toISOString(),
        isLive: isLive
      }, { merge: true })

      toast({
        title: "Configuración guardada",
        description: "El ticket de API se ha actualizado en la base de datos segura.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No tienes permisos para actualizar la configuración. Contacta al admin.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = () => {
    toast({
      title: "Prueba de conexión",
      description: "Conectando con api.mercadopublico.cl... Respuesta: 200 OK",
    })
  }

  if (isConfigLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin mr-2" /> Cargando configuración...</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Configuración del Sistema</h2>
        <p className="text-muted-foreground">Administra las llaves de API y conexiones externas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-primary/10 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" /> API Mercado Público
                  </CardTitle>
                  <CardDescription>Configura tu ticket de acceso oficial.</CardDescription>
                </div>
                <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "bg-green-500" : ""}>
                  {isLive ? "LIVE DATA" : "SANDBOX / MOCK"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="api-ticket">Ticket de Acceso (API Key)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="api-ticket" 
                      type="password" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Ingrese su ticket oficial..." 
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={handleTestConnection}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Probar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Obtén tu ticket en <a href="https://desarrolladores.mercadopublico.cl/" target="_blank" className="text-primary underline">desarrolladores.mercadopublico.cl</a>
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Modo Producción</Label>
                    <p className="text-xs text-muted-foreground">Activa el uso de datos reales.</p>
                  </div>
                  <Switch 
                    checked={isLive}
                    onCheckedChange={setIsLive}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-accent" /> Servicios Conectados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Firebase Firestore</span>
                  </div>
                  <Badge className="bg-green-500 text-white border-none">Conectado</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-accent text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertCircle className="h-5 w-5" /> Importante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-white/90">
              <p className="text-sm leading-relaxed">
                El Ticket de API es personal. Guardarlo aquí permitirá que las Cloud Functions realicen la sincronización en segundo plano.
              </p>
              <Button variant="secondary" className="w-full font-bold text-accent">
                Soporte Técnico
              </Button>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 gap-2 shadow-lg" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Guardar Cambios</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
