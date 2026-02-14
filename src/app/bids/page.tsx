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
  const [apiError, setApiError] = useState(false)
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
    setApiError(false)
    try {
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
      
      console.log(`[UI] Solicitando licitaciones para hoy: ${formattedDate}`)
      const liveBidsData = await getBidsByDate(formattedDate)
      
      if (liveBidsData && liveBidsData.length > 0) {
        setBids(mapBids(liveBidsData))
        setIsRealData(true)
      } else {
        // Si hoy está vacío (común en fines de semana), intentamos ayer
        console.log(`[UI] Hoy no hay licitaciones. Intentando ayer...`)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const formattedYesterday = `${String(yesterday.getDate()).padStart(2, '0')}${String(yesterday.getMonth() + 1).padStart(2, '0')}${yesterday.getFullYear()}`
        
        // Pequeña pausa para evitar 10500 por simultaneidad en el servidor
        await new Promise(r => setTimeout(r, 1000))
        
        const yesterdayBids = await getBidsByDate(formattedYesterday)
        
        if (yesterdayBids && yesterdayBids.length > 0) {
          setBids(mapBids(yesterdayBids))
          setIsRealData(true)
        } else {
          // Si ayer también está vacío, simplemente mostramos lista vacía sin error
          setBids([])
          setIsRealData(true) 
        }
      }
    } catch (error) {
      console.error("[UI] Error al obtener licitaciones:", error)
      setBids([])
      setIsRealData(false)
      setApiError(true)
    } finally {
      setIsLoading(false)
    }
  }, [toast])

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
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">Explorador de Licitaciones</h2>
            <Badge variant={isRealData ? "default" : "secondary"} className={isRealData ? "bg-green-500 text-white" : ""}>
              {isRealData ? (bids.length > 0 ? "LIVE DATA" : "SINCRO OK") : "SIN DATOS"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Oportunidades reales de Mercado Público sincronizadas en tiempo real.</p>
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
            className={viewMode === 'grid' ? 'bg-primary' : ''}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="icon" 
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-primary' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {apiError && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="h-10 w-10 text-orange-600 shrink-0" />
            <div>
              <h4 className="font-bold text-orange-800">Error de conexión</h4>
              <p className="text-sm text-orange-700 leading-relaxed">
                Hubo un problema al contactar con el servidor. Por favor, intenta sincronizar de nuevo en unos momentos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isRealData && bids.length === 0 && !isLoading && (
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6 flex items-center gap-4">
            <Info className="h-10 w-10 text-primary shrink-0" />
            <div>
              <h4 className="font-bold text-primary">Sin licitaciones recientes</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No se encontraron licitaciones nuevas para hoy ni ayer. Esto es normal en fines de semana o días festivos en ChileCompra.
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
              placeholder="Buscar por título o institución..." 
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === null ? 'default' : 'outline'} 
              size="sm" 
              className={selectedCategory === null ? 'bg-primary' : ''}
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {CATEGORIES.map(cat => (
              <Button 
                key={cat} 
                variant={selectedCategory === cat ? 'default' : 'outline'} 
                size="sm"
                className={selectedCategory === cat ? 'bg-accent border-accent text-white' : ''}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Sincronizando con Mercado Público...</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredBids.length > 0 ? (
            filteredBids.map((bid) => (
              <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
                <Card className="h-full hover:border-accent hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="h-2 bg-primary group-hover:bg-accent transition-colors" />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-tighter border-accent/20 text-accent">ID: {bid.id}</Badge>
                        <Badge className={bid.status === 'Abierta' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-muted text-muted-foreground'}>
                          {bid.status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-primary transition-colors">{bid.title}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate font-medium">{bid.entity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-primary" />
                          <span>{bid.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-primary" />
                          <span>Cierra: {bid.deadline}</span>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Presupuesto</span>
                          <span className="text-lg font-black text-primary">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount)}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" className="text-accent group-hover:translate-x-1 transition-transform">
                          Detalles →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold">Sin resultados reales</h3>
              <p className="text-muted-foreground">Haz clic en "Sincronizar" para buscar datos en vivo.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}