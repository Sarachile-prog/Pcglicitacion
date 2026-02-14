
"use client"

import { useState, useEffect } from "react"
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Building2, 
  RefreshCw, 
  AlertCircle, 
  Info,
  Calendar as CalendarIcon,
  ChevronRight,
  Database,
  Zap,
  Settings as SettingsIcon,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function BidsListPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [ticketError, setTicketError] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    // Evitar fines de semana por defecto ya que no hay licitaciones nuevas
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
      limit(50)
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
        description: `Conectando con ChileCompra para el ${format(selectedDate, "dd/MM")}...`,
      })
      
      const result = await getBidsByDate(formattedDate)
      
      toast({
        title: "Sincronización Exitosa",
        description: `${result.count} licitaciones procesadas correctamente.`,
      })
    } catch (error: any) {
      // Detectar error de ticket (401 o mensaje específico)
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

  const filteredBids = (bids || []).filter(bid => {
    const matchesSearch = 
      bid.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      bid.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.id?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" />
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">Base de Datos</h2>
          </div>
          <p className="text-muted-foreground">Explora licitaciones sincronizadas. Elige una fecha hábil para importar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal w-[240px] border-primary/20", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
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
            className="bg-accent hover:bg-accent/90 gap-2 font-bold shadow-lg"
            onClick={handleSync} 
            disabled={isSyncing}
          >
            <RefreshCw className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {ticketError && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-red-800 text-lg">Ticket de API No Válido o Expirado</h4>
              <p className="text-sm text-red-700 leading-relaxed">
                Mercado Público ha rechazado la solicitud. Debes obtener un ticket nuevo desde el portal de desarrolladores de ChileCompra e ingresarlo en la configuración.
              </p>
            </div>
            <Link href="/settings">
              <Button className="bg-red-600 hover:bg-red-700 gap-2">
                <SettingsIcon className="h-4 w-4" /> Ir a Configuración
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
        <Zap className="h-5 w-5 text-primary" />
        <p className="text-sm text-primary font-medium">
          <span className="font-bold">Tip:</span> Las licitaciones se publican de Lunes a Viernes. Prueba con fechas pasadas para ver resultados.
        </p>
      </div>

      <Card className="bg-muted/30 border-none">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar por nombre, institución o ID..." 
              className="pl-10 bg-card border-none shadow-sm h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isDbLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <RefreshCw className="h-12 w-12 text-primary animate-spin opacity-20" />
          <p className="text-muted-foreground font-medium">Consultando base de datos local...</p>
        </div>
      ) : filteredBids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBids.map((bid) => (
            <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
              <Card className="h-full hover:border-accent hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-[10px] uppercase border-primary/20 text-primary font-bold">ID: {bid.id}</Badge>
                    <Badge className={cn(
                      "text-[10px] uppercase font-bold text-white",
                      bid.status === 'Publicada' ? 'bg-emerald-500' : 
                      bid.status === 'Adjudicada' ? 'bg-blue-600' :
                      bid.status === 'Cerrada' ? 'bg-gray-500' : 'bg-orange-500'
                    )}>
                      {bid.status}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-accent transition-colors min-h-[3.5rem]">{bid.title}</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                      <span className="line-clamp-2 font-medium leading-tight">{bid.entity}</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Estimado</span>
                      <span className="text-lg font-black text-primary">
                        {bid.amount > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount) : 'Por Definir'}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-accent group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="bg-primary/5 border-dashed border-2 border-primary/20">
          <CardContent className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Info className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-primary">No hay licitaciones sincronizadas</h3>
            <p className="text-muted-foreground max-w-sm">
              Selecciona una fecha (ej. el miércoles pasado) y pulsa "Sincronizar" para importar datos desde Mercado Público.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
