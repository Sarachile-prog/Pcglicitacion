"use client"

import { useState, useMemo, useEffect } from "react"
import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  Building2, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Database,
  Sparkles,
  Loader2,
  Globe,
  Zap,
  BarChart3,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  X,
  CloudDownload,
  Server
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, getBidDetail } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, startOfDay, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ITEMS_PER_PAGE = 50;

export default function BidsListPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [amountFilter, setAmountFilter] = useState("all")
  const [sortBy, setSortBy] = useState("scrapedAt")
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    let initialDate = today;
    if (day === 0) initialDate = subDays(today, 2); 
    if (day === 6) initialDate = subDays(today, 1);
    setSelectedDate(initialDate);
  }, []);

  const { toast } = useToast()

  // Perfil para validación de SuperAdmin
  const profileRef = useMemoFirebase(() => user ? doc(db!, "users", user.uid) : null, [db, user])
  const { data: profile } = useDoc(profileRef)
  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || profile?.role === 'SuperAdmin'

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(500) 
    )
  }, [db])

  const { data: bids, isLoading: isDbLoading } = useCollection(bidsQuery)

  // ESTADÍSTICAS DE MAGNITUD REALES
  const stats = useMemo(() => {
    if (!bids) return { total: 0, enriched: 0, pending: 0 };
    const total = bids.length;
    // Definimos enriquecida si tiene entidad y el nombre NO es el genérico de fallback
    const enriched = bids.filter(b => b.entity && b.entity !== "Institución no especificada").length;
    return { total, enriched, pending: total - enriched };
  }, [bids]);

  const handleSync = async () => {
    if (!selectedDate || !isSuperAdmin) return;
    setIsSyncing(true)
    const formattedDate = format(selectedDate, "ddMMyyyy")
    
    try {
      toast({
        title: "Sincronizando IDs",
        description: `Consultando portal para el ${format(selectedDate, "dd/MM")}...`,
      })
      await getBidsByDate(formattedDate)
      toast({ title: "Importación Exitosa", description: "Base de datos actualizada con nuevos IDs." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de API", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEnrich = async () => {
    if (!bids || bids.length === 0 || !isSuperAdmin) return;
    setIsEnriching(true);
    let count = 0;
    try {
      // Intentamos enriquecer TODAS las que faltan en el set de datos cargado (hasta 500)
      const toEnrich = bids.filter(b => !b.entity || b.entity === "Institución no especificada");
      
      if (toEnrich.length === 0) {
        toast({ title: "Datos Completos", description: "Todo el repositorio visible ya está enriquecido." });
        return;
      }
      
      toast({ title: "Iniciando Enriquecimiento", description: `Procesando ${toEnrich.length} licitaciones...` });
      
      for (const bid of toEnrich) {
        await getBidDetail(bid.id);
        count++;
        // Pausa táctica para evitar 429 Too Many Requests de la API oficial
        if (count % 3 === 0) await new Promise(r => setTimeout(r, 1500));
      }
      toast({ title: "Proceso Finalizado", description: `Se han enriquecido ${count} licitaciones exitosamente.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "API Saturada", description: "Mercado Público ha limitado las peticiones. Intenta más tarde." });
    } finally {
      setIsEnriching(false);
    }
  }

  const filteredBids = useMemo(() => {
    let results = bids ? [...bids] : [];
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      results = results.filter(bid => 
        bid.title?.toLowerCase().includes(search) || 
        bid.entity?.toLowerCase().includes(search) ||
        bid.id?.toLowerCase().includes(search)
      )
    }

    if (statusFilter !== "all") {
      results = results.filter(bid => bid.status === statusFilter)
    }

    if (amountFilter !== "all") {
      results = results.filter(bid => {
        const amount = Number(bid.amount) || 0
        if (amountFilter === "low") return amount < 5000000
        if (amountFilter === "mid") return amount >= 5000000 && amount <= 50000000
        if (amountFilter === "high") return amount > 50000000
        return true
      })
    }

    results.sort((a, b) => {
      if (sortBy === "amount") return (Number(b.amount) || 0) - (Number(a.amount) || 0)
      if (sortBy === "deadline") {
        const dateA = a.deadlineDate ? new Date(a.deadlineDate).getTime() : 0
        const dateB = b.deadlineDate ? new Date(b.deadlineDate).getTime() : 0
        return dateA - dateB
      }
      return 0
    })

    return results
  }, [bids, searchTerm, statusFilter, amountFilter, sortBy])

  const totalPages = Math.ceil(filteredBids.length / ITEMS_PER_PAGE);
  const pagedBids = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBids.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBids, currentPage]);

  const formatCurrency = (amount: number, currency: string) => {
    if (!amount || amount <= 0) return 'Por Definir';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency || 'CLP', maximumFractionDigits: 0 }).format(amount);
  }

  const renderDaysLeftBadge = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;
    const diff = differenceInDays(startOfDay(deadline), startOfDay(new Date()));
    if (diff < 0) return <Badge variant="outline" className="text-[9px] text-gray-400 font-bold uppercase">Cerrada</Badge>;
    if (diff === 0) return <Badge className="text-[9px] bg-red-600 text-white font-bold animate-pulse uppercase">Hoy</Badge>;
    return <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent font-bold uppercase">{diff} días</Badge>;
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setAmountFilter("all")
    setSortBy("scrapedAt")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || amountFilter !== "all" || sortBy !== "scrapedAt";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary -ml-2"><ChevronLeft className="h-4 w-4 mr-1" /> Dashboard</Button></Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-primary italic uppercase flex items-center gap-2"><Globe className="h-6 w-6 text-accent" /> Explorador de Mercado</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500 text-white text-[10px] font-black uppercase italic tracking-widest animate-pulse px-3">Repositorio al día</Badge>
              <p className="text-muted-foreground font-medium italic text-xs">Viendo licitaciones compartidas PCG sincronizadas para hoy.</p>
            </div>
          </div>
          
          {/* CONTROL DE INFRAESTRUCTURA (SOLO SUPERADMIN) */}
          {isSuperAdmin && (
            <Card className="bg-primary/5 border-primary/20 p-2 shadow-inner flex flex-wrap items-center gap-2 rounded-2xl">
              <div className="px-3 py-1 bg-white rounded-xl border flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase text-primary italic">Modo Admin</span>
              </div>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild><Button variant="outline" className="w-[160px] h-10 border-primary/20 bg-white font-bold text-xs rounded-xl">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "---"}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate || undefined} onSelect={(d) => { if(d){ setSelectedDate(d); setIsCalendarOpen(false); } }} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
              </Popover>
              <Button size="sm" className="bg-primary font-black h-10 uppercase italic text-[9px] rounded-xl px-4" onClick={handleSync} disabled={isSyncing}><RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} /> Ingesta IDs</Button>
              <Button size="sm" className="bg-accent font-black h-10 uppercase italic text-[9px] shadow-lg rounded-xl px-4" onClick={handleEnrich} disabled={isEnriching || isSyncing || !bids?.length}>
                {isEnriching ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Database className="h-3 w-3 mr-2" />} Enriquecer Repo
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* PANEL DE MAGNITUD OPERATIVA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-xl overflow-hidden rounded-[2rem] group border-2 hover:border-primary/10 transition-all">
          <div className="h-2 bg-primary/20" />
          <CardContent className="p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center shrink-0"><Layers className="h-8 w-8 text-primary" /></div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Volumen Total</p>
              <h3 className="text-4xl font-black text-primary italic tracking-tighter leading-none">{stats.total} <span className="text-xs font-medium opacity-40 uppercase tracking-widest">Bids</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-xl overflow-hidden rounded-[2rem] border-2 hover:border-emerald-100 transition-all">
          <div className="h-2 bg-emerald-500" />
          <CardContent className="p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">PCG Local (Listos)</p>
              <h3 className="text-4xl font-black text-emerald-600 italic tracking-tighter leading-none">{stats.enriched} <span className="text-xs font-medium opacity-40 uppercase tracking-widest">Base</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-xl overflow-hidden rounded-[2rem] border-2 hover:border-amber-100 transition-all">
          <div className="h-2 bg-amber-500" />
          <CardContent className="p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center shrink-0"><CloudDownload className="h-8 w-8 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">En la Nube (Pendiente)</p>
              <h3 className="text-4xl font-black text-amber-600 italic tracking-tighter leading-none">{stats.pending} <span className="text-xs font-medium opacity-40 uppercase tracking-widest">Sync</span></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS TÁCTICOS */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 space-y-6 bg-muted/5">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-[0.2em]">Buscador Inteligente</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                <Input 
                  placeholder="ID, Título o Institución..." 
                  className="pl-12 h-14 bg-white border-2 border-primary/5 rounded-2xl shadow-sm font-bold italic" 
                  value={searchTerm} 
                  onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} 
                />
              </div>
            </div>

            <div className="w-full lg:w-48 space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-[0.2em]">Estado</label>
              <Select value={statusFilter} onValueChange={(v) => {setStatusFilter(v); setCurrentPage(1);}}>
                <SelectTrigger className="h-14 bg-white border-2 rounded-2xl font-black text-xs uppercase italic">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold">Todos</SelectItem>
                  <SelectItem value="Publicada" className="font-bold">Publicada</SelectItem>
                  <SelectItem value="Cerrada" className="font-bold">Cerrada</SelectItem>
                  <SelectItem value="Adjudicada" className="font-bold">Adjudicada</SelectItem>
                  <SelectItem value="Desierta" className="font-bold">Desierta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-48 space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-[0.2em]">Monto</label>
              <Select value={amountFilter} onValueChange={(v) => {setAmountFilter(v); setCurrentPage(1);}}>
                <SelectTrigger className="h-14 bg-white border-2 rounded-2xl font-black text-xs uppercase italic">
                  <SelectValue placeholder="Rango" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold">Cualquier Monto</SelectItem>
                  <SelectItem value="low" className="font-bold">Menos de $5M</SelectItem>
                  <SelectItem value="mid" className="font-bold">$5M - $50M</SelectItem>
                  <SelectItem value="high" className="font-bold">Más de $50M</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-48 space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-[0.2em]">Prioridad</label>
              <Select value={sortBy} onValueChange={(v) => {setSortBy(v); setCurrentPage(1);}}>
                <SelectTrigger className="h-14 bg-white border-2 rounded-2xl font-black text-xs uppercase italic">
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scrapedAt" className="font-bold">Sincronización</SelectItem>
                  <SelectItem value="deadline" className="font-bold">Próximas a Cerrar</SelectItem>
                  <SelectItem value="amount" className="font-bold">Monto Mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                onClick={clearFilters} 
                className="h-14 px-6 text-xs font-black uppercase text-red-500 hover:bg-red-50 hover:text-red-600 transition-all rounded-2xl"
              >
                <X className="h-4 w-4 mr-2" /> Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-primary animate-spin opacity-20" />
            <Server className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground font-black uppercase text-xs tracking-[0.3em] italic">Escaneando Repositorio Global PCG...</p>
        </div>
      ) : pagedBids.length > 0 ? (
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem]">
            <Table>
              <TableHeader className="bg-muted/50 border-b-2">
                <TableRow>
                  <TableHead className="w-[140px] font-black uppercase text-[10px] py-6 px-6 tracking-widest">ID / Status</TableHead>
                  <TableHead className="min-w-[300px] font-black uppercase text-[10px] py-6 tracking-widest">Detalle Estratégico</TableHead>
                  <TableHead className="font-black uppercase text-center text-[10px] py-6 tracking-widest">Cierre</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] py-6 px-6 tracking-widest">Monto Est.</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBids.map((bid) => {
                  const isEnriched = bid.entity && bid.entity !== "Institución no especificada";
                  return (
                    <TableRow key={bid.id} className="group hover:bg-primary/5 transition-colors cursor-pointer border-b last:border-0">
                      <TableCell className="font-mono text-xs font-bold text-primary py-6 px-6">
                        <Link href={`/bids/${bid.id}`} className="flex flex-col gap-2">
                          <span className="bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 inline-block w-fit">{bid.id}</span>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase leading-none">{bid.status}</Badge>
                            {bid.aiAnalysis && <Badge className="bg-accent/10 text-accent border-none h-4 px-1.5 text-[8px] font-black"><Sparkles className="h-2 w-2 mr-1 fill-accent" /> IA</Badge>}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="py-6">
                        <Link href={`/bids/${bid.id}`} className="space-y-2 block">
                          <p className="font-black text-lg line-clamp-1 group-hover:text-accent uppercase italic text-primary leading-tight tracking-tight transition-colors">{bid.title}</p>
                          <div className="flex items-center gap-3">
                            <p className={cn("text-[10px] flex items-center gap-1.5 uppercase font-bold tracking-tight", !isEnriched ? "text-amber-600 italic" : "text-muted-foreground")}>
                              <Building2 className="h-3.5 w-3.5" /> {!isEnriched ? "Pendiente Datos (Nube)..." : bid.entity}
                            </p>
                            {isEnriched && <Badge className="text-[8px] h-4 px-2 border-emerald-500/20 text-emerald-600 font-black bg-emerald-500/10 uppercase italic">PCG Local</Badge>}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center py-6">{renderDaysLeftBadge(bid.deadlineDate)}</TableCell>
                      <TableCell className={cn("text-right font-black italic py-6 px-6 text-xl tracking-tighter", !isEnriched ? "text-amber-600/30" : "text-primary")}>
                        {formatCurrency(bid.amount, bid.currency)}
                      </TableCell>
                      <TableCell className="py-6 pr-6"><Link href={`/bids/${bid.id}`}><div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm"><ChevronRight className="h-5 w-5" /></div></Link></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
          
          <div className="flex justify-between items-center px-4 bg-white/50 p-4 rounded-3xl border">
            <p className="text-[10px] font-black text-muted-foreground uppercase italic tracking-widest">Página {currentPage} de {totalPages} • Mostrando {pagedBids.length} de {filteredBids.length} registros</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-10 w-10 p-0 rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-10 w-10 p-0 rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-primary/5 border-dashed border-4 border-primary/10 py-32 text-center space-y-6 rounded-[4rem] animate-in zoom-in-95">
          <div className="h-24 w-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto transform -rotate-6 border border-primary/10">
            <Globe className="h-12 w-12 text-primary/20" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-primary italic uppercase tracking-tighter">Sin coincidencias tácticas</h3>
            <p className="text-muted-foreground max-w-sm mx-auto font-bold italic leading-relaxed">
              El repositorio es vasto, pero no encontramos nada con estos filtros. Prueba ampliando el rango de búsqueda.
            </p>
          </div>
          <Button variant="outline" onClick={clearFilters} className="font-black uppercase italic h-14 px-10 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-lg rounded-2xl">Reiniciar Explorador</Button>
        </Card>
      )}
    </div>
  )
}
