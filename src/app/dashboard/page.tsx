
"use client"

import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc, useAuth } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc } from "firebase/firestore"
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
  Users,
  Lock,
  LogOut,
  Search,
  ArrowRight,
  BrainCircuit,
  MessageCircle,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

const WHATSAPP_URL = "https://wa.me/56941245316?text=Hola,%20ya%20me%20registré%20en%20la%20plataforma%20y%20quiero%20activar%20mi%20Plan%20Empresas.";

export default function DashboardPage() {
  const db = useFirestore()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const [isRequesting, setIsRequesting] = useState(false)

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || profile?.role === 'SuperAdmin'
  const isLinkedToCompany = !!profile?.companyId
  const demoUsage = profile?.demoUsageCount || 0
  const hasRequestedPlan = profile?.planRequested || false

  const handleRequestPlan = async () => {
    if (!profileRef) return
    setIsRequesting(true)
    try {
      await updateDoc(profileRef, { planRequested: true })
      toast({ 
        title: "Solicitud Enviada", 
        description: "Un ejecutivo revisará tu perfil para la activación del plan corporativo." 
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsRequesting(false)
    }
  }

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

  // Bookmarks corporativos
  const bookmarksQuery = useMemoFirebase(() => {
    if (!db || !profile?.companyId) return null
    return query(
      collection(db, "companies", profile.companyId, "bookmarks"),
      orderBy("savedAt", "desc")
    )
  }, [db, profile])

  const { data: bookmarks, isLoading: isBookmarksLoading } = useCollection(bookmarksQuery)

  const totalAmount = bids?.reduce((acc, bid) => acc + (Number(bid.amount) || 0), 0) || 0

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium italic">Sincronizando con PCG Cloud...</p>
      </div>
    )
  }

  // ESTADO 1: USUARIO REGISTRADO PERO NO VINCULADO (ACCESO EN PROCESO)
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
              <div className="space-y-6">
                <div className="p-6 bg-muted/30 rounded-2xl border-2 border-dashed space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Empresa Registrada</p>
                  <p className="text-xl font-black text-primary uppercase italic">{profile?.requestedCompanyName || "No especificada"}</p>
                </div>

                <p className="text-muted-foreground text-md leading-relaxed font-medium italic text-center">
                  Tu cuenta está en fase de prueba. Tienes acceso al motor IA para tus primeros 3 procesos antes de requerir el plan corporativo.
                </p>

                <div className="grid gap-4">
                  <Link href="/bids">
                    <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase italic shadow-lg gap-3">
                      <Search className="h-5 w-5" /> Explorar Licitaciones Reales
                    </Button>
                  </Link>

                  {hasRequestedPlan ? (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-center gap-3 text-emerald-700 font-black uppercase italic text-sm">
                      <CheckCircle2 className="h-5 w-5" /> Solicitud de Plan en Revisión
                    </div>
                  ) : (
                    <Button 
                      onClick={handleRequestPlan}
                      disabled={isRequesting}
                      className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-black uppercase italic shadow-xl gap-3 text-lg"
                    >
                      {isRequesting ? <Loader2 className="animate-spin" /> : <Sparkles className="h-5 w-5" />}
                      Activar Plan Empresas
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="pt-6 border-t flex flex-col sm:flex-row gap-4">
                <Button asChild variant="outline" className="flex-1 h-12 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 font-black uppercase italic gap-2">
                  <a href={WHATSAPP_URL} target="_blank">
                    <MessageCircle className="h-4 w-4" /> Hablar con Soporte
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => signOut(auth)} 
                  className="h-12 font-black uppercase italic text-xs text-red-400 hover:text-red-600 hover:bg-red-50 gap-2"
                >
                  <LogOut className="h-3 w-3" /> Cerrar Sesión
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="h-20 w-20" />
              </div>
              <CardHeader>
                <CardTitle className="text-xs uppercase font-black tracking-widest text-accent italic">Créditos de Cortesía</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <span className="text-6xl font-black italic">{3 - demoUsage}</span>
                  <p className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-2">Análisis Disponibles</p>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-1000" 
                    style={{ width: `${((3 - demoUsage) / 3) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] italic font-medium opacity-80 text-center">
                  Prueba el poder de nuestra IA en licitaciones reales de hoy.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/10 bg-accent/5 rounded-3xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Identidad Digital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-white rounded-xl border text-[10px] font-mono break-all text-muted-foreground shadow-inner">
                  {user.email}
                </div>
                <p className="text-[9px] text-primary/60 font-bold italic leading-tight px-1">Usa este correo para todas tus consultas de soporte y facturación.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ESTADO 2: SUPERADMIN O USUARIO VINCULADO (DASHBOARD COMPLETO)
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
              isSuperAdmin ? "bg-primary" : "bg-emerald-500"
            )}>
              {isSuperAdmin ? "MODO SUPERADMIN" : `EMPRESA: ${profile?.companyId}`}
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium italic">
            {isSuperAdmin ? "Control maestro de todas las operaciones y clientes del sistema." : "Visión estratégica compartida de todas las licitaciones de tu empresa."}
          </p>
        </div>
        <Link href="/bids">
          <Button className="bg-accent hover:bg-accent/90 gap-2 font-black shadow-lg uppercase italic h-12 px-6">
            <Zap className="h-4 w-4" /> Buscar Licitaciones
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900 uppercase italic tracking-tight">{isSuperAdmin ? "Inteligencia de Datos" : "Cartera Corporativa Activa"}</p>
              <p className="text-[10px] text-blue-700/80 uppercase font-black">
                {isSuperAdmin ? "Monitoreando registros acumulados de todas las sincronizaciones diarias." : "Todo tu equipo visualiza los mismos análisis, documentos y estados en tiempo real."}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 uppercase italic tracking-tight">Estado de la Red Mercado Público</p>
              <p className="text-[10px] text-emerald-700/80 uppercase font-black">
                Sincronización Diaria: 08:00 AM OK. El sistema está operando con datos oficiales de hoy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Base Global</p>
              <h3 className="text-2xl font-black text-primary italic tracking-tighter">{bids?.length || 0}+</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-accent/5 flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Flujo Analizado</p>
              <h3 className="text-2xl font-black text-primary italic tracking-tighter">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <Bookmark className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {isSuperAdmin ? "Clientes Activos" : "Nuestra Cartera"}
              </p>
              <h3 className="text-2xl font-black text-orange-600 italic tracking-tighter">{bookmarks?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rol de Acceso</p>
              <h3 className="text-2xl font-black text-teal-600 uppercase italic tracking-tighter">{isSuperAdmin ? 'SUPERADMIN' : (profile?.role || 'USER')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
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
                    return (
                      <div key={item.id} className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors group relative">
                        <Link href={`/bids/${item.bidId}`} className="flex-1 min-w-0 mr-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                               <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary font-black uppercase tracking-tighter">{item.bidId}</Badge>
                               <Badge className={cn(
                                 "text-[9px] uppercase font-black px-2 py-0.5 shadow-sm",
                                 prepStatus === 'Presentada' ? "bg-emerald-500 text-white" :
                                 prepStatus === 'Lista para Envío' ? "bg-teal-600 text-white" : "bg-accent text-white"
                               )}>
                                 {prepStatus}
                               </Badge>
                            </div>
                            <h4 className="font-black text-primary group-hover:text-accent transition-colors truncate uppercase italic text-lg leading-none tracking-tight">{item.title}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 uppercase font-bold text-[10px] italic">
                              <Building2 className="h-3.5 w-3.5 text-accent" /> {item.entity}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-4">
                          {!isSuperAdmin && (
                            <Link href={`/bids/${item.bidId}/apply`} className="hidden md:block">
                              <Button variant="outline" size="sm" className="h-9 text-[10px] font-black gap-2 text-accent border-accent/30 hover:bg-accent hover:text-white uppercase italic shadow-sm">
                                <SendHorizontal className="h-3.5 w-3.5" /> Carpeta Digital
                              </Button>
                            </Link>
                          )}
                          <Link href={`/bids/${item.bidId}`}>
                            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-24 text-center space-y-6">
                  <div className="h-20 w-20 bg-muted/30 rounded-3xl flex items-center justify-center mx-auto transform rotate-6 border border-dashed border-primary/20">
                    <Bookmark className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg text-primary font-black uppercase italic tracking-tighter">
                      {isSuperAdmin ? "Sin procesos registrados" : "Tu Cartera está Vacía"}
                    </p>
                    <p className="text-muted-foreground text-xs font-medium italic max-w-xs mx-auto leading-relaxed">
                      {isSuperAdmin ? "No hay procesos seguidos por empresas actualmente en el sistema." : "Empieza a seguir licitaciones desde el explorador para que tu equipo pueda colaborar."}
                    </p>
                  </div>
                  <Link href="/bids">
                    <Button variant="outline" className="font-black uppercase italic h-12 px-8 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-md">
                      Explorar Mercado Público
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden rounded-3xl relative group">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
               <Sparkles className="h-32 w-32" />
             </div>
             <CardHeader className="relative z-10 pt-8">
               <CardTitle className="text-2xl font-black flex items-center gap-2 uppercase italic tracking-widest text-accent">
                 <Sparkles className="h-6 w-6" /> {isSuperAdmin ? "Control de IA" : "Inteligencia Colaborativa"}
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6 relative z-10">
               <p className="text-sm text-primary-foreground/90 leading-relaxed font-medium italic">
                 {isSuperAdmin 
                   ? "Supervisa el rendimiento del modelo Gemini 2.5 Flash y monitorea la efectividad de las auditorías multimodales PDF."
                   : "Cualquier miembro de tu equipo puede ejecutar auditorías de IA sobre los documentos cargados. Los hallazgos estratégicos son compartidos."}
               </p>
               <div className="p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm space-y-2">
                 <p className="text-[10px] uppercase font-black text-accent tracking-widest flex items-center gap-2">
                   <Target className="h-3 w-3" /> Recomendación PCG
                 </p>
                 <p className="text-xs font-bold leading-tight">
                   {isSuperAdmin ? "Mantén un ojo en el módulo de costos para optimizar el margen bruto del SaaS." : "Utiliza los 'Estados de Gestión' para evitar que dos personas trabajen en el mismo anexo al mismo tiempo."}
                 </p>
               </div>
             </CardContent>
          </Card>

          <Card className="border-2 border-accent/10 bg-accent/5 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-primary">
                <Users className="h-4 w-4 text-accent" /> Perfil de Operación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border shadow-sm">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white font-black text-sm italic shadow-inner">
                  {user?.email?.[0].toUpperCase() || user?.uid?.[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-black truncate text-primary uppercase italic tracking-tighter">{user?.email || 'Usuario Demo'}</p>
                  <p className="text-[9px] text-accent uppercase font-black tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="h-2.5 w-2.5" /> {isSuperAdmin ? 'Superadministrador' : (profile?.role || 'Usuario')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-600">ONLINE</span>
                </div>
              </div>
              
              {!isLinkedToCompany && !isSuperAdmin && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] font-bold text-amber-700 italic leading-tight">
                  <Lock className="h-3 w-3 shrink-0" /> Acceso de prueba: Vincula tu empresa para habilitar colaboración de equipo.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
