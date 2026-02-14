
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Send, Calendar, Users, Sparkles, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function OutreachPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Campañas de Outreach</h2>
        <p className="text-muted-foreground">Automatiza la invitación de nuevas empresas a la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Audiencia Potencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">142</div>
            <p className="text-xs text-muted-foreground mt-1">Empresas identificadas sin contacto</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="h-4 w-4 text-accent" /> Promedio de Apertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground mt-1">En campañas del último mes</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" /> Tiempo de Conversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">4.2d</div>
            <p className="text-xs text-muted-foreground mt-1">Desde invitación a registro</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-2 border-primary/10">
        <CardHeader className="bg-muted/50 p-8 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-white">Campaña Activa</Badge>
                <Badge variant="outline" className="border-accent text-accent">IA Optimized</Badge>
              </div>
              <CardTitle className="text-2xl font-black text-primary pt-2 italic">Invitación Automatizada V2</CardTitle>
              <CardDescription className="text-md">Enviando invitaciones personalizadas a empresas del rubro "Tecnología".</CardDescription>
            </div>
            <Button className="bg-accent hover:bg-accent/90 gap-2 h-12 px-8 font-bold text-lg shadow-lg">
              <Sparkles className="h-5 w-5" /> Optimizar con IA
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-8 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">No hay envíos pendientes hoy</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">La IA ha programado el próximo lote de correos para mañana a las 09:00 AM para maximizar la tasa de apertura.</p>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">Ver Historial de Envíos</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
