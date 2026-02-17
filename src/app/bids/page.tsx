
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
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  History,
  Database,
  CheckCircle2,
  Sparkles,
  Loader2,
  Globe,
  Zap
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, getBidDetail } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, isAfter, startOfDay, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"

const ITEMS_PER_PAGE = 50;

export default function BidsListPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
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
      limit(500) 
    )
  }, [db])

  const { data: bids, isLoading: isDbLoading } = useCollection(bidsQuery)

  const handleSync = async () => {
    if (!selectedDate) return;
    setIsSyncing(true)
    const formattedDate = format(selectedDate, "ddMMyyyy")
    
    try {
      toast({
        title: "Sincronizando IDs",
        description: `Consultando portal para el ${format(selectedDate, "dd/MM")}...`,
      })
      await getBidsByDate(formattedDate)
      toast({
        title: "Importación Exitosa",
        description: `Se han añadido los nuevos IDs a la base de datos global.`,
      })
    } catch (error: any) {
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
        toast({ title: "Datos Completos", description: "Todos los procesos visibles ya están en la base de datos local." });
        return;
      }
      
      toast({ title: "Enriqueciendo Base Global", description: `Obteniendo montos e instituciones para ${toEnrich.length} procesos.` });
      
      for (const bid of toEnrich) {
        await getBidDetail(bid.id);
        count++;
        if (count % 3 === 0) await new Promise(r => setTimeout(r, 800));
      }
      toast({ title: "Actualización Finalizada", description: `Se han guardado ${count} licitaciones en el repositorio compartido.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Límite API", description: "El portal oficial está saturada. Intenta de nuevo en unos minutos." });
    } finally {
      setIsEnriching(false);
    }
  }

  const filteredBids = useMemo(() => {
    const allBids = bids || [];
    return allBids.filter(bid => {
      const searchString = searchTerm.toLowerCase()
      return (
        bid.title?.toLowerCase().includes(searchString) || 
        bid.entity?.toLowerCase().includes(searchString) ||
        bid.id?.toLowerCase().includes(searchString)
      )
    })
  }, [bids, searchTerm])

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
            <h2 className="text-3xl font-extrabold text-primary italic uppercase flex items-center gap-2"><History className="h-6 w-6 text-accent" /> Explorador de Mercado</h2>
            <p className="text-muted-foreground">Repositorio Global PCG: Los datos enriquecidos son visibles para todo tu equipo.</p>
          </div>
          <Card className="bg-primary/5 border-primary/10 p-2 shadow-sm flex flex-wrap items-center gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild><Button variant="outline" className="w-[160px] h-10 border-primary/20 bg-white font-bold">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Cargando..."}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate || undefined} onSelect={(d) => { if(d){ setSelectedDate(d); setIsCalendarOpen(false); } }} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
            </Popover>
            <Button size="sm" className="bg-primary font-black h-10 uppercase italic text-[10px]" onClick={handleSync} disabled={isSyncing}><RefreshCw className={cn("h-3 w-3 mr-2", isSyncing && "animate-spin")} /> Ingesta por Fecha</Button>
            <Button size="sm" className="bg-accent font-black h-10 uppercase italic text-[10px] shadow-lg" onClick={handleEnrich} disabled={isEnriching || isSyncing || !pagedBids.length}>
              {isEnriching ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Database className="h-3 w-3 mr-2" />} 
              Completar Datos
            </Button>
          </Card>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-primary/5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-8 space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Filtro de Inteligencia Colectiva</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por Título, Institución o ID..." className="pl-10 h-12 bg-muted/20 border-none shadow-inner" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
          </div>
        </div>
        <div className="md:col-span-4 space-y-2">
          <div className="h-12 bg-emerald-50 rounded-xl flex items-center px-4 gap-3 text-[10px] font-black text-emerald-700 uppercase italic border border-emerald-100">
            <Zap className="h-4 w-4 fill-emerald-500" />
            Los datos enriquecidos ahorran cuota para toda la organización.
          </div>
        </div>
      </div>

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="h-12 w-12 text-primary animate-spin opacity-20" /><p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest font-black">Consultando Repositorio Global...</p></div>
      ) : pagedBids.length > 0 ? (
        <div className="space-y-4">
          <Card className="overflow-hidden border-none shadow-sm rounded-2xl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px] font-black uppercase text-[10px]">Identificador</TableHead>
                  <TableHead className="min-w-[250px] font-black uppercase text-[10px]">Detalle de Licitación</TableHead>
                  <TableHead className="font-black uppercase text-center text-[10px]">Cierre</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px]">Monto Est.</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBids.map((bid) => {
                  const isEnriched = bid.entity && bid.entity !== "Institución no especificada";
                  return (
                    <TableRow key={bid.id} className="group hover:bg-accent/5 cursor-pointer">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        <Link href={`/bids/${bid.id}`} className="flex flex-col gap-1">
                          <span>{bid.id}</span>
                          {bid.aiAnalysis && <Badge className="bg-accent/10 text-accent border-none h-4 px-1.5 text-[8px] font-black"><Sparkles className="h-2 w-2 mr-1 fill-accent" /> IA</Badge>}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/bids/${bid.id}`} className="space-y-1 block">
                          <p className="font-black text-sm line-clamp-1 group-hover:text-accent uppercase italic text-primary leading-tight">{bid.title}</p>
                          <div className="flex items-center gap-2">
                            <p className={cn("text-[9px] flex items-center gap-1 uppercase font-bold", !isEnriched ? "text-amber-600 italic" : "text-muted-foreground")}>
                              <Building2 className="h-3 w-3" /> {!isEnriched ? "Pendiente Completar..." : bid.entity}
                            </p>
                            {isEnriched && <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-emerald-200 text-emerald-600 font-black bg-emerald-50">PCG LOCAL</Badge>}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">{renderDaysLeftBadge(bid.deadlineDate)}</TableCell>
                      <TableCell className={cn("text-right font-black italic", !isEnriched ? "text-amber-600/50" : "text-primary")}>
                        {formatCurrency(bid.amount, bid.currency)}
                      </TableCell>
                      <TableCell><Link href={`/bids/${bid.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" /></Link></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
          
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase italic">Mostrando {pagedBids.length} de {filteredBids.length} registros en repositorio</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-primary/5 border-dashed border-2 border-primary/20 py-24 text-center space-y-4 rounded-[3rem]">
          <Globe className="h-12 w-12 text-primary/20 mx-auto" />
          <h3 className="text-xl font-black text-primary italic uppercase">Sin datos locales para esta búsqueda</h3>
          <p className="text-muted-foreground max-w-sm mx-auto font-medium italic">Selecciona una fecha en el calendario superior e inicia una "Ingesta por Fecha" para poblar el repositorio global.</p>
        </Card>
      )}
    </div>
  )
}
