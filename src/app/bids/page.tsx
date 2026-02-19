"use client"

import { useState, useMemo, useEffect } from "react"
import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc, getCountFromServer, getDoc, where, QueryConstraint } from "firebase/firestore"
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
  Loader2,
  Globe,
  Zap,
  Layers,
  CheckCircle2,
  CloudDownload,
  Activity,
  Server,
  AlertCircle,
  SearchCode,
  Tag,
  Info,
  BarChart3,
  CalendarDays,
  Clock,
  Filter
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, getBidDetail, syncOcdsHistorical } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

const ITEMS_PER_PAGE = 50;

// FUNCIÓN MAESTRA DE PERSISTENCIA
export const isBidEnriched = (bid: any) => {
  if (!bid.entity) return false;
  const pendingStrings = [
    "Pendiente Enriquecimiento", 
    "Institución no especificada", 
    "Pendiente Datos...", 
    "Pendiente",
    "NO ESPECIFICADA"
  ];
  const hasValidEntity = !pendingStrings.some(ps => bid.entity.toUpperCase().includes(ps.toUpperCase()));
  const hasDeepDetail = !!bid.fullDetailAt;
  return hasValidEntity || hasDeepDetail;
}

export default function BidsListPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichCount, setEnrichCount] = useState(0)
  const [enrichTotal, setEnrichTotal] = useState(0)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isOcdsDialogOpen, setIsOcdsDialogOpen] = useState(false)
  const [ocdsYear, setOcdsYear] = useState("2025")
  const [ocdsMonth, setOcdsMonth] = useState("08")
  const [ocdsType, setOcdsType] = useState<'Licitacion' | 'TratoDirecto' | 'Convenio'>('Licitacion')
  const [isOcdsLoading, setIsOcdsLoading] = useState(false)
  const [isCheckingVolume, setIsCheckingVolume] = useState(false)
  const [marketVolume, setMarketVolume] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false);
  const [globalDbCount, setGlobalDbCount] = useState<number | null>(null);
  const [isRefreshingCount, setIsRefreshingCount] = useState(false);
  
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [globalSearchResult, setGlobalSearchResult] = useState<any>(null);

  const fetchGlobalCount = async () => {
    if (!db) return;
    setIsRefreshingCount(true);
    try {
      const coll = collection(db, "bids");
      const snapshot = await getCountFromServer(coll);
      setGlobalDbCount(snapshot.data().count);
    } catch (e) {
      console.error("Error fetching global count:", e);
    } finally {
      setIsRefreshingCount(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    if (db && mounted) {
      fetchGlobalCount();
    }
  }, [db, mounted]);

  // QUERY OPTIMIZADA PARA EVITAR ÍNDICES COMPUESTOS
  // Si hay filtros, Firestore no permite orderBy por otro campo sin un índice compuesto.
  // Para prototipos, quitamos el orderBy del servidor cuando hay filtros y ordenamos en memoria.
  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null;
    
    const constraints: QueryConstraint[] = [];
    
    if (typeFilter !== "all") {
      constraints.push(where("type", "==", typeFilter));
    }
    
    if (statusFilter !== "all") {
      constraints.push(where("status", "==", statusFilter));
    }

    // Solo ordenamos por servidor si NO hay filtros aplicados para evitar error de índice
    if (typeFilter === "all" && statusFilter === "all") {
      constraints.push(orderBy("scrapedAt", "desc"));
    }
    
    constraints.push(limit(1000));
    
    return query(collection(db, "bids"), ...constraints);
  }, [db, typeFilter, statusFilter]);

  const { data: bids, isLoading: isDbLoading, error: queryError } = useCollection(bidsQuery)

  // Búsqueda y ordenamiento en memoria (Capa de lógica)
  const filteredBids = useMemo(() => {
    let results = bids ? [...bids] : [];

    // Ordenar manualmente si hay filtros (ya que el servidor no pudo hacerlo)
    if (typeFilter !== "all" || statusFilter !== "all") {
      results.sort((a, b) => {
        const dateA = a.scrapedAt?.toDate?.() || new Date(0);
        const dateB = b.scrapedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      results = results.filter(bid => 
        bid.title?.toLowerCase().includes(search) || 
        bid.entity?.toLowerCase().includes(search) ||
        bid.id?.toLowerCase().includes(search)
      )
    }
    return results
  }, [bids, searchTerm, typeFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!db || !searchTerm.trim() || (filteredBids.length > 0 && searchTerm.length < 10)) {
        setGlobalSearchResult(null);
        return;
      }

      if (searchTerm.length > 5) {
        setIsGlobalSearching(true);
        try {
          const bidId = searchTerm.trim();
          const bidSnap = await getDoc(doc(db, "bids", bidId));
          if (bidSnap.exists()) {
            setGlobalSearchResult({ ...bidSnap.data(), id: bidSnap.id });
          } else {
            setGlobalSearchResult(null);
          }
        } catch (e) {
          console.error("Error en búsqueda global automática:", e);
        } finally {
          setIsGlobalSearching(false);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchTerm, filteredBids.length, db]);

  const stats = useMemo(() => {
    if (!bids) return { totalInView: 0, enriched: 0, pending: 0 };
    const totalInView = bids.length;
    const enriched = bids.filter(isBidEnriched).length;
    return { totalInView, enriched, pending: totalInView - enriched };
  }, [bids]);

  const handleSync = async () => {
    if (!selectedDate) return;
    setIsSyncing(true)
    const formattedDate = format(selectedDate, "ddMMyyyy")
    try {
      await getBidsByDate(formattedDate)
      toast({ title: "Importación Exitosa" })
      setTimeout(fetchGlobalCount, 2000);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOcdsSync = async () => {
    setIsOcdsLoading(true)
    try {
      const res = await syncOcdsHistorical(ocdsYear, ocdsMonth, ocdsType)
      if (res.success) {
        toast({ title: "Éxito OCDS", description: res.message })
        setIsOcdsDialogOpen(false)
        setMarketVolume(null)
        setTimeout(fetchGlobalCount, 2500);
      } else {
        toast({ variant: "destructive", title: "Incompleto", description: res.message })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsOcdsLoading(false)
    }
  }

  const handleCheckVolume = async () => {
    setIsCheckingVolume(true)
    setMarketVolume(null)
    try {
      const res = await syncOcdsHistorical(ocdsYear, ocdsMonth, ocdsType, true)
      if (res.success) {
        setMarketVolume(res.count)
        toast({ title: "Volumen Detectado", description: `Hay ${res.count} procesos para este periodo.` })
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo obtener el volumen." })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsCheckingVolume(false)
    }
  }

  const handleEnrich = async () => {
    if (!bids || bids.length === 0) return;
    const toEnrich = bids.filter(b => !isBidEnriched(b));
    if (toEnrich.length === 0) {
      toast({ title: "Datos Completos" });
      return;
    }
    setIsEnriching(true);
    setEnrichTotal(toEnrich.length);
    setEnrichCount(0);
    try {
      for (const bid of toEnrich) {
        await getBidDetail(bid.id);
        setEnrichCount(prev => prev + 1);
        await new Promise(r => setTimeout(r, 1200));
      }
      toast({ title: "Enriquecido Finalizado" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Límite de API alcanzado temporalmente." });
    } finally {
      setIsEnriching(false);
    }
  }

  const totalPages = Math.ceil(filteredBids.length / ITEMS_PER_PAGE);
  const pagedBids = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBids.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBids, currentPage]);

  const formatCurrency = (amount: number, currency: string) => {
    if (!amount || amount <= 0) return '---';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency || 'CLP', maximumFractionDigits: 0 }).format(amount);
  }

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-muted-foreground"><ChevronLeft className="h-4 w-4 mr-1" /> Dashboard</Button></Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-primary italic uppercase flex items-center gap-2"><Globe className="h-6 w-6 text-accent" /> Explorador de Mercado</h2>
            <div className="flex gap-2">
              <Badge className="bg-emerald-500 text-white text-[10px] font-black uppercase italic">Repo Oficial 2026</Badge>
              <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/20">Soporte Convenio Marco</Badge>
            </div>
          </div>
          
          <Card className="bg-primary/5 border-primary/20 p-2 shadow-inner flex flex-wrap items-center gap-2 rounded-2xl">
            <Dialog open={isOcdsDialogOpen} onOpenChange={(open) => { setIsOcdsDialogOpen(open); if(!open) setMarketVolume(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 font-black h-10 uppercase italic text-[9px] rounded-xl px-4 text-white">
                  <CloudDownload className="h-3.5 w-3.5 mr-2" /> Ingesta Masiva (OCDS)
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-4">
                <DialogHeader><DialogTitle className="text-xl font-black uppercase italic">Succión Histórica OCDS</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase ml-1 opacity-60">Año</label>
                      <Input value={ocdsYear} onChange={(e) => setOcdsYear(e.target.value)} placeholder="Ej: 2025" className="font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase ml-1 opacity-60">Mes</label>
                      <Input value={ocdsMonth} onChange={(e) => setOcdsMonth(e.target.value)} placeholder="01 a 12" className="font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase ml-1 opacity-60">Tipo de Proceso</label>
                    <Select value={ocdsType} onValueChange={(v: any) => setOcdsType(v)}>
                      <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Licitacion" className="font-bold">Licitaciones Públicas</SelectItem>
                        <SelectItem value="TratoDirecto" className="font-bold">Tratos Directos</SelectItem>
                        <SelectItem value="Convenio" className="font-bold">Convenio Marco (Catálogo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 bg-muted/20 rounded-2xl border-2 border-dashed space-y-4 text-center">
                    {marketVolume === null ? (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-muted-foreground italic">¿Cuántas licitaciones hay en este periodo?</p>
                        <Button 
                          variant="outline" 
                          onClick={handleCheckVolume} 
                          disabled={isCheckingVolume}
                          className="w-full h-12 border-emerald-500 text-emerald-600 font-black uppercase italic rounded-xl hover:bg-emerald-50"
                        >
                          {isCheckingVolume ? <Loader2 className="animate-spin mr-2" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                          Consultar Volumen Mercado
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 animate-in zoom-in-95">
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-3xl font-black italic">{marketVolume.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] font-black uppercase text-emerald-700/70">Procesos detectados en el portal oficial</p>
                      </div>
                    )}
                  </div>

                  <Button onClick={handleOcdsSync} disabled={isOcdsLoading || isCheckingVolume} className="w-full h-14 bg-primary font-black uppercase italic shadow-xl text-lg rounded-2xl transform active:scale-95 transition-all">
                    {isOcdsLoading ? <Loader2 className="animate-spin mr-2" /> : <CloudDownload className="mr-2" />} 
                    {isOcdsLoading ? "Ingestando..." : "Iniciar Succión de Datos"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild><Button variant="outline" className="w-[160px] h-10 border-primary/20 bg-white font-bold text-xs rounded-xl">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "---"}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate || undefined} onSelect={(d) => { if(d){ setSelectedDate(d); setIsCalendarOpen(false); } }} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
            </Popover>
            <Button size="sm" className="bg-primary font-black h-10 uppercase italic text-[9px] rounded-xl px-4" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} /> Ingesta IDs
            </Button>
            <Button size="sm" className="bg-accent text-white font-black h-10 uppercase italic text-[9px] rounded-xl px-4" onClick={handleEnrich} disabled={isEnriching}>
              {isEnriching ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> {enrichCount}/{enrichTotal}</> : <><Database className="h-3 w-3 mr-2" /> Enriquecer Repo</>}
            </Button>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Server className="h-16 w-16" /></div>
          <CardContent className="p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center shrink-0">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Total en Base de Datos</p>
                <button onClick={fetchGlobalCount} disabled={isRefreshingCount} className="p-1 hover:bg-primary/5 rounded-lg transition-colors">
                  <RefreshCw className={cn("h-3 w-3 text-primary", isRefreshingCount && "animate-spin")} />
                </button>
              </div>
              <h3 className="text-4xl font-black text-primary italic tracking-tighter">
                {globalDbCount !== null ? globalDbCount.toLocaleString() : "---"}
              </h3>
              <p className="text-[8px] font-bold text-muted-foreground mt-1 uppercase flex items-center gap-1">
                <Clock className="h-2 w-2" /> Actualizado ahora
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 className="h-16 w-16" /></div>
          <CardContent className="p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Enriquecidos (Vista)</p>
              <h3 className="text-4xl font-black text-emerald-600 italic tracking-tighter">{stats.enriched}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5"><CloudDownload className="h-16 w-16" /></div>
          <CardContent className="p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center shrink-0"><CloudDownload className="h-8 w-8 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Pendientes (Vista)</p>
              <h3 className="text-4xl font-black text-amber-600 italic tracking-tighter">{stats.pending}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 space-y-6 bg-muted/5">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <div className="relative">
                {isGlobalSearching ? (
                  <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent animate-spin" />
                ) : (
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                )}
                <Input 
                  placeholder="Buscar por ID, Título o Institución..." 
                  className="pl-12 h-14 bg-white border-2 border-primary/5 rounded-2xl shadow-sm font-bold italic" 
                  value={searchTerm} 
                  onChange={(e) => {
                    setSearchTerm(e.target.value); 
                    setCurrentPage(1);
                    setGlobalSearchResult(null);
                  }} 
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Select value={typeFilter} onValueChange={(v) => {setTypeFilter(v); setCurrentPage(1);}}>
                <SelectTrigger className="h-14 bg-white border-2 rounded-2xl font-black text-xs uppercase italic">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Tipos</SelectItem>
                  <SelectItem value="Licitación">Licitaciones</SelectItem>
                  <SelectItem value="Trato Directo">Tratos Directos</SelectItem>
                  <SelectItem value="Convenio Marco">Convenio Marco</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Select value={statusFilter} onValueChange={(v) => {setStatusFilter(v); setCurrentPage(1);}}>
                <SelectTrigger className="h-14 bg-white border-2 rounded-2xl font-black text-xs uppercase italic"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Publicada">Publicada</SelectItem>
                  <SelectItem value="Cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {queryError && (
        <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-100 flex items-center gap-4 text-red-800">
          <AlertCircle className="h-10 w-10" />
          <div>
            <p className="font-black uppercase italic text-sm">Validación de Repositorio</p>
            <p className="text-xs italic">Si ves pocos resultados al filtrar, asegúrate de haber succionado datos de ese tipo para el periodo deseado.</p>
          </div>
        </div>
      )}

      {globalSearchResult && (
        <Card className="border-4 border-accent bg-accent/5 rounded-3xl overflow-hidden animate-in zoom-in-95 shadow-2xl">
          <CardHeader className="bg-accent py-3 px-6">
            <CardTitle className="text-xs font-black uppercase text-white flex items-center gap-2">
              <SearchCode className="h-4 w-4" /> Registro recuperado del repositorio histórico
            </CardTitle>
          </CardHeader>
          <Table>
            <TableBody>
              <TableRow className="bg-white hover:bg-white">
                <TableCell className="font-mono text-xs font-bold text-primary py-6 px-6 w-[140px]">
                  <Link href={`/bids/${globalSearchResult.id}`} className="flex flex-col gap-2">
                    <span className="bg-accent/10 text-accent px-2 py-1 rounded-lg border border-accent/20 inline-block w-fit">{globalSearchResult.id}</span>
                    <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase leading-none">{globalSearchResult.status}</Badge>
                  </Link>
                </TableCell>
                <TableCell className="py-6">
                  <Link href={`/bids/${globalSearchResult.id}`} className="space-y-2 block">
                    <p className="font-black text-lg uppercase italic text-primary leading-tight">{globalSearchResult.title}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] flex items-center gap-1.5 uppercase font-bold text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" /> {isBidEnriched(globalSearchResult) ? globalSearchResult.entity : "Pendiente Datos..."}
                      </p>
                      {globalSearchResult.type && (
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-accent text-accent">
                          {globalSearchResult.type}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-black italic py-6 px-6 text-xl tracking-tighter">
                  {formatCurrency(globalSearchResult.amount, globalSearchResult.currency)}
                </TableCell>
                <TableCell className="py-6 pr-6"><Link href={`/bids/${globalSearchResult.id}`}><div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white shadow-sm"><ChevronRight className="h-5 w-5" /></div></Link></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6"><Loader2 className="h-16 w-16 text-primary animate-spin opacity-20" /><p className="text-muted-foreground font-black uppercase text-xs tracking-[0.3em] italic">Consultando Repositorio Global PCG...</p></div>
      ) : pagedBids.length > 0 ? (
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem]">
            <Table>
              <TableHeader className="bg-muted/50 border-b-2">
                <TableRow>
                  <TableHead className="w-[140px] font-black uppercase text-[10px] py-6 px-6">ID / Status</TableHead>
                  <TableHead className="min-w-[300px] font-black uppercase text-[10px] py-6">Detalle Estratégico</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] py-6 px-6">Monto Est.</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBids.map((bid) => {
                  const enriched = isBidEnriched(bid);
                  return (
                    <TableRow key={bid.id} className="group hover:bg-primary/5 transition-colors cursor-pointer border-b last:border-0">
                      <TableCell className="font-mono text-xs font-bold text-primary py-6 px-6">
                        <Link href={`/bids/${bid.id}`} className="flex flex-col gap-2">
                          <span className="bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 inline-block w-fit">{bid.id}</span>
                          <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase leading-none">{bid.status}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="py-6">
                        <Link href={`/bids/${bid.id}`} className="space-y-2 block">
                          <p className="font-black text-lg line-clamp-1 group-hover:text-accent uppercase italic text-primary leading-tight">{bid.title}</p>
                          <div className="flex items-center gap-3">
                            <p className={cn("text-[10px] flex items-center gap-1.5 uppercase font-bold tracking-tight", !enriched ? "text-amber-600 italic" : "text-muted-foreground")}>
                              <Building2 className="h-3.5 w-3.5" /> {!enriched ? "Pendiente Datos..." : bid.entity}
                            </p>
                            {bid.type && (
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-black uppercase h-4 px-1.5 shadow-sm bg-white",
                                bid.type === 'Convenio Marco' ? "border-indigo-500 text-indigo-600" : "border-primary/20 text-muted-foreground"
                              )}>
                                {bid.type}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className={cn("text-right font-black italic py-6 px-6 text-xl tracking-tighter", (!bid.amount || bid.amount === 0) ? "text-amber-600/30" : "text-primary")}>
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
            <p className="text-[10px] font-black text-muted-foreground uppercase italic">Página {currentPage} de {totalPages}</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-10 w-10 p-0 rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-10 w-10 p-0 rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-primary/5 border-dashed border-4 border-primary/10 py-32 text-center space-y-6 rounded-[4rem]">
          <div className="space-y-4">
            <Globe className="h-12 w-12 text-primary/20 mx-auto" />
            <h3 className="text-3xl font-black text-primary italic uppercase">
              {isGlobalSearching ? "Consultando Repositorio Maestro..." : "Sin resultados para este filtro"}
            </h3>
            {isGlobalSearching && <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setTypeFilter("all"); setGlobalSearchResult(null); }} className="font-black uppercase italic h-14 px-10 border-primary text-primary rounded-2xl">Reiniciar Explorador</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
