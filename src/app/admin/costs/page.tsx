
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Calculator, 
  Database, 
  Cpu, 
  TrendingUp, 
  Info,
  Server,
  CloudDownload
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function CostsAnalysisPage() {
  const [monthlyBids, setMonthlyBids] = useState(500)
  const [monthlyAudits, setMonthlyAudits] = useState(200)
  const [massIngestion, setMassIngestion] = useState(1000)

  // Precios estimados (basados en cuotas de Google Cloud / Gemini Flash)
  const COST_PER_ANALYSIS = 0.005 // $0.005 USD por análisis IA profundo
  const COST_PER_AUDIT = 0.01 // $0.01 USD por auditoría multimodal (PDFs)
  const COST_FIRESTORE_WRITE_1K = 0.0018 // $0.0018 USD por 1,000 escrituras
  
  const estimatedAiCost = (monthlyBids * COST_PER_ANALYSIS) + (monthlyAudits * COST_PER_AUDIT)
  const estimatedDbCost = (massIngestion / 1000) * COST_FIRESTORE_WRITE_1K
  const totalMonthlyCost = estimatedAiCost + estimatedDbCost

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic">Análisis de Costos Operativos</h2>
          <p className="text-muted-foreground font-medium italic">Calcula tu margen de beneficio basado en el consumo de recursos IA y Big Data.</p>
        </div>
        <Badge className="bg-accent text-white px-4 py-1 text-xs font-bold uppercase italic tracking-widest">Proyección Financiera</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-8">
              <CardTitle className="flex items-center gap-2 text-primary font-black uppercase italic">
                <Calculator className="h-5 w-5 text-accent" /> Simulador de Volumen
              </CardTitle>
              <CardDescription className="italic font-medium">Ajusta el volumen para ver cómo escalan los costos de infraestructura.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="font-black uppercase italic text-sm text-primary">Ingesta Masiva (Registros Big Data)</Label>
                  <Badge variant="secondary" className="text-lg px-4 font-black">{massIngestion.toLocaleString()}</Badge>
                </div>
                <Slider 
                  value={[massIngestion]} 
                  onValueChange={(v) => setMassIngestion(v[0])} 
                  max={50000} 
                  step={1000} 
                  className="py-4"
                />
                <p className="text-[10px] text-muted-foreground italic font-bold uppercase tracking-widest flex items-center gap-2">
                  <CloudDownload className="h-3 w-3 text-accent" /> Costo estimado Firestore: <span className="text-primary">${((massIngestion/1000)*COST_FIRESTORE_WRITE_1K).toFixed(4)} USD</span>
                </p>
              </div>

              <div className="space-y-6 pt-4 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <Label className="font-black uppercase italic text-sm text-primary">Análisis Estratégicos IA</Label>
                  <Badge variant="secondary" className="text-lg px-4 font-black text-accent">{monthlyBids}</Badge>
                </div>
                <Slider 
                  value={[monthlyBids]} 
                  onValueChange={(v) => setMonthlyBids(v[0])} 
                  max={5000} 
                  step={100} 
                  className="py-4"
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <Label className="font-black uppercase italic text-sm text-primary">Auditorías de Anexos PDF</Label>
                  <Badge variant="secondary" className="text-lg px-4 font-black text-indigo-600">{monthlyAudits}</Badge>
                </div>
                <Slider 
                  value={[monthlyAudits]} 
                  onValueChange={(v) => setMonthlyAudits(v[0])} 
                  max={2000} 
                  step={50} 
                  className="py-4"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-emerald-50 shadow-lg rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black flex items-center gap-2 text-emerald-800 uppercase tracking-widest">
                  <Cpu className="h-4 w-4" /> Costo IA (Gemini Flash)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-emerald-600 italic">${estimatedAiCost.toFixed(2)} <span className="text-sm text-emerald-800/50">USD/mes</span></div>
                <p className="text-[10px] text-emerald-700/70 mt-2 uppercase font-bold tracking-widest">Motor de inteligencia activo</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-blue-50 shadow-lg rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black flex items-center gap-2 text-blue-800 uppercase tracking-widest">
                  <Database className="h-4 w-4" /> Costo Cloud (Firestore)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-blue-600 italic">${estimatedDbCost.toFixed(2)} <span className="text-sm text-blue-800/50">USD/mes</span></div>
                <p className="text-[10px] text-blue-700/70 mt-2 uppercase font-bold tracking-widest">Escrituras masivas escalables</p>
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
              <CardTitle className="text-xl font-black italic uppercase tracking-widest text-accent">Total Operativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-6xl font-black text-white italic tracking-tighter">${totalMonthlyCost.toFixed(2)}</div>
              <p className="text-primary-foreground/70 text-sm leading-relaxed italic font-medium">
                Este es el costo directo de nube. Ingerir datos es barato; la inteligencia es la inversión principal.
              </p>
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-70 font-black uppercase tracking-widest">Inversión por Bid</span>
                  <span className="font-black text-accent">${(totalMonthlyCost / (monthlyBids || 1)).toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-70 font-black uppercase tracking-widest text-emerald-400">Margen Sugerido (10x)</span>
                  <span className="font-black text-emerald-400">${(totalMonthlyCost * 10).toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 bg-accent/5 rounded-[2rem] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xs font-black flex items-center gap-2 text-primary uppercase tracking-widest italic">
                <Info className="h-4 w-4 text-accent" /> Consejos de Escalamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed font-bold italic">
                La ingesta masiva (OCDS) te permite tener millones de registros históricos por solo unos centavos.
              </p>
              <ul className="space-y-3">
                <li className="text-[10px] flex gap-2">
                  <div className="h-4 w-4 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 text-accent font-black">1</div>
                  <span><b>Filtro de Ingesta</b>: Ingiere todo, pero solo analiza vía IA lo que el usuario pida.</span>
                </li>
                <li className="text-[10px] flex gap-2">
                  <div className="h-4 w-4 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 text-accent font-black">2</div>
                  <span><b>Modelo Freemium</b>: Cobra por el análisis, no por la visualización.</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full mt-4 border-primary text-primary font-black uppercase italic text-[10px] h-10 rounded-xl">
                Descargar Simulación
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
