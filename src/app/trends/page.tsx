
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, PieChart as PieChartIcon, BarChart3, ArrowUpRight } from "lucide-react"

export default function TrendsPage() {
  const categoryData = [
    { name: "Tecnología", value: 400 },
    { name: "Salud", value: 300 },
    { name: "Construcción", value: 600 },
    { name: "Educación", value: 200 },
    { name: "Servicios", value: 450 },
  ]

  const monthlyTrend = [
    { month: "Ene", total: 120 },
    { month: "Feb", total: 180 },
    { month: "Mar", total: 150 },
    { month: "Abr", total: 280 },
    { month: "May", total: 320 },
    { month: "Jun", total: 250 },
  ]

  const COLORS = ["#1E3A8A", "#26A69A", "#3B82F6", "#F59E0B", "#10B981"]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Análisis y Tendencias</h2>
        <p className="text-muted-foreground">Visualización de datos estratégicos y comportamiento del mercado estatal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" /> Inversión por Categoría (M USD)
            </CardTitle>
            <CardDescription>Distribución del presupuesto fiscal este trimestre.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
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
              <TrendingUp className="h-5 w-5 text-accent" /> Evolución Mensual
            </CardTitle>
            <CardDescription>Crecimiento en el número de licitaciones publicadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="total" stroke="#26A69A" strokeWidth={3} dot={{ fill: '#26A69A', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-accent" /> Participación de Mercado
            </CardTitle>
            <CardDescription>Porcentaje de licitaciones según rubro.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs font-medium text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-accent text-white border-none">
            <CardHeader>
              <CardTitle className="text-xl">Oportunidad de Oro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-accent-foreground/90 text-sm">El rubro de <span className="font-bold">Salud</span> ha crecido un</p>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-black">32%</span>
                    <ArrowUpRight className="h-8 w-8 text-white/50" />
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1">Impacto</p>
                  <p className="text-sm font-bold">ALTO</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary text-lg">Predicción IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nuestros modelos proyectan un aumento en licitaciones relacionadas con <span className="text-primary font-bold">Energías Renovables</span> para el próximo semestre debido al nuevo plan nacional de descarbonización.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
