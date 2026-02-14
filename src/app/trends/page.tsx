
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
  LineChart,
  Line
} from "recharts"
import { TrendingUp, PieChart as PieChartIcon, BarChart3, ArrowUpRight, Loader2, Info, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function TrendsPage() {
  const db = useFirestore()
  
  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "bids"), orderBy("scrapedAt", "desc"), limit(100))
  }, [db])

  const { data: bids, isLoading } = useCollection(bidsQuery)

  // PROCESAMIENTO DE DATOS REALES
  const categoryData = useMemo(() => {
    if (!bids) return []
    const entityMap: Record<string, number> = {}
    bids.forEach(bid => {
      const name = bid.entity || "Otros"
      const amount = Number(bid.amount) || 0
      entityMap[name] = (entityMap[name] || 0) + amount
    })
    
    return Object.entries(entityMap)
      .map(([name, value]) => ({ name, value: Math.round(value / 1000000) })) // En Millones
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Top 5 instituciones
  }, [bids])

  const statusData = useMemo(() => {
    if (!bids) return []
    const statusMap: Record<string, number> = {}
    bids.forEach(bid => {
      statusMap[bid.status] = (statusMap[bid.status] || 0) + 1
    })
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }))
  }, [bids])

  const COLORS = ["#1E3A8A", "#26A69A", "#3B82F6", "#F59E0B", "#10B981"]

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
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Análisis y Tendencias</h2>
          <p className="text-muted-foreground">Visualización de datos estratégicos basados en tus sincronizaciones.</p>
        </div>
      </div>

      {!bids || bids.length === 0 ? (
        <Card className="bg-primary/5 border-dashed border-2">
          <CardContent className="py-20 text-center space-y-4">
            <Info className="h-10 w-10 text-primary/40 mx-auto" />
            <h3 className="text-xl font-bold">No hay datos suficientes</h3>
            <p className="text-muted-foreground">Sincroniza algunas licitaciones en la sección de "Licitaciones" para ver el análisis.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" /> Inversión por Institución (M CLP)
              </CardTitle>
              <CardDescription>Top 5 instituciones con mayor presupuesto sincronizado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-accent" /> Participación por Estado
              </CardTitle>
              <CardDescription>Distribución porcentual de las licitaciones actuales.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {statusData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-medium text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent text-white border-none col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Resumen de Mercado Sincronizado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <p className="text-accent-foreground/90 text-sm">Monto Total Analizado</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">
                      ${categoryData.reduce((acc, curr) => acc + curr.value, 0)}M
                    </span>
                    <ArrowUpRight className="h-6 w-6 text-white/50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-accent-foreground/90 text-sm">Instituciones Únicas</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">{new Set(bids.map(b => b.entity)).size}</span>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <p className="text-[10px] uppercase font-bold text-accent mb-1 tracking-widest">Predicción IA</p>
                  <p className="text-sm font-bold">Concentración alta en Sector Público Centralizado.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
