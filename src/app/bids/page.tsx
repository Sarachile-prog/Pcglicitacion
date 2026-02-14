"use client"

import { useState, useEffect, useCallback } from "react"
import { Bid } from "@/app/lib/mock-data"
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
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, MercadoPublicoBid } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function BidsListPage() {
  const [searchTerm, setSearchTerm] = useState("")
  // Iniciamos con el último día hábil (viernes) si hoy es fin de semana
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    if (day === 0) return subDays(today, 2); // Domingo -> Viernes
    if (day === 6) return subDays(today, 1); // Sábado -> Viernes
    return today;
  })
  const [bids, setBids] = useState<Bid[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { toast } = useToast()

  const mapBids = (liveBidsData: MercadoPublicoBid[]): Bid[] => {
    return liveBidsData.map((b: MercadoPublicoBid) => ({
      id: b.CodigoExterno,
      title: b.Nombre,
      entity: b.Organismo.NombreOrganismo,
      category: 'General', 
      amount: b.MontoEstimado || 0,
      currency: b.Moneda || 'CLP',
      deadline: b.FechaCierre ? new Date(b.FechaCierre).toLocaleDateString() : 'N/A',
      status: (b.Estado as any) || 'Desconocido',
      description: b.Nombre,
      fullText: b.Nombre,
      location: 'Chile'
    }))
  }

  const fetchLiveBids = useCallback(async (dateToFetch: Date) => {
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      const formattedDate = format(dateToFetch, "ddMMyyyy")
      const liveBidsData = await getBidsByDate(formattedDate)
      
      setBids(mapBids(liveBidsData))
      
      if (liveBidsData.length === 0) {
        toast({
          title: "Sin resultados",
          description: `No hay registros oficiales para el ${format(dateToFetch, "PPP", { locale: es })}.`,
        })
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Error de conexión con la API")
      setBids([])
      toast({
        variant: "destructive",
        title: "Error de Servidor",
        description: "La API oficial está saturada. Reintenta en unos segundos.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchLiveBids(selectedDate)
  }, [selectedDate, fetchLiveBids])

  const filteredBids = bids.filter(bid => {
    const matchesSearch = bid.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          bid.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bid.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Explorador Histórico</h2>
          <p className="text-muted-foreground">Consulta cualquier fecha para ver aperturas, cierres y adjudicaciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
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
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
          <Button 
            variant="outline" 
            size="icon" 
            className="border-primary/20"
            onClick={() => fetchLiveBids(selectedDate)} 
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin text-primary" : "h-4 w-4 text-primary"} />
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800 uppercase text-xs tracking-widest mb-1">API Mercado Público Saturada</h4>
              <p className="text-sm text-red-700 leading-relaxed">
                El servidor oficial (10500) ha rechazado la conexión por exceso de tráfico. 
                Espera 5 segundos y pulsa el botón de refrescar.
              </p>
              <Button size="sm" variant="outline" className="mt-3 border-red-200 text-red-700 hover:bg-red-100" onClick={() => fetchLiveBids(selectedDate)}>
                Reintentar Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-none">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar resultados por nombre, institución o ID..." 
              className="pl-10 bg-card border-none shadow-sm h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-primary animate-spin opacity-20" />
            <RefreshCw className="h-8 w-8 text-accent animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <p className="text-primary font-bold text-lg">Conectando con ChileCompra...</p>
            <p className="text-muted-foreground text-sm">Esto puede tardar unos segundos si la API está lenta.</p>
          </div>
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
                      "text-[10px] uppercase font-bold",
                      bid.status === 'Publicada' ? 'bg-emerald-500 text-white' : 
                      bid.status === 'Adjudicada' ? 'bg-blue-600 text-white' :
                      bid.status === 'Cerrada' ? 'bg-gray-500 text-white' : 'bg-orange-500 text-white'
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
      ) : !isLoading && (
        <Card className="bg-primary/5 border-dashed border-2 border-primary/20">
          <CardContent className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Info className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-primary">No se encontraron registros</h3>
            <p className="text-muted-foreground max-w-sm">
              Para ver licitaciones activas, prueba seleccionando un día hábil reciente (ej. el miércoles pasado).
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setSelectedDate(subDays(new Date(), 2))}>
              Ver Miércoles Pasado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
