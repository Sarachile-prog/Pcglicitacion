"use client"

import { useCollection, useMemoFirebase, useFirestore, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  Building2,
  Zap,
  Sparkles,
  Target,
  BarChart3,
  Bookmark,
  Loader2,
  TrendingUp,
  Mail
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  // Bids Recientes
  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(5)
    )
  }, [db])

  const { data: bids, isLoading: isBidsLoading } = useCollection(bidsQuery)

  // Bids Seguidas (Bookmarks)
  const bookmarksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "bookmarks"),
      orderBy("savedAt", "desc")
    )
  }, [db, user])

  const { data: bookmarks, isLoading: isBookmarksLoading } = useCollection(bookmarksQuery)

  const totalAmount = bids?.reduce((acc, bid) => acc + (Number(bid.amount) || 0), 0) || 0

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando tu espacio de trabajo...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary italic uppercase">Panel de Control</h2>
          <p className="text-muted-foreground">Bienvenido a tu centro de inteligencia estratégica.</p>
        </div>
        <Link href="/bids">
          <Button className="bg-accent hover:bg-accent/90 gap-2 font-bold shadow-lg">
            <Zap className="h-4 w-4" /> Nueva Sincronización
          </Button>
        </Link>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Mercado</p>
              <h3 className="text-2xl font-black text-primary">{bids?.length || 0}+</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent/5 flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monto Sincronizado</p>
              <h3 className="text-2xl font-black text-primary">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Bookmark className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">En Cartera</p>
              <h3 className="text-2xl font-black text-orange-600">{bookmarks?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Eficiencia IA</p>
              <h3 className="text-2xl font-black text-teal-600">92%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: LICITACIONES SEGUIDAS */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                  <Bookmark className="h-5 w-5 text-accent" /> Licitaciones Seguidas
                </CardTitle>
                <p className="text-xs text-muted-foreground">Tu selección estratégica de oportunidades.</p>
              </div>
              <Badge variant="outline" className="bg-white">{bookmarks?.length || 0}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isBookmarksLoading ? (
                <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/20" /></div>
              ) : bookmarks && bookmarks.length > 0 ? (
                <div className="divide-y">
                  {bookmarks.map((item) => (
                    <Link key={item.id} href={`/bids/${item.bidId}`} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group">
                      <div className="space-y-1 min-w-0 flex-1 mr-4">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[10px] font-mono border-primary/20">{item.bidId}</Badge>
                           <Badge className="text-[10px] bg-emerald-500 text-white uppercase">{item.status}</Badge>
                        </div>
                        <h4 className="font-bold text-primary group-hover:text-accent transition-colors truncate">{item.title}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {item.entity}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Bookmark className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground text-sm italic">Aún no sigues ninguna licitación. Marca algunas en el buscador.</p>
                  <Link href="/bids">
                    <Button variant="outline" size="sm">Explorar Mercado</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ÚLTIMAS SINCRONIZADAS */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" /> Últimas Oportunidades Sincronizadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bids?.map((bid) => (
                <Link key={bid.id} href={`/bids/${bid.id}`}>
                  <Card className="hover:border-accent transition-all duration-300">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[9px]">{bid.id}</Badge>
                        <p className="text-xs font-black text-primary">
                          {bid.amount > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(bid.amount) : 'Por Definir'}
                        </p>
                      </div>
                      <h5 className="font-bold text-sm line-clamp-1">{bid.title}</h5>
                      <p className="text-[10px] text-muted-foreground truncate">{bid.entity}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: INSIGHTS IA */}
        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-xl overflow-hidden relative">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Sparkles className="h-24 w-24" />
             </div>
             <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                 <Sparkles className="h-5 w-5 text-accent" /> Insight del Día
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <p className="text-sm text-primary-foreground/90 leading-relaxed font-medium">
                 Hemos detectado un incremento del <span className="text-accent font-black">24%</span> en licitaciones de mantenimiento de infraestructura en la Región del Maule. 
               </p>
               <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                 <p className="text-[10px] uppercase font-bold text-accent mb-1 tracking-widest">Recomendación IA</p>
                 <p className="text-xs font-semibold">Considera ajustar tus filtros para el rubro "Obras Civiles".</p>
               </div>
             </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" /> Objetivos Semanales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Analizar 5 bases", progress: 60 },
                { label: "Seguir 10 procesos", progress: 40 },
                { label: "Detectar 2 leads", progress: 0 }
              ].map((obj, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span>{obj.label}</span>
                    <span>{obj.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent/10 rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${obj.progress}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <BarChart3 className="h-4 w-4 text-primary" /> Actividad Outreach
               </CardTitle>
             </CardHeader>
             <CardContent className="text-center py-6">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground">No hay campañas activas enviando invitaciones hoy.</p>
                <Link href="/admin/outreach">
                  <Button variant="link" className="text-accent font-bold text-xs">Gestionar Outreach</Button>
                </Link>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
