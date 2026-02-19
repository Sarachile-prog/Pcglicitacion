
"use client"

import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc, useAuth } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, getCountFromServer, where } from "firebase/firestore"
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
  Database,
  ShieldCheck,
  Users,
  LogOut,
  Search,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Activity,
  CalendarClock,
  Layers,
  BarChart3,
  FileWarning,
  RefreshCw,
  Clock,
  ShieldAlert
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
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [globalCount, setGlobalCount] = useState<number | null>(null)
  const [breakdown, setBreakdown] = useState<{ licitacion: number, convenio: number, trato: number } | null>(null)
  const [isRefreshingCount, setIsRefreshingCount] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || profile?.role === 'SuperAdmin'

  const fetchBreakdown = async () => {
    if (!db || !isSuperAdmin) return;
    setIsRefreshingCount(true);
    try {
      const coll = collection(db, "bids");
      
      // Usamos consultas individuales para asegurar que Firestore cuente exactamente lo que queremos
      const [sTotal, sL, sC, sT] = await Promise.all([
        getCountFromServer(coll),
        getCountFromServer(query(coll, where("type", "==", "Licitación"))),
        getCountFromServer(query(coll, where("type", "==", "Convenio Marco"))),
        getCountFromServer(query(coll, where("type", "==", "Trato Directo")))
      ]);
      
      setGlobalCount(sTotal.data().count);
      setBreakdown({
        licitacion: sL.data().count,
        convenio: sC.data().count,
        trato: sT.data().count
      });
      toast({ title: "Repositorio Escaneado" });
    } catch (e) {
      console.error("Error fetching breakdown:", e);
      toast({ variant: "destructive", title: "Error en escaneo" });
    } finally {
      setIsRefreshingCount(false);
    }
  }

  useEffect(() => {
    if (db && isSuperAdmin && mounted) {
      fetchBreakdown();
    }
  }, [db, isSuperAdmin, mounted]);

  const bookmarksQuery = useMemoFirebase(() => {
    if (!db || !profile?.companyId) return null
    return query(
      collection(db, "companies", profile.companyId, "bookmarks"),
      orderBy("savedAt", "desc")
    )
  }, [db, profile])

  const { data: bookmarks, isLoading: isBookmarksLoading } = useCollection(bookmarksQuery)

  if (!mounted || isUserLoading || isProfileLoading) {
    return <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground font-medium italic">Accediendo a la red PCG...</p></div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tight text-primary italic uppercase">{isSuperAdmin ? "Consola Global PCG" : "Dashboard de Equipo"}</h2>
            <Badge className={cn("text-white gap-1 border-none font-bold text-[10px] uppercase italic tracking-widest px-3", isSuperAdmin ? "bg-primary shadow-lg" : "bg-emerald-500")}>
              {isSuperAdmin ? "MODO SUPERADMIN" : `EMPRESA: ${profile?.companyId}`}
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium italic">Supervisando la integridad del repositorio y el flujo de datos.</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Button variant="outline" onClick={fetchBreakdown} disabled={isRefreshingCount} className="border-primary text-primary font-black uppercase italic h-12 px-4 shadow-sm">
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshingCount && "animate-spin")} /> Escanear Repositorio
            </Button>
          )}
          <Link href="/bids"><Button className="bg-accent hover:bg-accent/90 gap-2 font-black shadow-lg uppercase italic h-12 px-6"><Zap className="h-4 w-4" /> Buscar Licitaciones</Button></Link>
        </div>
      </div>

      {isSuperAdmin && breakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4">
          <Card className="border-none shadow-xl bg-primary text-white overflow-hidden rounded-3xl">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between opacity-60">
                <p className="text-[10px] font-black uppercase tracking-widest">Total General</p>
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="text-4xl font-black italic">{globalCount?.toLocaleString()}</h3>
              <p className="text-[8px] font-bold uppercase opacity-40">Documentos en Firestore</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl border-l-4 border-l-indigo-500">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-[10px] font-black uppercase tracking-widest">Convenio Marco</p>
                <Badge variant="outline" className="text-[8px] font-black border-indigo-200 text-indigo-600">OCDS</Badge>
              </div>
              <h3 className="text-4xl font-black text-primary italic">{breakdown.convenio.toLocaleString()}</h3>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Registros Detectados</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl border-l-4 border-l-orange-500">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-[10px] font-black uppercase tracking-widest">Trato Directo</p>
                <Badge variant="outline" className="text-[8px] font-black border-orange-200 text-orange-600">DIRECTO</Badge>
              </div>
              <h3 className="text-4xl font-black text-primary italic">{breakdown.trato.toLocaleString()}</h3>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Registros Detectados</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl border-l-4 border-l-emerald-500">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-[10px] font-black uppercase tracking-widest">Licitaciones</p>
                <Badge variant="outline" className="text-[8px] font-black border-emerald-200 text-emerald-600">PÚBLICAS</Badge>
              </div>
              <h3 className="text-4xl font-black text-primary italic">{breakdown.licitacion.toLocaleString()}</h3>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Registros Detectados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isSuperAdmin && breakdown && (breakdown.convenio === 0 && breakdown.trato === 0) && (
        <Card className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl animate-pulse">
          <CardContent className="p-0 flex items-center gap-4 text-red-800">
            <ShieldAlert className="h-10 w-10 shrink-0" />
            <div>
              <p className="font-black uppercase italic text-sm">Alerta de Sincronización</p>
              <p className="text-xs italic font-bold">El sistema indica que tienes registros pero las etiquetas no coinciden. Esto ocurre porque la Ingesta Diaria sobreescribió los tipos. <b>Solución:</b> Ejecuta 'firebase deploy --only functions' y luego repite una Ingesta Masiva OCDS.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">
                  <Bookmark className="h-5 w-5 text-accent" /> {isSuperAdmin ? "Monitoreo de Procesos" : "Seguimiento de Equipo"}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium italic">Colaboración en tiempo real sobre procesos seleccionados.</p>
              </div>
              <Badge variant="outline" className="bg-white font-black text-[10px] uppercase px-3 py-1 border-primary/20">{bookmarks?.length || 0} ACTIVAS</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isBookmarksLoading ? (
                <div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/20" /></div>
              ) : bookmarks && bookmarks.length > 0 ? (
                <div className="divide-y divide-primary/5">
                  {bookmarks.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-6 group relative">
                      <Link href={`/bids/${item.bidId}`} className="flex-1 min-w-0 mr-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary font-black uppercase tracking-tighter">{item.bidId}</Badge>
                             <Badge className={cn("text-[9px] uppercase font-black px-2 py-0.5 shadow-sm", (item as any).preparationStatus === 'Presentada' ? "bg-emerald-500" : "bg-accent")}>{(item as any).preparationStatus || "En Estudio"}</Badge>
                          </div>
                          <h4 className="font-black text-primary group-hover:text-accent transition-colors truncate uppercase italic text-lg leading-none tracking-tight">{item.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 uppercase font-bold text-[10px] italic"><Building2 className="h-3.5 w-3.5 text-accent" /> {item.entity}</p>
                        </div>
                      </Link>
                      <Link href={`/bids/${item.bidId}`}><div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm"><ChevronRight className="h-5 w-5" /></div></Link>
                    </div>
                  ))}
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
                 <Sparkles className="h-6 w-6" /> Control Operativo
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6 relative z-10">
               <p className="text-sm text-primary-foreground/90 leading-relaxed font-medium italic">
                 Monitorea el rendimiento del ecosistema y el margen bruto del SaaS en tiempo real.
               </p>
               <div className="p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm space-y-2">
                 <p className="text-[10px] uppercase font-black text-accent tracking-widest flex items-center gap-2"><Target className="h-3 w-3" /> Recomendación PCG</p>
                 <p className="text-xs font-bold leading-tight">Si los números de Convenio no suben, asegúrate de haber desplegado las funciones de 5ª generación.</p>
               </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
