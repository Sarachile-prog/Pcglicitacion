
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Calculator, 
  Receipt, 
  Coins, 
  Zap, 
  Database, 
  Cpu, 
  TrendingUp, 
  Info,
  ArrowRight,
  BarChart3,
  ShieldCheck
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function CostsAnalysisPage() {
  const [monthlyBids, setMonthlyBids] = useState(500)
  const [monthlyAudits, setMonthlyAudits] = useState(200)

  // Precios estimados (basados en cuotas de Google Cloud / Gemini Flash)
  const COST_PER_ANALYSIS = 0.005 // $0.005 USD por análisis IA profundo
  const COST_PER_AUDIT = 0.01 // $0.01 USD por auditoría multimodal (PDFs consumen más tokens)
  const COST_FIRESTORE_READ_1K = 0.0006 // $0.0006 USD por 1,000 lecturas
  
  const estimatedAiCost = (monthlyBids * COST_PER_ANALYSIS) + (monthlyAudits * COST_PER_AUDIT)
  const estimatedDbCost = (monthlyBids * 0.05) // Estimación de lecturas/escrituras proporcionales
  const totalMonthlyCost = estimatedAiCost + estimatedDbCost

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic">Análisis de Costos Operativos</h2>
          <p className="text-muted-foreground">Calcula tu margen de beneficio basado en el consumo de recursos IA y Cloud.</p>
        </div>
        <Badge className="bg-accent text-white px-4 py-1 text-xs font-bold uppercase">Proyección Financiera</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-2 border-primary/5 shadow-xl">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Simulador de Volumen
              </CardTitle>
              <CardDescription>Ajusta el volumen mensual para ver cómo escalan los costos.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-lg">Licitaciones Analizadas con IA</Label>
                  <Badge variant="secondary" className="text-lg px-4">{monthlyBids}</Badge>
                </div>
                <Slider 
                  value={[monthlyBids]} 
                  onValueChange={(v) => setMonthlyBids(v[0])} 
                  max={5000} 
                  step={100} 
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground italic">Incluye scraping profundo y resumen ejecutivo de bases.</p>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-lg">Auditorías de Anexos PDF</Label>
                  <Badge variant="secondary" className="text-lg px-4">{monthlyAudits}</Badge>
                </div>
                <Slider 
                  value={[monthlyAudits]} 
                  onValueChange={(v) => setMonthlyAudits(v[0])} 
                  max={2000} 
                  step={50} 
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground italic">Costo de procesamiento multimodal de archivos Base64.</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-emerald-50 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
                  <Cpu className="h-4 w-4" /> Costo IA (Gemini Flash)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600">${estimatedAiCost.toFixed(2)} <span className="text-sm text-emerald-800/50">USD/mes</span></div>
                <p className="text-[10px] text-emerald-700/70 mt-2 uppercase font-bold tracking-widest">Optimizado para eficiencia</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-blue-50 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800">
                  <Database className="h-4 w-4" /> Costo Cloud (Firestore)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-600">${estimatedDbCost.toFixed(2)} <span className="text-sm text-blue-800/50">USD/mes</span></div>
                <p className="text-[10px] text-blue-700/70 mt-2 uppercase font-bold tracking-widest">Basado en operaciones CRUD</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingUp className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-black italic uppercase tracking-widest text-accent">Total Operativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-5xl font-black text-white">${totalMonthlyCost.toFixed(2)}</div>
              <p className="text-primary-foreground/70 text-sm leading-relaxed">
                Este es el costo directo de servidores e IA. No incluye costos de desarrollo o marketing.
              </p>
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-70 font-bold uppercase">Costo por Bid</span>
                  <span className="font-black text-accent">${(totalMonthlyCost / (monthlyBids || 1)).toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-70 font-bold uppercase">Margen Sugerido (10x)</span>
                  <span className="font-black text-emerald-400">${(totalMonthlyCost * 10).toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-accent" /> Estrategia de Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dado que tu costo por análisis es extremadamente bajo (~$0.01), puedes optar por:
              </p>
              <ul className="space-y-3">
                <li className="text-xs flex gap-2">
                  <div className="h-4 w-4 rounded bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold">1</div>
                  <span><b>Suscripción SaaS</b>: Cobrar un fee mensual por acceso ilimitado.</span>
                </li>
                <li className="text-xs flex gap-2">
                  <div className="h-4 w-4 rounded bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold">2</div>
                  <span><b>Pay-per-Analysis</b>: Cobrar por cada licitación "inteligente" analizada.</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full mt-4 border-accent text-accent font-bold text-xs uppercase">
                Exportar Reporte
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
