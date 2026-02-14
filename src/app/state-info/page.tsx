
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Landmark, Globe, ExternalLink, ShieldCheck, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StateInfoPage() {
  const entities = [
    {
      name: "Ministerio de Hacienda",
      role: "Supervisión Financiera",
      description: "Encargado de la gestión de recursos públicos y aprobación de presupuestos mayores.",
      website: "hacienda.cl"
    },
    {
      name: "Dirección de Compras Públicas",
      role: "Administrador del Sistema",
      description: "Entidad técnica que regula y opera la plataforma de licitaciones a nivel nacional.",
      website: "mercadopublico.cl"
    },
    {
      name: "Contraloría General",
      role: "Fiscalización",
      description: "Organismo autónomo que vela por la legalidad de los actos de la administración del Estado.",
      website: "contraloria.cl"
    }
  ]

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Información del Estado</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Conoce las entidades y marcos regulatorios que rigen las compras públicas en Chile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {entities.map((entity) => (
          <Card key={entity.name} className="hover:shadow-lg transition-all border-none bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="h-1 bg-accent" />
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">{entity.name}</CardTitle>
              <Badge variant="outline" className="w-fit border-accent text-accent">{entity.role}</Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {entity.description}
              </p>
              <Button variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5">
                <Globe className="h-4 w-4" /> Visitar {entity.website} <ExternalLink className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
        <Card className="bg-primary text-white border-none shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-accent" /> Marco Legal y Probidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-primary-foreground/80">Todas las licitaciones mostradas en esta plataforma se rigen por la Ley de Compras Públicas 19.886 y sus respectivos reglamentos.</p>
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</div>
                <p className="text-sm font-medium">Transparencia: Todos los procesos son públicos y auditables.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</div>
                <p className="text-sm font-medium">Igualdad: Todas las empresas tienen el mismo derecho a participar.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">3</div>
                <p className="text-sm font-medium">No Discriminación: No se permite favorecer arbitrariamente a ningún proveedor.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <HelpCircle className="h-6 w-6 text-accent" /> Preguntas Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <details className="group border-b border-border pb-4 cursor-pointer">
              <summary className="font-bold text-sm flex justify-between items-center list-none">
                ¿Qué es una Licitación Pública?
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Es un procedimiento administrativo de concursabilidad mediante el cual la administración invita a los proveedores a presentar ofertas sobre una materia determinada.
              </p>
            </details>
            <details className="group border-b border-border pb-4 cursor-pointer">
              <summary className="font-bold text-sm flex justify-between items-center list-none">
                ¿Quiénes pueden participar?
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Cualquier persona natural o jurídica, nacional o extranjera, que cumpla con los requisitos establecidos en las bases y la ley.
              </p>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
