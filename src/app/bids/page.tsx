
"use client"

import { useState, useMemo, useEffect } from "react"
import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
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
  Layers,
  ShieldCheck,
  CheckCircle2,
  CloudDownload,
  Server,
  Activity
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, getBidDetail, syncOcdsHistorical } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, startOfDay, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const ITEMS_PER_PAGE = 50;

export default function BidsListPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("scrapedAt")
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichCount, setEnrichCount] = useState(0)
  const [enrichTotal, setEnrichTotal] = useState(0)
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const [isOcdsDialogOpen, setIsOcdsDialogOpen] = useState(false)
  const [ocdsYear, setOcdsYear] = useState("2026")
  const [ocdsMonth, setOcdsMonth] = useState("02")
  const [ocdsType, setOcdsType] = useState<'Licitacion' | 'TratoDirecto' | 'Convenio'>('Licitacion')
  const [isOcdsLoading, setIsOcdsLoading] = useState(false)
  
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    let initialDate = today;
    if (day === 0) initialDate = subDays(today, 2); 
    if (day === 6) initialDate = subDays(today, 1);
    setSelectedDate(initialDate);
    setOcdsYear("2026");
    setOcdsMonth("02");
  }, []);

  const profileRef = useMemoFirebase(() => user ? doc(db!, "users", user.uid) : null, [db, user])
  const { data: profile } = useDoc(profileRef)
  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || profile?.role === 'SuperAdmin'

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "bids"), orderBy("scrapedAt", "desc"), limit(500))
  }, [db])

  const { data: bids, isLoading: isDbLoading } = useCollection(bidsQuery)

  const stats = useMemo(() => {
    if (!bids) return { total: 0, enriched: 0, pending: 0 };
    const total = bids.length;
    const enriched = bids.filter(b => b.entity && b.entity !== "Institución no especificada").length;
    return { total, enriched, pending: total - enriched };
  }, [bids]);

  const handleSync = async () => {
    if (!selectedDate || !isSuperAdmin) return;
    setIsSyncing(true)
    const formattedDate = format(selectedDate, "ddMMyyyy")
    try {
      toast({ title: "Sincronizando IDs", description: `Consultando portal...` })
      await getBidsByDate(formattedDate)
      toast({ title: "Importación Exitosa" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de API", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOcdsSync = async () => {
    if (!isSuperAdmin) return;
    setIsOcdsLoading(true)
    try {
      toast({ title: "Iniciando OCDS", description: "Esto puede tardar un minuto..." })
      const res = await syncOcdsHistorical(ocdsYear, ocdsMonth, ocdsType)
      if (res.success) {
        toast({ title: "Éxito OCDS", description: res.message })
        setIsOcdsDialogOpen(false)
      } else {
        toast({ variant: "destructive", title: "Incompleto", description: res.message })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error OCDS", description: e.message })
    } finally {
      setIsOcdsLoading(false)
    }
  }

  const handleEnrich = async () => {
    if (!bids || bids.length === 0 || !isSuperAdmin) return;
    const toEnrich = bids.filter(b => !b.entity || b.entity === "Institución no especificada");
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
      toast({ variant: "destructive", title: "Saturación API" });
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
    if (statusFilter !== "all") results = results.filter(bid => bid.status === statusFilter)
    return results
  }, [bids, searchTerm, statusFilter])

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary -ml-2"><ChevronLeft className="h-4 w-4 mr-1" /> Dashboard</Button></Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-primary italic uppercase flex items-center gap-2"><Globe className="h-6 w-6 text-accent" /> Explorador de Mercado</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500 text-white text-[10px] font-black uppercase italic tracking-widest animate-pulse px-3">Repo 2026</Badge>
            </div>
          </div>
          
          {isSuperAdmin && (
            <Card className="bg-primary/5 border-primary/20 p-2 shadow-inner flex flex-wrap items-center gap-2 rounded-2xl">
              <Dialog open={isOcdsDialogOpen} onOpenChange={setIsOcdsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 font-black h-10 uppercase italic text-[9px] rounded-xl px-4 text-white">
                    <HistoryLocalIcon className="h-3.5 w-3.5 mr-2" /> Ingesta OCDS
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase italic">Carga Histórica</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input value={ocdsYear} onChange={(e) => setOcdsYear(e.target.value)} placeholder="Año" />
                      <Input value={ocdsMonth} onChange={(e) => setOcdsMonth(e.target.value)} placeholder="Mes" />
                    </div>
                    <Select value={ocdsType} onValueChange={(v: any) => setOcdsType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Licitacion">Licitaciones</SelectItem>
                        <SelectItem value="TratoDirecto">Tratos Directos</SelectItem>
                        <SelectItem value="Convenio">Convenio Marco</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleOcdsSync} disabled={isOcdsLoading} className="w-full h-12 bg-primary font-black uppercase italic">
                      {isOcdsLoading ? <Loader2 className="animate-spin mr-2" /> : <CloudDownload className="mr-2" />} Iniciar Succión
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild><Button variant="outline" className="w-[160px] h-10 border-primary/20 bg-white font-bold text-xs rounded-xl">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "---"}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate || undefined} onSelect={(d) => { if(d){ setSelectedDate(d); setIsCalendarOpen(false); } }} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
              </Popover>
              <Button size="sm" className="bg-primary font-black h-10 uppercase italic text-[9px] rounded-xl px-4" onClick={handleSync} disabled={isSyncing}><RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} /> Ingesta IDs</Button>
              <Button size="sm" className="bg-accent text-white font-black h-10 uppercase italic text-[9px] rounded-xl px-4" onClick={handleEnrich} disabled={isEnriching}>
                {isEnriching ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Procesando...</> : <><Database className="h-3 w-3 mr-2" /> Enriquecer</>}
              </Button>
            </Card>
          )}
        </div>
      </div>

      {isEnriching && (
        <Card className="border-accent bg-accent/5 shadow-lg animate-in slide-in-from-top-4">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent animate-pulse" /><span className="text-xs font-black uppercase text-accent tracking-widest italic">Enriqueciendo datos técnicos...</span></div><span className="text-xs font-black text-primary italic">{Math.round((enrichCount / (enrichTotal || 1)) * 100)}%</span></div>
            <Progress value={(enrichCount / (enrichTotal || 1)) * 100} className="h-2.5 bg-accent/20" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-xl rounded-[2rem]"><CardContent className="p-8 flex items-center gap-6"><div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center shrink-0"><Layers className="h-8 w-8 text-primary" /></div><div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Total</p><h3 className="text-4xl font-black text-primary italic tracking-tighter">{stats.total}</h3></div></CardContent></Card>
        <Card className="bg-white border-none shadow-xl rounded-[2rem]"><CardContent className="p-8 flex items-center gap-6"><div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div><div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Enriquecidos</p><h3 className="text-4xl font-black text-emerald-600 italic tracking-tighter">{stats.enriched}</h3></div></CardContent></Card>
        <Card className="bg-white border-none shadow-xl rounded-[2rem]"><CardContent className="p-8 flex items-center gap-6"><div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center shrink-0"><CloudDownload className="h-8 w-8 text-amber-600" /></div><div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Pendientes</p><h3 className="text-4xl font-black text-amber-600 italic tracking-tighter">{stats.pending}</h3></div></CardContent></Card>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 space-y-6 bg-muted/5">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                <Input placeholder="ID, Título o Institución..." className="pl-12 h-14 bg-white border-2 border-primary/5 rounded-2xl shadow-sm font-bold italic" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
              </div>
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

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6"><Loader2 className="h-16 w-16 text-primary animate-spin opacity-20" /><p className="text-muted-foreground font-black uppercase text-xs tracking-[0.3em] italic">Escaneando Repositorio Global PCG...</p></div>
      ) : pagedBids.length > 0 ? (
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem]">
            <Table>
              <TableHeader className="bg-muted/50 border-b-2">
                <TableRow>
                  <TableHead className="w-[140px] font-black uppercase text-[10px] py-6 px-6">ID / Status</TableHead>
                  <TableHead className="min-w-[300px] font-black uppercase text-[10px] py-6">Detalle Estratégico</TableHead>
                  <TableHead className="font-black uppercase text-center text-[10px] py-6">Cierre</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] py-6 px-6">Monto Est.</TableHead>
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
                          <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase leading-none">{bid.status}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="py-6">
                        <Link href={`/bids/${bid.id}`} className="space-y-2 block">
                          <p className="font-black text-lg line-clamp-1 group-hover:text-accent uppercase italic text-primary leading-tight">{bid.title}</p>
                          <p className={cn("text-[10px] flex items-center gap-1.5 uppercase font-bold tracking-tight", !isEnriched ? "text-amber-600 italic" : "text-muted-foreground")}>
                            <Building2 className="h-3.5 w-3.5" /> {!isEnriched ? "Pendiente Datos..." : bid.entity}
                          </p>
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
            <p className="text-[10px] font-black text-muted-foreground uppercase italic">Página {currentPage} de {totalPages}</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-10 w-10 p-0 rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-10 w-10 p-0 rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-primary/5 border-dashed border-4 border-primary/10 py-32 text-center space-y-6 rounded-[4rem]">
          <Globe className="h-12 w-12 text-primary/20 mx-auto" /><h3 className="text-3xl font-black text-primary italic uppercase">Sin coincidencias</h3>
          <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="font-black uppercase italic h-14 px-10 border-primary text-primary rounded-2xl">Reiniciar Explorador</Button>
        </Card>
      )}
    </div>
  )
}

function HistoryLocalIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
