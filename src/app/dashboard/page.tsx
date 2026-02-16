
"use client"

import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
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
  Bookmark,
  Loader2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  SendHorizontal,
  RefreshCw,
  Database,
  ShieldCheck,
  Users
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  // Obtenemos el perfil para saber el companyId
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  // Licitaciones globales recientes
  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(5)
    )
  }, [db])

  const { data: bids, isLoading: isBidsLoading } = useCollection(bidsQuery)

  // Bookmarks corporativos (compartidos por el equipo)
  const bookmarksQuery = useMemoFirebase(() => {
    if (!db || !profile?.companyId) return null
    return query(
      collection(db, "companies", profile.companyId, "bookmarks"),
      orderBy("savedAt", "desc")
    )
  }, [db, profile])

  const { data: bookmarks, isLoading: isBookmarksLoading } = useCollection(bookmarksQuery)

  const totalAmount = bids?.reduce((acc, bid) => acc + (Number(bid.amount) || 0), 0) || 0

  const criticalAlerts = bookmarks?.flatMap(bookmark => {
    const timeline = (bookmark as any).timeline || []
    return timeline
      .filter((event: any) => event.criticality === 'alta')
      .map((event: any) => ({
        ...event,
        bidId: bookmark.bidId,
        bidTitle: bookmark.title
      }))
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3) || []

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando inteligencia corporativa...</p>
      </div>
    )
  }

  // Si no tiene perfil, es un usuario nuevo o invitado
  if (!profile && user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-primary uppercase italic">Acceso en Proceso</h2>
        <p className="text-muted-foreground">
          Tu cuenta ha sido detectada pero aún no estás vinculado a una empresa. Contacta a tu administrador para que te asigne un <b>Company ID</b>.
        </p>
        <div className="p-4 bg-muted rounded-xl text-[10px] font-mono break-all">
          UID: {user.uid}
        </div>
        <Link href="/">
          <Button variant="outline">Volver al Inicio</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tight text-primary italic uppercase">Dashboard Equipo</h2>
            <Badge className="bg-emerald-500 text-white gap-1 border-none font-bold text-[10px]">
              {profile?.companyId ? `EMPRESA: ${profile.companyId}` : 'SINCRO'}
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium italic">Visión compartida de todas las licitaciones en estudio.</p>
        </div>
        <Link href="/bids">
          <Button className="bg-accent hover:bg-accent/90 gap-2 font-black shadow-lg uppercase italic">
            <Zap className="h-4 w-4" /> Buscar Oportunidades
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">Historial Corporativo</p>
              <p className="text-[10px] text-blue-700/80 uppercase font-bold">
                Todo tu equipo visualiza los mismos análisis y documentos aquí.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">SLA Mercado Público</p>
              <p className="text-[10px] text-emerald-700/80 uppercase font-bold">
                Auto-Sincronización: 08:00 AM. Próxima actualización en camino.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {criticalAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {criticalAlerts.map((alert, i) => (
            <Link key={i} href={`/bids/${alert.bidId}/apply`} className="block">
              <Card className="bg-red-50 border-red-200 border-l-8 border-l-red-600 hover:shadow-md transition-all group h-full">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-red-700 tracking-tighter">Hito Crítico de Equipo</span>
                      <ArrowUpRight className="h-3 w-3 text-red-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <p className="text-xs font-bold text-red-900 truncate">{alert.event}</p>
                    <p className="text-[10px] text-red-700/70 truncate uppercase font-bold">{alert.bidTitle}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Clock className="h-3 w-3 text-red-600" />
                      <span className="text-[10px] font-black text-red-600">{alert.date}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mercado Global</p>
              <h3 className="text-2xl font-black text-primary">{bids?.length || 0}+</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent/5 flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Flujo Analizado</p>
              <h3 className="text-2xl font-black text-primary">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Bookmark className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nuestra Cartera</p>
              <h3 className="text-2xl font-black text-orange-600">{bookmarks?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rol de Acceso</p>
              <h3 className="text-2xl font-black text-teal-600 uppercase">{profile?.role || 'USER'}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary uppercase italic">
                  <Bookmark className="h-5 w-5 text-accent" /> Cartera del Equipo
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium italic">Colaboración en tiempo real sobre procesos seleccionados.</p>
              </div>
              <Badge variant="outline" className="bg-white font-black">{bookmarks?.length || 0} ACTIVAS</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isBookmarksLoading ? (
                <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/20" /></div>
              ) : bookmarks && bookmarks.length > 0 ? (
                <div className="divide-y">
                  {bookmarks.map((item) => {
                    const prepStatus = (item as any).preparationStatus || "En Estudio";
                    return (
                      <div key={item.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group relative">
                        <Link href={`/bids/${item.bidId}`} className="flex-1 min-w-0 mr-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <Badge variant="outline" className="text-[10px] font-mono border-primary/20">{item.bidId}</Badge>
                               <Badge className={cn(
                                 "text-[10px] uppercase font-bold",
                                 prepStatus === 'Presentada' ? "bg-emerald-500 text-white" :
                                 prepStatus === 'Lista para Envío' ? "bg-teal-600 text-white" : "bg-accent text-white"
                               )}>
                                 {prepStatus}
                               </Badge>
                            </div>
                            <h4 className="font-bold text-primary group-hover:text-accent transition-colors truncate uppercase italic">{item.title}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 uppercase font-bold text-[10px]">
                              <Building2 className="h-3 w-3" /> {item.entity}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-4">
                          <Link href={`/bids/${item.bidId}/apply`} className="hidden md:block">
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold gap-2 text-accent border border-accent/20 uppercase italic">
                              <SendHorizontal className="h-3 w-3" /> Carpeta Digital
                            </Button>
                          </Link>
                          <Link href={`/bids/${item.bidId}`}>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Bookmark className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground text-sm italic font-bold">Tu empresa no tiene licitaciones en seguimiento.</p>
                  <Link href="/bids">
                    <Button variant="outline" size="sm" className="font-black uppercase italic">Explorar Mercado Público</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-xl overflow-hidden relative">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Sparkles className="h-24 w-24" />
             </div>
             <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2 uppercase font-black italic">
                 <Sparkles className="h-5 w-5 text-accent" /> IA Colaborativa
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <p className="text-sm text-primary-foreground/90 leading-relaxed font-medium">
                 Cualquier miembro de tu equipo puede realizar auditorías IA sobre los documentos cargados. Los resultados son visibles para todos.
               </p>
               <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                 <p className="text-[10px] uppercase font-bold text-accent mb-1 tracking-widest">Sugerencia del Sistema</p>
                 <p className="text-xs font-semibold">Recuerda que los estados de gestión ayudan a coordinar quién está trabajando en qué anexo.</p>
               </div>
             </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase font-black">
                <Users className="h-4 w-4 text-accent" /> Miembros Activos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs italic">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold truncate">{user?.email}</p>
                  <p className="text-[9px] text-accent uppercase font-black">{profile?.role || 'Usuario'}</p>
                </div>
                <Badge className="bg-emerald-500 text-[8px]">ONLINE</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
