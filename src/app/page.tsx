
"use client"

import { useCollection, useMemoFirebase, useFirestore } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  Search,
  Building2,
  Calendar,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const db = useFirestore()

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(10)
    )
  }, [db])

  const { data: bids, isLoading } = useCollection(bidsQuery)

  const totalBids = bids?.length || 0
  const totalAmount = bids?.reduce((acc, bid) => acc + (Number(bid.amount) || 0), 0) || 0
  
  // Categorías estáticas para exploración
  const categories = [
    'Construcción', 'Tecnología', 'Salud', 'Educación', 'Servicios'
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Vista General</h2>
        <p className="text-muted-foreground">Panel de control de licitaciones y oportunidades estratégicas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sincronizadas</CardTitle>
            <Briefcase className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalBids}</div>
            <p className="text-xs text-muted-foreground mt-1">Licitaciones en tu base de datos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-accent group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monto Detectado</CardTitle>
            <DollarSign className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Suma de oportunidades visibles</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-orange-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cierran Pronto</CardTitle>
            <Clock className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bids?.filter(b => b.status === 'Publicada').length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Licitaciones abiertas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-teal-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analizadas por IA</CardTitle>
            <TrendingUp className="h-5 w-5 text-teal-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bids?.filter(b => b.description).length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Con detalle profundo cargado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Últimas Sincronizadas
            </h3>
            <Link href="/bids">
              <Button variant="ghost" className="text-accent hover:text-accent/80 font-semibold gap-1">
                Ver Todas <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin opacity-20" />
                <p className="text-sm text-muted-foreground">Cargando datos vivos...</p>
              </div>
            ) : bids && bids.length > 0 ? (
              bids.slice(0, 5).map((bid) => (
                <Card key={bid.id} className="overflow-hidden group cursor-pointer hover:border-accent transition-colors">
                  <Link href={`/bids/${bid.id}`}>
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">ID: {bid.id}</Badge>
                          <Badge className={bid.status === 'Publicada' ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}>
                            {bid.status}
                          </Badge>
                        </div>
                        <h4 className="text-lg font-bold group-hover:text-accent transition-colors line-clamp-1">{bid.title}</h4>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {bid.entity}</span>
                          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Cierre: {bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString() : 'No definido'}</span>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-6 flex flex-col justify-center items-end border-t md:border-t-0 md:border-l border-border min-w-[200px]">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Monto Referencial</span>
                        <span className="text-lg font-black text-primary">
                          {bid.amount > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency || 'CLP' }).format(bid.amount) : 'Por Definir'}
                        </span>
                        <div className="mt-3 w-full">
                          <Button size="sm" className="w-full bg-primary group-hover:bg-accent transition-colors">Analizar</Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Card>
              )
            )) : (
              <Card className="border-dashed border-2 p-10 text-center">
                <p className="text-muted-foreground">Tu base de datos está vacía. Ve a Licitaciones y sincroniza una fecha pasada.</p>
                <Link href="/bids">
                  <Button className="mt-4 bg-accent">Ir al Explorador</Button>
                </Link>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2">
            <Search className="h-5 w-5" />
            Explorar Rubros
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Button key={category} variant="outline" className="rounded-full hover:border-accent hover:text-accent">
                    {category}
                  </Button>
                ))}
              </div>
              <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h5 className="font-bold text-primary mb-2">Estado de Sincronización</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para ver datos actualizados, usa el buscador en la sección de Licitaciones y selecciona una fecha hábil reciente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
