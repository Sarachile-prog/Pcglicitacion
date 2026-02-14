
"use client"

import { useMemo } from "react"
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LabelList
} from "recharts"
import { TrendingUp, PieChart as PieChartIcon, BarChart3, ArrowUpRight, Loader2, Info, ChevronLeft, Target } from "lucide-react"
import Link from "next/link"

export default function TrendsPage() {
  const db = useFirestore()
  
  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "bids"), orderBy("scrapedAt", "desc"), limit(200))
  }, [db])

  const { data: bids, isLoading } = useCollection(bidsQuery)

  // PROCESAMIENTO DE DATOS REALES
  const entityStats = useMemo(() => {
    if (!bids) return []
    const statsMap: Record<string, { amount: number, count: number }> = {}
    
    bids.forEach(bid => {
      const name = bid.entity || "Otros"
      if (name === "Institución no especificada") return;
      
      if (!statsMap[name]) {
        statsMap[name] = { amount: 0, count: 0 }
      }
      statsMap[name].amount += Number(bid.amount) || 0
      statsMap[name].count += 1
    })
    
    return Object.entries(statsMap)
      .map(([name, stats]) => ({ 
        name, 
        amount: stats.amount, 
        count: stats.count,
        // Usamos millones para el gráfico de barras si hay montos significativos
        amountInMillions: Number((stats.amount / 1000000).toFixed(2))
      }))
      .sort((a, b) => b.count - a.count) // Ordenar por cantidad de licitaciones por defecto
      .slice(0, 6)
  }, [bids])

  const statusData = useMemo(() => {
    if (!bids) return []
    const statusMap: Record<string, number> = {}
    bids.forEach(bid => {
      const status = bid.status || "Desconocido"
      statusMap[status] = (statusMap[status] || 0) + 1
    })
    return Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [bids])

  const COLORS = ["#1E3A8A", "#26A69A", "#F59E0B", "#3B82F6", "#10B981", "#6366F1"]

  const totalAmount = bids?.reduce((acc, b) => acc + (Number(b.amount) || 0), 0) || 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Calculando tendencias del mercado...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-fit text-muted-foreground hover:text-primary -ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
          </Button>
        </Link>
        
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary uppercase italic">Análisis y Tendencias</h2>
          <p className="text-muted-foreground">Perspectiva estratégica basada en {bids?.length || 0} licitaciones sincronizadas.</p>
        </div>
      </div>

      {!bids || bids.length === 0 ? (
        <Card className="bg-primary/5 border-dashed border-2 border-primary/20">
          <CardContent className="py-24 text-center space-y-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Info className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-primary">No hay datos suficientes</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Sincroniza algunas licitaciones en la sección de "Licitaciones" para activar los motores de análisis.
            </p>
            <Link href="/bids">
              <Button className="bg-primary hover:bg-primary/90">Ir a Sincronizar</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GRÁFICO DE BARRAS: VOLUMEN POR INSTITUCIÓN */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-primary uppercase font-black">
                <BarChart3 className="h-5 w-5 text-accent" /> Volumen por Institución
              </CardTitle>
              <CardDescription>Cantidad de procesos abiertos por organismo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entityStats} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      fontSize={10} 
                      width={120}
                      tickLine={false} 
                      axisLine={false} 
                      className="font-bold text-primary"
                    />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${value} Licitaciones`, 'Cantidad']}
                    />
                    <Bar dataKey="count" fill="#1E3A8A" radius={[0, 4, 4, 0]} barSize={32}>
                      <LabelList dataKey="count" position="right" className="fill-primary font-black text-[10px]" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* GRÁFICO DE TORTA: ESTADOS */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-primary uppercase font-black">
                <PieChartIcon className="h-5 w-5 text-accent" /> Estados del Mercado
              </CardTitle>
              <CardDescription>Distribución porcentual de estados vigentes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2 px-4">
                {statusData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RESUMEN ESTRATÉGICO */}
          <Card className="bg-primary text-white border-none col-span-1 lg:col-span-2 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <Target className="h-32 w-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-black italic uppercase tracking-widest text-accent">Resumen de Mercado Sincronizado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <p className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Inversión Detectada</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Organismos Activos</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">{new Set(bids.map(b => b.entity)).size - 1}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Promedio de Cierre</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">12.4d</span>
                  </div>
                </div>
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <p className="text-[10px] uppercase font-bold text-accent tracking-widest">Predicción IA</p>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">
                    Alta concentración de compras en Sector Salud durante el próximo trimestre.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
