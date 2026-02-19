
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Calculator, 
  Database, 
  Cpu, 
  TrendingUp, 
  Zap,
  Globe,
  HardDrive,
  Info
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function CostsAnalysisPage() {
  const [mounted, setMounted] = useState(false)
  const [monthlyBids, setMonthlyBids] = useState(500)
  const [monthlyAudits, setMonthlyAudits] = useState(200)
  const [massIngestion, setMassIngestion] = useState(12883)

  useEffect(() => {
    setMounted(true)
  }, [])

  // CONSTANTES DE PRECIOS GOOGLE CLOUD (REGION US-CENTRAL1)
  const USD_TO_CLP = 950
  const COST_PER_ANALYSIS_USD = 0.005 
  const COST_PER_AUDIT_USD = 0.01 
  const COST_FIRESTORE_WRITE_1K_USD = 0.0018 // $0.18 per 100k
  const COST_FIRESTORE_STORAGE_GB_USD = 0.18 // $0.18 per GB/month
  
  // ESTIMACIÓN DE TAMAÑO: ~10KB por licitación enriquecida con IA
  const totalGbs = (massIngestion * 10) / (1024 * 1024)
  const freeTierGb = 1.0
  const taxableGbs = Math.max(0, totalGbs - freeTierGb)

  const estimatedAiCost = ((monthlyBids * COST_PER_ANALYSIS_USD) + (monthlyAudits * COST_PER_AUDIT_USD)) * USD_TO_CLP
  const estimatedWriteCost = ((massIngestion / 1000) * COST_FIRESTORE_WRITE_1K_USD) * USD_TO_CLP
  const estimatedStorageCost = taxableGbs * COST_FIRESTORE_STORAGE_GB_USD * USD_TO_CLP
  
  const totalMonthlyCost = estimatedAiCost + estimatedStorageCost

  const formatCLP = (amount: number) => {
    if (!mounted) return "$ -"
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const safeLocaleString = (num: number) => {
    return mounted ? num.toLocaleString() : num.toString()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic">Análisis de Costos Operativos</h2>
          <p className="text-muted-foreground font-medium italic">Calcula tu margen basado en el volumen real de datos en Firestore.</p>
        </div>
        <Badge className="bg-accent text-white px-4 py-1 text-xs font-bold uppercase italic tracking-widest">Valores en CLP</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-8">
              <CardTitle className="flex items-center gap-2 text-primary font-black uppercase italic">
                <Calculator className="h-5 w-5 text-accent" /> Simulador de Volumen Maestro
              </CardTitle>
              <CardDescription className="italic font-medium">Ajusta la cantidad de licitaciones almacenadas para ver el costo de permanencia.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <Label className="font-black uppercase italic text-sm text-primary">Volumen en Base de Datos (Firestore)</Label>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Licitaciones totales guardadas en el repositorio</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 font-black">
                    {safeLocaleString(massIngestion)} <span className="text-[10px] ml-1 opacity-50">REGISTROS</span>
                  </Badge>
                </div>
                <Slider 
                  value={[massIngestion]} 
                  onValueChange={(v) => setMassIngestion(v[0])} 
                  max={200000} 
                  step={1000} 
                  className="py-4"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-[10px] text-blue-800 font-bold uppercase">Espacio Estimado</p>
                      <p className="text-sm font-black text-blue-900">{totalGbs.toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <Info className="h-5 w-5 text-emerald-600" />
                    <p className="text-[9px] text-emerald-800 font-bold uppercase italic leading-tight">
                      Google Cloud regala 1 GB. <br/>{totalGbs < 1024 ? "COSTO DE ALMACENAMIENTO: $0" : "Superaste la capa gratuita."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <Label className="font-black uppercase italic text-sm text-primary">Análisis Estratégicos Mensuales (IA)</Label>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Consumo de Google Gemini 2.5 Flash</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 font-black text-accent">{monthlyBids}</Badge>
                </div>
                <Slider 
                  value={[monthlyBids]} 
                  onValueChange={(v) => setMonthlyBids(v[0])} 
                  max={10000} 
                  step={100} 
                  className="py-4"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-emerald-50 shadow-lg rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black flex items-center gap-2 text-emerald-800 uppercase tracking-widest">
                  <Cpu className="h-4 w-4" /> Costo IA (Gemini)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-emerald-600 italic">{formatCLP(estimatedAiCost)} <span className="text-sm text-emerald-800/50">/mes</span></div>
                <p className="text-[10px] text-emerald-700/70 mt-2 uppercase font-bold tracking-widest">Basado en volumen de consultas</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-blue-50 shadow-lg rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black flex items-center gap-2 text-blue-800 uppercase tracking-widest">
                  <Database className="h-4 w-4" /> Costo Cloud (Firestore)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-blue-600 italic">{formatCLP(estimatedStorageCost)} <span className="text-sm text-blue-800/50">/mes</span></div>
                <p className="text-[10px] text-blue-700/70 mt-2 uppercase font-bold tracking-widest">Almacenamiento de permanencia</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden relative rounded-[2rem]">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingUp className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-black italic uppercase tracking-widest text-accent">Total Infraestructura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-5xl font-black text-white italic tracking-tighter">{formatCLP(totalMonthlyCost)}</div>
              <p className="text-primary-foreground/70 text-sm leading-relaxed italic font-medium">
                Este es el costo neto de mantener {safeLocaleString(massIngestion)} procesos activos con inteligencia.
              </p>
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-70 font-black uppercase tracking-widest">Costo por Licitación</span>
                  <span className="font-black text-accent">{formatCLP(totalMonthlyCost / (monthlyBids || 1))}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-70 font-black uppercase tracking-widest text-emerald-400">Ingreso Sugerido (1.5 UF)</span>
                  <span className="font-black text-emerald-400">{formatCLP(1.5 * 37000)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 bg-accent/5 rounded-[2rem] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xs font-black flex items-center gap-2 text-primary uppercase tracking-widest italic">
                <Zap className="h-4 w-4 text-accent" /> Datos para SuperAdmin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="text-[10px] flex gap-2">
                  <div className="h-4 w-4 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 text-accent font-black">1</div>
                  <span><b>Escalabilidad</b>: Firestore es barato para almacenar. Lo caro es leer y escribir masivamente sin control.</span>
                </li>
                <li className="text-[10px] flex gap-2">
                  <div className="h-4 w-4 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 text-accent font-black">2</div>
                  <span><b>Optimización</b>: La IA multimodal (PDF) es lo más costoso. Úsala solo en licitaciones de alto monto.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
