
"use client"

import { useState, useMemo, useEffect } from "react"
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  Building2, 
  RefreshCw, 
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  History,
  Settings as SettingsIcon,
  AlertTriangle,
  ChevronLast,
  ChevronFirst,
  Info,
  Database,
  CheckCircle2,
  Clock,
  Filter,
  Hourglass,
  Sparkles,
  Zap,
  FileSearch,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, getBidDetail } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, isAfter, startOfDay, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES } from "@/app/lib/mock-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const ITEMS_PER_PAGE = 50;

export default function BidsListPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRubro, setSelectedRubro] = useState("all")
  const [timeRange, setTimeRange] = useState("all")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [ticketError, setTicketError] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
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

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(1000) 
    )
  }, [db])

  const { data: bids, isLoading: isDbLoading } = useCollection(bidsQuery)

  const handleSync = async () => {
    if (!selectedDate) return;
    setIsSyncing(true)
    setTicketError(false)
    const formattedDate = format(selectedDate, "ddMMyyyy")
    
    try {
      toast({
        title: "Iniciando Sincronización",
        description: `Importando IDs del ${format(selectedDate, "dd/MM")}...`,
      })
      await getBidsByDate(formattedDate)
      toast({
        title: "Importación Exitosa",
        description: `Datos básicos actualizados. Los montos aparecerán tras el enriquecimiento.`,
      })
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('ticket')) setTicketError(true)
      toast({
        variant: "destructive",
        title: "Error de API",
        description: error.message || "Servicio no disponible.",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEnrich = async () => {
    if (!pagedBids || pagedBids.length === 0) return;
    setIsEnriching(true);
    let count = 0;
    try {
      const toEnrich = pagedBids.filter(b => !b.entity || b.entity === "Institución no especificada" || !b.amount);
      if (toEnrich.length === 0) {
        toast({ title: "Datos Completos", description: "La vista actual ya está enriquecida en caché." });
        return;
      }
      toast({ title: "Enriqueciendo...", description: `Consultando detalles de ${toEnrich.length} procesos.` });
      
      for (const bid of toEnrich) {
        await getBidDetail(bid.id);
        count++;
        // Pausa técnica para evitar bloqueos de la API oficial
        if (count % 3 === 0) await new Promise(r => setTimeout(r, 1000));
      }
      toast({ title: "Proceso Finalizado", description: `Se actualizaron ${count} licitaciones.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Límite API", description: "La API oficial está saturada. Reintenta en 1 minuto." });
    } finally {
      setIsEnriching(false);
    }
  }

  const filteredBids = useMemo(() => {
    const allBids = bids || [];
    const now = new Date();
    return allBids.filter(bid => {
      const searchString = searchTerm.toLowerCase()
      const matchesSearch = 
        bid.title?.toLowerCase().includes(searchString) || 
        bid.entity?.toLowerCase().includes(searchString) ||
        bid.id?.toLowerCase().includes(searchString)
      let matchesRubro = true
      if (selectedRubro !== "all") {
        const rubroLower = selectedRubro.toLowerCase()
        matchesRubro = bid.title?.toLowerCase().includes(rubroLower) || bid.entity?.toLowerCase().includes(rubroLower)
      }
      let matchesTime = true
      const scrapedAtDate = bid.scrapedAt?.toDate ? bid.scrapedAt.toDate() : new Date(bid.scrapedAt);
      if (timeRange === "today") matchesTime = isAfter(scrapedAtDate, startOfDay(now));
      else if (timeRange === "7days") matchesTime = isAfter(scrapedAtDate, subDays(now, 7));
      return matchesSearch && matchesRubro && matchesTime
    })
  }, [bids, searchTerm, selectedRubro, timeRange])

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary -ml-2"><ChevronLeft className="h-4 w-4 mr-1" /> Dashboard</Button></Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-primary italic uppercase flex items-center gap-2"><History className="h-6 w-6 text-accent" /> Historial de Mercado</h2>
            <p className="text-muted-foreground">Datos enriquecidos y persistentes en tu base de datos local PCG.</p>
          </div>
          <Card className="bg-primary/5 border-primary/10 p-2 shadow-sm flex flex-wrap items-center gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild><Button variant="outline" className="w-[160px] h-10 border-primary/20 bg-white">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Cargando..."}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate || undefined} onSelect={(d) => { if(d){ setSelectedDate(d); setIsCalendarOpen(false); } }} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
            </Popover>
            <Button size="sm" className="bg-primary font-black h-10 uppercase italic text-[10px]" onClick={handleSync} disabled={isSyncing}><RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} /> Importar IDs</Button>
            <Button size="sm" className="bg-accent font-black h-10 uppercase italic text-[10px] shadow-lg" onClick={handleEnrich} disabled={isEnriching || isSyncing}>
              {isEnriching ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Database className="h-3 w-3 mr-2" />} 
              Completar Datos
            </Button>
          </Card>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-primary/5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-6 space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Buscador Inteligente</label>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Título, institución o ID..." className="pl-10 h-12 bg-muted/20 border-none shadow-inner" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} /></div>
        </div>
        <div className="md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Estado de Sincronización</label>
          <div className="h-12 bg-muted/20 rounded-xl flex items-center px-4 gap-2 text-xs font-bold text-primary italic">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 
            Los procesos guardados no se pierden en la sincronización diaria.
          </div>
        </div>
        <div className="md:col-span-2 flex bg-muted rounded-xl p-1.5 h-12 items-center justify-center">
          <Button variant={viewMode === 'grid' ? "secondary" : "ghost"} size="icon" className="h-full w-full rounded-lg" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? "secondary" : "ghost"} size="icon" className="h-full w-full rounded-lg" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="h-12 w-12 text-primary animate-spin opacity-20" /><p className="text-muted-foreground font-medium">Consultando persistencia...</p></div>
      ) : pagedBids.length > 0 ? (
        <Card className="overflow-hidden border-none shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px] font-bold">ID</TableHead>
                <TableHead className="min-w-[250px] font-bold">Título / Institución</TableHead>
                <TableHead className="font-bold text-center">Plazo</TableHead>
                <TableHead className="text-right font-bold">Monto Estimado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedBids.map((bid) => {
                const isMissingData = !bid.entity || bid.entity === "Institución no especificada" || !bid.amount;
                return (
                  <TableRow key={bid.id} className="group hover:bg-accent/5 cursor-pointer">
                    <TableCell className="font-mono text-xs font-bold text-primary"><Link href={`/bids/${bid.id}`} className="flex flex-col gap-1"><span>{bid.id}</span>{bid.aiAnalysis && <Sparkles className="h-3 w-3 text-accent fill-accent" />}</Link></TableCell>
                    <TableCell>
                      <Link href={`/bids/${bid.id}`} className="space-y-1 block">
                        <p className="font-bold text-sm line-clamp-1 group-hover:text-accent uppercase italic text-primary">{bid.title}</p>
                        <p className={cn("text-[10px] flex items-center gap-1 uppercase font-medium", isMissingData ? "text-amber-600 italic" : "text-muted-foreground")}>
                          <Building2 className="h-3 w-3" /> {isMissingData ? "En la nube (Pendiente completar...)" : bid.entity}
                          {!isMissingData && <Badge variant="ghost" className="text-[8px] h-4 bg-emerald-50 text-emerald-600 font-black">LOCAL</Badge>}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{renderDaysLeftBadge(bid.deadlineDate)}</TableCell>
                    <TableCell className={cn("text-right font-black", isMissingData ? "text-amber-600 italic" : "text-primary")}>{formatCurrency(bid.amount, bid.currency)}</TableCell>
                    <TableCell><Link href={`/bids/${bid.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" /></Link></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="bg-primary/5 border-dashed border-2 border-primary/20 py-24 text-center space-y-4">
          <History className="h-12 w-12 text-primary/20 mx-auto" /><h3 className="text-xl font-bold text-primary italic uppercase">Sin resultados locales</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">Selecciona una fecha e "Importar IDs" para poblar tu base de datos.</p>
        </Card>
      )}
    </div>
  )
}
