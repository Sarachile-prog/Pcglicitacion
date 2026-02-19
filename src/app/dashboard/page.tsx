"use client"

import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc, useAuth } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, getCountFromServer } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  DollarSign, 
  ChevronRight, 
  Building2,
  Zap,
  Sparkles,
  Target,
  Bookmark,
  Loader2,
  TrendingUp,
  SendHorizontal,
  RefreshCw,
  Database,
  ShieldCheck,
  Users,
  Lock,
  LogOut,
  Search,
  BrainCircuit,
  MessageCircle,
  CheckCircle2,
  Headset,
  AlertTriangle,
  AlertCircle,
  FileWarning,
  Activity,
  CalendarClock,
  Layers,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const db = useFirestore()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const [isRequesting, setIsRequesting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [globalCount, setGlobalCount] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || profile?.role === 'SuperAdmin'
  const isLinkedToCompany = !!profile?.companyId
  const demoUsage = profile?.demoUsageCount || 0
  const hasRequestedPlan = profile?.planRequested || false

  // Obtener conteo global para SuperAdmin
  useEffect(() => {
    if (db && isSuperAdmin && mounted) {
      const fetchCount = async () => {
        try {
          const snapshot = await getCountFromServer(collection(db, "bids"));
          setGlobalCount(snapshot.data().count);
        } catch (e) {
          console.error("Error fetching global count:", e);
        }
      }
      fetchCount();
    }
  }, [db, isSuperAdmin, mounted]);

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(isSuperAdmin ? 1000 : 5)
    )
  }, [db, isSuperAdmin])

  const { data: bids, isLoading: isBidsLoading } = useCollection(bidsQuery)

  const bookmarksQuery = useMemoFirebase(() => {
    if (!db || !profile?.companyId) return null
    return query(
      collection(db, "companies", profile.companyId, "bookmarks"),
      orderBy("savedAt", "desc")
    )
  }, [db, profile])

  const { data: bookmarks, isLoading: isBookmarksLoading } = useCollection(bookmarksQuery)

  // Lógica de Enriquecimiento y Resumen para SuperAdmin
  const adminStats = useMemo(() => {
    if (!isSuperAdmin || !bids) return null;
    
    const totalInSample = bids.length;
    const enriched = bids.filter(b => {
      const entity = b.entity || "";
      const pendingStrings = ["Pendiente Enriquecimiento", "Institución no especificada", "Pendiente Datos...", "Pendiente"];
      return entity && !pendingStrings.some(ps => entity.includes(ps));
    }).length;

    const lastSync = bids[0]?.scrapedAt ? new Date(bids[0].scrapedAt.toDate()).toLocaleString('es-CL') : '---';
    
    // Resumen por mes (últimos meses detectados)
    const monthMap: Record<string, number> = {};
    bids.forEach(b => {
      if (b.scrapedAt) {
        const date = new Date(b.scrapedAt.toDate());
        const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });

    const monthSummary = Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const [mA, yA] = a.month.split('/').map(Number);
        const [mB, yB] = b.month.split('/').map(Number);
        return yB - yA || mB - mA;
      })
      .slice(0, 4);

    return {
      enriched,
      pending: totalInSample - enriched,
      enrichmentRate: totalInSample > 0 ? Math.round((enriched / totalInSample) * 100) : 0,
      lastSync,
      monthSummary
    };
  }, [isSuperAdmin, bids]);

  const handleLogout = async () => {
    if (!auth) return
    try {
      await signOut(auth)
      router.push('/login')
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al salir", description: e.message })
    }
  }

  const handleRequestPlan = async () => {
    if (!profileRef) return
    setIsRequesting(true)
    try {
      await updateDoc(profileRef, { planRequested: true })
      toast({ title: "Solicitud Enviada" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsRequesting(false)
    }
  }

  if (!mounted || isUserLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium italic">Accediendo a la red PCG...</p>
      </div>
    )
  }

  // VISTA PARA USUARIOS NO VINCULADOS (PROSPECTOS)
  if (user && !isSuperAdmin && !isLinkedToCompany) {
    return (
      <div className="max-w-4xl mx-auto py-10 animate-in zoom-in-95 duration-500 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-2 border-primary/10 shadow-2xl overflow-hidden rounded-3xl h-fit">
            <CardHeader className="bg-primary/5 text-center py-8 space-y-4">
              <div className="h-16 w-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto transform -rotate-3 border border-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <Badge className="bg-accent text-white uppercase font-black text-[10px] px-4">Acceso de Prueba Activo</Badge>
                <h2 className="text-3xl font-black text-primary uppercase italic tracking-tighter">Panel de Prospección</h2>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase italic tracking-tight">Sistema Sincronizado</p>
                  <p className="text-[9px] text-emerald-700/80 uppercase font-black">Viendo licitaciones oficiales de hoy.</p>
                </div>
              </div>
              <div className="grid gap-4">
                <Link href="/bids"><Button className="w-full h-14 bg-primary font-black uppercase italic shadow-lg gap-3"><Search className="h-5 w-5" /> Explorar Mercado</Button></Link>
                {hasRequestedPlan ? (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-center gap-3 text-emerald-700 font-black uppercase italic text-sm">
                    <CheckCircle2 className="h-5 w-5" /> Solicitud en Revisión
                  </div>
                ) : (
                  <Button onClick={handleRequestPlan} disabled={isRequesting} className="w-full h-14 bg-accent font-black uppercase italic shadow-xl gap-3 text-lg">
                    {isRequesting ? <Loader2 className="animate-spin" /> : <Sparkles className="h-5 w-5" />} Activar Plan Corporativo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="h-20 w-20" /></div>
              <CardHeader><CardTitle className="text-xs uppercase font-black tracking-widest text-accent italic">Créditos IA</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4"><span className="text-6xl font-black italic">{3 - demoUsage}</span><p className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-2">Análisis Disponibles</p></div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-accent transition-all duration-1000" style={{ width: `${((3 - demoUsage) / 3) * 100}%` }} /></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // VISTA PARA SUPERADMIN Y EQUIPO VINCULADO
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tight text-primary italic uppercase">
              {isSuperAdmin ? "Consola Global PCG" : "Dashboard de Equipo"}
            </h2>
            <Badge className={cn(
              "text-white gap-1 border-none font-bold text-[10px] uppercase italic tracking-widest px-3",
              isSuperAdmin ? "bg-primary shadow-[0_0_15px_rgba(30,58,138,0.3)]" : "bg-emerald-500"
            )}>
              {isSuperAdmin ? "MODO SUPERADMIN" : `EMPRESA: ${profile?.companyId}`}
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium italic">
            {isSuperAdmin ? "Supervisando la integridad del repositorio y el flujo de datos." : "Visión estratégica compartida de todas las licitaciones de tu empresa."}
          </p>
        </div>
        <Link href="/bids">
          <Button className="bg-accent hover:bg-accent/90 gap-2 font-black shadow-lg uppercase italic h-12 px-6">
            <Zap className="h-4 w-4" /> Buscar Licitaciones
          </Button>
        </Link>
      </div>

      {/* SECCIÓN ESPECIAL: RESUMEN DE BASE DE DATOS (SOLO SUPERADMIN) */}
      {isSuperAdmin && adminStats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-top-4 duration-1000">
          <Card className="lg:col-span-8 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden relative border-4 border-primary/5">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><Database className="h-64 w-64" /></div>
            <CardHeader className="bg-primary/5 border-b px-8 py-6">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4 text-accent" /> Salud del Repositorio de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Layers className="h-5 w-5" /></div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Total Registros</p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-primary italic tracking-tighter">
                      {globalCount !== null ? globalCount.toLocaleString() : <Loader2 className="h-6 w-6 animate-spin opacity-20" />}
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tight">
                      <TrendingUp className="h-3 w-3" /> Creciendo dinámicamente
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent"><Sparkles className="h-5 w-5" /></div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Enriquecimiento</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <h3 className="text-4xl font-black text-primary italic tracking-tighter">{adminStats.enrichmentRate}%</h3>
                      <p className="text-[10px] font-black text-muted-foreground pb-1">{adminStats.enriched} IDs</p>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${adminStats.enrichmentRate}%` }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><AlertCircle className="h-5 w-5" /></div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Por Depurar</p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-orange-600 italic tracking-tighter">{adminStats.pending}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase italic leading-tight">Registros con datos básicos</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-dashed flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground"><CalendarClock className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Última Actualización Cloud</p>
                    <p className="text-sm font-bold text-primary">{adminStats.lastSync}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/bids"><Button size="sm" variant="outline" className="h-10 px-6 font-black uppercase italic border-primary text-primary">Gestionar Ingesta</Button></Link>
                  <Link href="/trends"><Button size="sm" className="h-10 px-6 font-black uppercase italic bg-primary text-white">Análisis Avanzado</Button></Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-none shadow-2xl rounded-[2.5rem] bg-primary text-white overflow-hidden flex flex-col">
            <CardHeader className="bg-white/10 p-8">
              <CardTitle className="text-lg font-black uppercase italic tracking-widest text-accent flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Volumen Mes/Año
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {adminStats.monthSummary.map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black group-hover:bg-accent group-hover:text-primary transition-all">{item.month}</div>
                      <span className="text-sm font-bold opacity-80 uppercase italic">Periodo Detectado</span>
                    </div>
                    <span className="text-xl font-black italic">{item.count} <span className="text-[10px] opacity-40">IDs</span></span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
                <p className="text-[10px] font-black uppercase text-accent mb-1">Nota Técnica</p>
                <p className="text-[11px] italic font-medium leading-relaxed opacity-70">
                  El volumen se calcula basado en la fecha de ingesta (`scrapedAt`). Los registros OCDS masivos se agrupan por su periodo de succión original.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECCIÓN ESTÁNDAR PARA TODOS LOS ROLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0"><Briefcase className="h-6 w-6 text-primary" /></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Base de Datos</p><h3 className="text-2xl font-black text-primary italic tracking-tighter">{globalCount?.toLocaleString() || bids?.length || 0}</h3></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-accent/5 flex items-center justify-center shrink-0"><DollarSign className="h-6 w-6 text-accent" /></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Enriquecidos</p><h3 className="text-2xl font-black text-primary italic tracking-tighter">{adminStats?.enriched || bids?.filter(b => b.entity && !b.entity.includes("Pendiente")).length || 0}</h3></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0"><Bookmark className="h-6 w-6 text-orange-600" /></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{isSuperAdmin ? "Tickets Activos" : "Nuestra Cartera"}</p><h3 className="text-2xl font-black text-orange-600 italic tracking-tighter">{bookmarks?.length || 0}</h3></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0"><TrendingUp className="h-6 w-6 text-teal-600" /></div>
            <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rol de Acceso</p><h3 className="text-2xl font-black text-teal-600 uppercase italic tracking-tighter">{isSuperAdmin ? 'SUPERADMIN' : (profile?.role || 'USER')}</h3></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">
                  <Bookmark className="h-5 w-5 text-accent" /> {isSuperAdmin ? "Monitoreo de Procesos" : "Seguimiento de Equipo"}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium italic">
                  {isSuperAdmin ? "Vista de las licitaciones analizadas por las empresas clientes." : "Colaboración en tiempo real sobre procesos seleccionados."}
                </p>
              </div>
              <Badge variant="outline" className="bg-white font-black text-[10px] uppercase px-3 py-1 border-primary/20">{bookmarks?.length || 0} ACTIVAS</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isBookmarksLoading ? (
                <div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/20" /></div>
              ) : bookmarks && bookmarks.length > 0 ? (
                <div className="divide-y divide-primary/5">
                  {bookmarks.map((item) => {
                    const prepStatus = (item as any).preparationStatus || "En Estudio";
                    const hasAnalysis = (item as any).aiAnalysis || false;
                    const annexes = (item as any).annexes || [];
                    const errorAnnexesCount = annexes.filter((a: any) => a.status === 'error').length;
                    const hasAnnexErrors = errorAnnexesCount > 0;

                    return (
                      <div key={item.id} className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors group relative">
                        <Link href={`/bids/${item.bidId}`} className="flex-1 min-w-0 mr-4">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                               <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary font-black uppercase tracking-tighter">{item.bidId}</Badge>
                               <Badge className={cn(
                                 "text-[9px] uppercase font-black px-2 py-0.5 shadow-sm",
                                 prepStatus === 'Presentada' ? "bg-emerald-500 text-white" :
                                 prepStatus === 'Lista para Envío' ? "bg-teal-600 text-white" : "bg-accent text-white"
                               )}>
                                 {prepStatus}
                               </Badge>
                               {hasAnalysis && <Badge className="bg-accent/10 text-accent border-accent/20 gap-1 px-2 py-0.5 text-[8px] font-black uppercase italic"><Sparkles className="h-2 w-2 fill-accent" /> IA ACTIVA</Badge>}
                               {hasAnnexErrors && <Badge className="bg-red-500 text-white gap-1 px-2 py-0.5 text-[8px] font-black uppercase italic animate-bounce shadow-md"><FileWarning className="h-2 w-2 fill-white" /> {errorAnnexesCount} HALLAZGOS</Badge>}
                            </div>
                            <h4 className="font-black text-primary group-hover:text-accent transition-colors truncate uppercase italic text-lg leading-none tracking-tight">{item.title}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 uppercase font-bold text-[10px] italic"><Building2 className="h-3.5 w-3.5 text-accent" /> {item.entity}</p>
                          </div>
                        </Link>
                        <Link href={`/bids/${item.bidId}`}>
                          <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-24 text-center space-y-6">
                  <div className="h-20 w-20 bg-muted/30 rounded-3xl flex items-center justify-center mx-auto transform rotate-6 border border-dashed border-primary/20"><Bookmark className="h-10 w-10 text-muted-foreground/40" /></div>
                  <p className="text-lg text-primary font-black uppercase italic tracking-tighter">Sin procesos registrados</p>
                  <Link href="/bids"><Button variant="outline" className="font-black uppercase italic h-12 px-8 border-primary text-primary hover:bg-primary hover:text-white">Explorar Mercado</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden rounded-3xl relative group">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Sparkles className="h-32 w-32" /></div>
             <CardHeader className="relative z-10 pt-8">
               <CardTitle className="text-2xl font-black flex items-center gap-2 uppercase italic tracking-widest text-accent">
                 <Sparkles className="h-6 w-6" /> {isSuperAdmin ? "Control Operativo" : "Inteligencia Colaborativa"}
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6 relative z-10">
               <p className="text-sm text-primary-foreground/90 leading-relaxed font-medium italic">
                 {isSuperAdmin ? "Monitorea el rendimiento del ecosistema y el margen bruto del SaaS en tiempo real." : "Los hallazgos de auditoría IA sobre documentos cargados son visibles para todo el equipo."}
               </p>
               <div className="p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm space-y-2">
                 <p className="text-[10px] uppercase font-black text-accent tracking-widest flex items-center gap-2"><Target className="h-3 w-3" /> Recomendación PCG</p>
                 <p className="text-xs font-bold leading-tight">{isSuperAdmin ? "Revisa el módulo de costos para optimizar el uso de Gemini 2.5." : "Usa los estados de gestión para coordinar la carpeta digital."}</p>
               </div>
             </CardContent>
          </Card>

          <Card className="border-2 border-accent/10 bg-accent/5 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="pb-4"><CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-primary"><Users className="h-4 w-4 text-accent" /> Perfil Activo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border shadow-sm">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white font-black text-sm italic">{user?.email?.[0].toUpperCase()}</div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-black truncate text-primary uppercase italic">{user?.email}</p>
                  <p className="text-[9px] text-accent uppercase font-black tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-2.5 w-2.5" /> {isSuperAdmin ? 'Superadministrador' : (profile?.role || 'Usuario')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
