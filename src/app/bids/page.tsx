"use client"

import { useState, useEffect, useCallback } from "react"
import { Bid } from "@/app/lib/mock-data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  MapPin, 
  Building2, 
  Clock, 
  LayoutGrid, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Info,
  Calendar as CalendarIcon,
  Filter
} from "lucide-react"
import Link from "next/link"
import { getBidsByDate, MercadoPublicoBid } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function BidsListPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
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
              <Button variant="outline" className={cn("justify-start text-left font-normal w-[240px]", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
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
            onClick={() => fetchLiveBids(selectedDate)} 
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800">API Mercado Público Saturada</h4>
              <p className="text-sm text-red-700">La API oficial está recibiendo demasiadas peticiones. Por favor, espera 5 segundos y vuelve a intentar.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-none">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por ID, nombre o institución..." 
              className="pl-10 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Consultando registros oficiales...</p>
        </div>
      ) : filteredBids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBids.map((bid) => (
            <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
              <Card className="h-full hover:border-accent hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-[10px] uppercase border-accent/20 text-accent">ID: {bid.id}</Badge>
                    <Badge className={cn(
                      "text-[10px] uppercase",
                      bid.status === 'Publicada' ? 'bg-green-500' : 
                      bid.status === 'Adjudicada' ? 'bg-blue-500' :
                      bid.status === 'Cerrada' ? 'bg-gray-500' : 'bg-orange-500'
                    )}>
                      {bid.status}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-primary transition-colors">{bid.title}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate font-medium">{bid.entity}</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                    <span className="text-lg font-black text-primary">
                      {bid.amount > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount) : 'Monto a convenir'}
                    </span>
                    <Button size="sm" variant="ghost" className="text-accent group-hover:translate-x-1 transition-transform">Ver →</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : !isLoading && (
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <Info className="h-12 w-12 text-primary/40" />
            <h3 className="text-xl font-bold text-primary">No hay registros para esta fecha</h3>
            <p className="text-muted-foreground max-w-md">Prueba seleccionando un día hábil (Lunes a Viernes) para ver la actividad del mercado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
