
"use client"

import { useState, useMemo } from "react"
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
  CircleHelp as TooltipIcon,
  History,
  Settings as SettingsIcon,
  AlertTriangle,
  ChevronLast,
  ChevronFirst,
  Info,
  Database,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CATEGORIES } from "@/app/lib/mock-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const ITEMS_PER_PAGE = 50;

export default function BidsListPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRubro, setSelectedRubro] = useState("all")
  const [isSyncing, setIsSyncing] = useState(false)
  const [ticketError, setTicketError] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    if (day === 0) return subDays(today, 2); 
    if (day === 6) return subDays(today, 1);
    return today;
  })
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
    setIsSyncing(true)
    setTicketError(false)
    const formattedDate = format(selectedDate, "ddMMyyyy")
    
    try {
      toast({
        title: "Iniciando Sincronización",
        description: `Importando licitaciones oficiales del ${format(selectedDate, "dd/MM")}...`,
      })
      
      const result = await getBidsByDate(formattedDate)
      
      toast({
        title: "Importación Exitosa",
        description: `Se han añadido ${result.count} nuevas oportunidades a la base de datos global.`,
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

  const filteredBids = useMemo(() => {
    const allBids = bids || [];
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

      return matchesSearch && matchesRubro
    })
  }, [bids, searchTerm, selectedRubro])

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
            <div className="flex items-center gap-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal w-[180px] h-9 border-primary/20 bg-white", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3 text-primary" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
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
                className="bg-accent hover:bg-accent/90 gap-2 font-bold h-9"
                onClick={handleSync} 
                disabled={isSyncing}
              >
                <RefreshCw className={isSyncing ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                {isSyncing ? "Importando..." : "Importar Datos"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-bold">Nota sobre la Cobertura de Datos</AlertTitle>
        <AlertDescription className="text-blue-700 text-xs">
          La búsqueda y filtros se aplican sobre las licitaciones <strong>ya sincronizadas</strong> en tu base de datos local. 
          Si una fecha no tiene datos, utiliza el importador superior. Las fechas de publicación se completan automáticamente al abrir cada licitación.
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
                No pudimos conectar con Mercado Público. Verifica tu ticket de desarrollador.
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

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-primary/5 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Buscador Estratégico</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar en toda la base de datos por título, institución o ID..." 
                className="pl-10 h-12 bg-muted/20 border-none shadow-inner"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); 
                }}
              />
            </div>
          </div>
          
          <div className="w-full lg:w-64 space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Rubro / Sector</label>
            <Select value={selectedRubro} onValueChange={(val) => {
              setSelectedRubro(val);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="h-12 bg-muted/20 border-none shadow-inner font-bold">
                <SelectValue placeholder="Todos los Rubros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Rubros</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex bg-muted rounded-xl p-1.5 h-12 items-center">
            <Button 
              variant={viewMode === 'grid' ? "secondary" : "ghost"} 
              size="sm" 
              className="h-full px-4 rounded-lg"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? "secondary" : "ghost"} 
              size="sm" 
              className="h-full px-4 rounded-lg"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary text-white font-black px-3 py-1">
              {filteredBids.length} Licitaciones Filtradas
            </Badge>
            {bids && (
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Database className="h-3 w-3" /> Registros en Caché: {bids.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
             {totalPages > 1 && (
               <div className="flex items-center gap-1">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8" 
                   onClick={() => setCurrentPage(1)} 
                   disabled={currentPage === 1}
                 >
                   <ChevronFirst className="h-4 w-4" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8" 
                   onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                   disabled={currentPage === 1}
                 >
                   <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <span className="text-xs font-bold px-2">Página {currentPage} de {totalPages}</span>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8" 
                   onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                   disabled={currentPage === totalPages}
                 >
                   <ChevronRight className="h-4 w-4" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8" 
                   onClick={() => setCurrentPage(totalPages)} 
                   disabled={currentPage === totalPages}
                 >
                   <ChevronLast className="h-4 w-4" />
                 </Button>
               </div>
             )}
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-muted-foreground cursor-help">
                    <TooltipIcon className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase">Info de Datos</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4">
                  <p className="text-xs leading-relaxed font-medium">
                    Mostramos hasta las últimas 1,000 licitaciones sincronizadas. Para obtener fechas de publicación de registros antiguos, abre el detalle de la licitación.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            {pagedBids.map((bid) => (
              <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
                <Card className="h-full hover:border-accent hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-[10px] uppercase border-primary/20 text-primary font-bold">ID: {bid.id}</Badge>
                      <Badge className={cn(
                        "text-[10px] uppercase font-bold text-white",
                        bid.status?.includes('Publicada') || bid.status?.includes('Abierta') ? 'bg-emerald-500' : 
                        bid.status?.includes('Adjudicada') ? 'bg-blue-600' :
                        bid.status?.includes('Cerrada') ? 'bg-gray-500' : 'bg-orange-500'
                      )}>
                        {bid.status || 'No definido'}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-accent transition-colors min-h-[3.5rem] uppercase italic tracking-tighter">
                      {bid.title}
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                        <span className="line-clamp-2 font-medium leading-tight uppercase text-xs">{bid.entity || "Cargando Institución..."}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3 text-primary/40" />
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-black opacity-50">Publicación</span>
                            <span className="text-[10px] font-bold text-primary">{formatDate(bid.publishedDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-red-400/60" />
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-black opacity-50 text-red-400">Cierre</span>
                            <span className="text-[10px] font-bold text-primary">{formatDate(bid.deadlineDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Estimado</span>
                        <span className="text-lg font-black text-primary">
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
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-none shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold">ID</TableHead>
                    <TableHead className="min-w-[250px] font-bold">Título / Institución</TableHead>
                    <TableHead className="font-bold text-center">Publicación</TableHead>
                    <TableHead className="font-bold text-red-600 text-center">Cierre</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="text-right font-bold">Monto Estimado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedBids.map((bid) => (
                    <TableRow key={bid.id} className="group hover:bg-accent/5 cursor-pointer">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        <Link href={`/bids/${bid.id}`}>{bid.id}</Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/bids/${bid.id}`} className="space-y-1 block">
                          <p className="font-bold text-sm line-clamp-1 group-hover:text-accent transition-colors uppercase italic">{bid.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-medium">
                            <Building2 className="h-3 w-3" /> {bid.entity || "Cargando..."}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground text-center">
                        {formatDate(bid.publishedDate)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-primary text-center">
                        {formatDate(bid.deadlineDate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px] uppercase font-bold text-white whitespace-nowrap",
                          bid.status?.includes('Publicada') || bid.status?.includes('Abierta') ? 'bg-emerald-500' : 
                          bid.status?.includes('Adjudicada') ? 'bg-blue-600' :
                          bid.status?.includes('Cerrada') ? 'bg-gray-500' : 'bg-orange-500'
                        )}>
                          {bid.status || 'No definido'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-primary">
                        {formatCurrency(bid.amount, bid.currency)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/bids/${bid.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
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
              Ajusta tus filtros o importa datos de una fecha específica para expandir tu base de datos.
            </p>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
            disabled={currentPage === 1}
            className="font-bold uppercase text-[10px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage;
              if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              
              if (pageNum <= 0 || pageNum > totalPages) return null;

              return (
                <Button 
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"} 
                  size="sm"
                  className="w-9 h-9 font-bold text-xs"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
            disabled={currentPage === totalPages}
            className="font-bold uppercase text-[10px]"
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
