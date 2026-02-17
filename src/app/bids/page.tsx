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
      
      const result = await getBidsByDate(formattedDate)
      
      toast({
        title: "Importación Exitosa",
        description: `Se han añadido ${result.count} IDs. Usa el botón "Completar Datos" para obtener montos e instituciones.`,
      })
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('ticket') || error.message?.toLowerCase().includes('inválido')) {
        setTicketError(true)
      }

      toast({
        variant: "destructive",
        title: "Error de API",
        description: error.message || "Mercado Público está saturado.",
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
      toast({ 
        title: "Enriqueciendo Vista Actual", 
        description: "Obteniendo instituciones y montos desde el API de detalle..." 
      });
      
      const toEnrich = pagedBids.filter(b => b.entity === "Institución no especificada" || !b.amount);
      
      if (toEnrich.length === 0) {
        toast({ title: "Datos Completos", description: "Todos los procesos visibles ya tienen su información completa." });
        return;
      }

      for (const bid of toEnrich) {
        await getBidDetail(bid.id);
        count++;
        if (count % 3 === 0) await new Promise(r => setTimeout(r, 800));
      }
      
      toast({ title: "Proceso Finalizado", description: `Se actualizaron ${count} licitaciones con éxito.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Límite de API", description: "La API oficial está saturada. Prueba enriquecer más tarde." });
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
        matchesRubro = 
          bid.title?.toLowerCase().includes(rubroLower) || 
          bid.entity?.toLowerCase().includes(rubroLower) ||
          (bid.items && bid.items.some((item: any) => item.Categoria?.toLowerCase().includes(rubroLower)))
      }

      let matchesTime = true
      const scrapedAtDate = bid.scrapedAt?.toDate ? bid.scrapedAt.toDate() : new Date(bid.scrapedAt);
      
      if (timeRange === "today") {
        matchesTime = isAfter(scrapedAtDate, startOfDay(now));
      } else if (timeRange === "7days") {
        matchesTime = isAfter(scrapedAtDate, subDays(now, 7));
      } else if (timeRange === "month") {
        matchesTime = isAfter(scrapedAtDate, subDays(now, 30));
      } else if (timeRange === "3months") {
        matchesTime = isAfter(scrapedAtDate, subDays(now, 90));
      }

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
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: currency || 'CLP', 
      maximumFractionDigits: 0 
    }).format(amount);
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '---';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '---';
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return '---';
    }
  }

  const getDaysLeft = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    try {
      const deadline = new Date(deadlineStr);
      if (isNaN(deadline.getTime())) return null;
      const today = startOfDay(new Date());
      const deadlineDate = startOfDay(deadline);
      const diff = differenceInDays(deadlineDate, today);
      return diff;
    } catch (e) {
      return null;
    }
  }

  const renderDaysLeftBadge = (days: number | null) => {
    if (days === null) return null;
    if (days < 0) return <Badge variant="outline" className="text-[9px] border-gray-300 text-gray-400 font-bold uppercase">Cerrada</Badge>;
    if (days === 0) return <Badge className="text-[9px] bg-red-600 text-white font-bold animate-pulse uppercase">Cierra Hoy</Badge>;
    if (days === 1) return <Badge className="text-[9px] bg-orange-600 text-white font-bold uppercase">Queda 1 día</Badge>;
    return <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent font-bold uppercase">Quedan {days} días</Badge>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-fit text-muted-foreground hover:text-primary -ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
          </Button>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-accent" />
              <h2 className="text-3xl font-extrabold tracking-tight text-primary italic uppercase">Historial Global de Mercado</h2>
            </div>
            <p className="text-muted-foreground">Explora el consolidado de todas tus sincronizaciones. Datos acumulativos.</p>
          </div>
          
          <Card className="bg-primary/5 border-primary/10 p-2 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal w-[160px] h-10 border-primary/20 bg-white", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3 text-primary" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span className="animate-pulse">Cargando...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <Button 
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-2 font-black h-10 uppercase italic text-[10px]"
                onClick={handleSync} 
                disabled={isSyncing || !selectedDate}
              >
                <RefreshCw className={isSyncing ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                {isSyncing ? "Sincronizando..." : "Importar IDs"}
              </Button>
              <Button 
                size="sm"
                className="bg-accent hover:bg-accent/90 gap-2 font-black h-10 uppercase italic text-[10px] shadow-lg"
                onClick={handleEnrich} 
                disabled={isEnriching || isSyncing || !pagedBids.length}
              >
                {isEnriching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                Completar Datos
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-bold uppercase italic text-xs">Nota sobre la Sincronización</AlertTitle>
        <AlertDescription className="text-blue-700 text-[10px] font-medium leading-relaxed">
          La API masiva de Mercado Público solo entrega IDs y títulos. Usa el botón <b>"Completar Datos"</b> para que el sistema consulte la Institución y el Monto Estimado de las licitaciones que estás viendo actualmente.
        </AlertDescription>
      </Alert>

      {ticketError && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-red-800 text-lg">Error de Acceso a API</h4>
              <p className="text-sm text-red-700 leading-relaxed">
                No pudimos conectar con Mercado Público. Verifica tu ticket de desarrollador en configuración.
              </p>
            </div>
            <Link href="/settings">
              <Button className="bg-red-600 hover:bg-red-700 gap-2">
                <SettingsIcon className="h-4 w-4" /> Configuración
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-primary/5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-2 w-full">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Buscador</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Título, institución o ID..." 
                className="pl-10 h-12 bg-muted/20 border-none shadow-inner"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); 
                }}
              />
            </div>
          </div>
          
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Rubro</label>
            <Select value={selectedRubro} onValueChange={(val) => {
              setSelectedRubro(val);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="h-12 bg-muted/20 border-none shadow-inner font-bold">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Rubros</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Antigüedad (Sincro)</label>
            <Select value={timeRange} onValueChange={(val) => {
              setTimeRange(val);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="h-12 bg-muted/20 border-none shadow-inner font-bold">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  <SelectValue placeholder="Cualquier fecha" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier fecha</SelectItem>
                <SelectItem value="today">Sincronizadas Hoy</SelectItem>
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1 flex bg-muted rounded-xl p-1.5 h-12 items-center justify-center">
            <Button 
              variant={viewMode === 'grid' ? "secondary" : "ghost"} 
              size="icon" 
              className="h-full w-full rounded-lg"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? "secondary" : "ghost"} 
              size="icon" 
              className="h-full w-full rounded-lg"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary text-white font-black px-3 py-1">
              {filteredBids.length} Resultados
            </Badge>
          </div>
          <div className="flex items-center gap-4">
             {totalPages > 1 && (
               <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronFirst className="h-4 w-4" /></Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                 <span className="text-xs font-bold px-2">Página {currentPage}</span>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronLast className="h-4 w-4" /></Button>
               </div>
             )}
          </div>
        </div>
      </div>

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <RefreshCw className="h-12 w-12 text-primary animate-spin opacity-20" />
          <p className="text-muted-foreground font-medium">Consultando base de datos histórica...</p>
        </div>
      ) : pagedBids.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pagedBids.map((bid) => {
              const daysLeft = getDaysLeft(bid.deadlineDate);
              const isMissingData = bid.entity === "Institución no especificada" || !bid.amount;
              return (
                <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
                  <Card className={cn(
                    "h-full hover:border-accent hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 relative",
                    isMissingData ? "border-amber-100 bg-amber-50/10" : "border-transparent"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-[10px] uppercase border-primary/20 text-primary font-bold w-fit">ID: {bid.id}</Badge>
                          {bid.aiAnalysis && (
                            <Badge className="bg-accent text-white border-none gap-1 px-2 py-0.5 text-[8px] font-black italic shadow-md w-fit">
                              <Sparkles className="h-2 w-2 fill-white" /> IA ACTIVA
                            </Badge>
                          )}
                        </div>
                        {renderDaysLeftBadge(daysLeft)}
                      </div>
                      <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-accent transition-colors min-h-[3.5rem] uppercase italic tracking-tighter text-primary">
                        {bid.title}
                      </h3>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Building2 className={cn("h-4 w-4 shrink-0 mt-0.5", isMissingData ? "text-amber-400" : "text-accent")} />
                          <span className={cn(
                            "line-clamp-2 font-medium leading-tight uppercase text-xs",
                            isMissingData && "italic opacity-60"
                          )}>
                            {isMissingData ? "Pendiente de Completar..." : bid.entity}
                          </span>
                        </div>
                        <div className="pt-2">
                          <div className="flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-100">
                            <Clock className="h-3.5 w-3.5 text-red-500" />
                            <div className="flex flex-col">
                              <span className="text-[8px] uppercase font-black text-red-400">Cierre Oficial</span>
                              <span className="text-[10px] font-bold text-red-700">{formatDate(bid.deadlineDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Estimado</span>
                          <span className={cn(
                            "text-lg font-black",
                            isMissingData ? "text-amber-600 italic" : "text-primary"
                          )}>
                            {formatCurrency(bid.amount, bid.currency)}
                          </span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-accent/5 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card className="overflow-hidden border-none shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold">ID</TableHead>
                    <TableHead className="min-w-[250px] font-bold">Título / Institución</TableHead>
                    <TableHead className="font-bold text-center">Días Restantes</TableHead>
                    <TableHead className="font-bold text-red-600 text-center">Cierre Oficial</TableHead>
                    <TableHead className="text-right font-bold">Monto Estimado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedBids.map((bid) => {
                    const daysLeft = getDaysLeft(bid.deadlineDate);
                    const isMissingData = bid.entity === "Institución no especificada" || !bid.amount;
                    return (
                      <TableRow key={bid.id} className="group hover:bg-accent/5 cursor-pointer">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          <Link href={`/bids/${bid.id}`} className="flex flex-col gap-1">
                            <span>{bid.id}</span>
                            {bid.aiAnalysis && <Sparkles className="h-3 w-3 text-accent fill-accent" />}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/bids/${bid.id}`} className="space-y-1 block">
                            <p className="font-bold text-sm line-clamp-1 group-hover:text-accent transition-colors uppercase italic text-primary">{bid.title}</p>
                            <p className={cn(
                              "text-[10px] flex items-center gap-1 uppercase font-medium",
                              isMissingData ? "text-amber-600 italic" : "text-muted-foreground"
                            )}>
                              <Building2 className="h-3 w-3" /> {isMissingData ? "Sincronización Pendiente" : bid.entity}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          {renderDaysLeftBadge(daysLeft)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-red-600 text-center">
                          {formatDate(bid.deadlineDate)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-black",
                          isMissingData ? "text-amber-600 italic" : "text-primary"
                        )}>
                          {formatCurrency(bid.amount, bid.currency)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/bids/${bid.id}`}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : (
        <Card className="bg-primary/5 border-dashed border-2 border-primary/20">
          <CardContent className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm">
              <History className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-primary italic uppercase">No se encontraron resultados</h3>
            <p className="text-muted-foreground max-w-sm">
              Ajusta tus filtros o importa datos de otra fecha para expandir tu base de datos local.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
