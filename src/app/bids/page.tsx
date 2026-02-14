"use client"

import { useState, useEffect, useCallback } from "react"
import { CATEGORIES, Bid } from "@/app/lib/mock-data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, MapPin, Building2, Clock, DollarSign, LayoutGrid, List, Loader2, RefreshCw, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import { getBidsByDate, MercadoPublicoBid } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"

export default function BidsListPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [bids, setBids] = useState<Bid[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRealData, setIsRealData] = useState(false)
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
      deadline: new Date(b.FechaCierre).toLocaleDateString(),
      status: (b.Estado as any) || 'Abierta',
      description: b.Nombre,
      fullText: b.Nombre,
      location: 'Chile'
    }))
  }

  const fetchLiveBids = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    setIsRealData(false)
    
    try {
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
      
      // Intentar hoy
      const liveBidsData = await getBidsByDate(formattedDate)
      
      if (liveBidsData && liveBidsData.length > 0) {
        setBids(mapBids(liveBidsData))
        setIsRealData(true)
      } else {
        // Si hoy es fin de semana, intentar ayer (Viernes)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const formattedYesterday = `${String(yesterday.getDate()).padStart(2, '0')}${String(yesterday.getMonth() + 1).padStart(2, '0')}${yesterday.getFullYear()}`
        
        const yesterdayBids = await getBidsByDate(formattedYesterday)
        
        if (yesterdayBids && yesterdayBids.length > 0) {
          setBids(mapBids(yesterdayBids))
          setIsRealData(true)
        } else {
          setBids([])
          setIsRealData(true) 
        }
      }
    } catch (error: any) {
      console.error("[UI] Error:", error)
      setErrorMessage(error.message || "Error desconocido de conexión")
      setBids([])
      setIsRealData(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveBids()
  }, [fetchLiveBids])

  const filteredBids = bids.filter(bid => {
    const matchesSearch = bid.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          bid.entity.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory ? bid.category === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">Explorador Real</h2>
            <Badge variant={isRealData ? "default" : "secondary"} className={isRealData ? "bg-green-500 text-white" : ""}>
              {isRealData ? (bids.length > 0 ? "LIVE DATA" : "SINCRO OK") : "SIN DATOS"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Datos vivos obtenidos directamente de la API de Mercado Público.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLiveBids} 
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Sincronizar
          </Button>
          <div className="h-8 w-px bg-border mx-2" />
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="icon" 
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800">Error de Conexión</h4>
              <p className="text-sm text-red-700 leading-relaxed">
                {errorMessage}. Esto suele ocurrir por saturación en la API oficial de Mercado Público. Por favor, reintenta sincronizar en unos segundos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isRealData && bids.length === 0 && !isLoading && !errorMessage && (
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6 flex items-center gap-4">
            <Info className="h-10 w-10 text-primary shrink-0" />
            <div>
              <h4 className="font-bold text-primary">Sin licitaciones hoy ni ayer</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La API respondió exitosamente pero no hay registros. Esto es normal en fines de semana o feriados en Chile.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar por título o institución..." 
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium text-center">
            Conectando con la API oficial...<br/>
            <span className="text-xs">(Esto puede tardar hasta 30 segundos si hay saturación)</span>
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {bids.map((bid) => (
            <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
              <Card className="h-full hover:border-accent hover:shadow-xl transition-all duration-300 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-[10px] uppercase border-accent/20 text-accent">ID: {bid.id}</Badge>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{bid.status}</Badge>
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
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount)}
                    </span>
                    <Button size="sm" variant="ghost" className="text-accent">Detalles →</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}