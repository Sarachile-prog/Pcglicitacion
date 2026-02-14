"use client"

import { useState, useEffect, useCallback } from "react"
import { MOCK_BIDS, CATEGORIES, Bid } from "@/app/lib/mock-data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, MapPin, Building2, Clock, DollarSign, LayoutGrid, List, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import Link from "next/link"
import { getBidsByDate, MercadoPublicoBid } from "@/services/mercado-publico"
import { useToast } from "@/hooks/use-toast"

export default function BidsListPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [bids, setBids] = useState<Bid[]>(MOCK_BIDS)
  const [isLoading, setIsLoading] = useState(false)
  const [isRealData, setIsRealData] = useState(false)
  const [apiError, setApiError] = useState(false)
  const { toast } = useToast()

  const fetchLiveBids = useCallback(async () => {
    setIsLoading(true)
    setApiError(false)
    try {
      // Intentamos con la fecha de hoy
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
      
      const liveBidsData = await getBidsByDate(formattedDate)
      
      if (liveBidsData && liveBidsData.length > 0) {
        const mappedBids: Bid[] = liveBidsData.map((b: MercadoPublicoBid) => ({
          id: b.CodigoExterno,
          title: b.Nombre,
          entity: b.Organismo.NombreOrganismo,
          category: 'General', 
          amount: b.MontoEstimado || 0,
          currency: b.Moneda || 'CLP',
          deadline: new Date(b.FechaCierre).toLocaleDateString(),
          status: b.Estado as any,
          description: b.Nombre,
          fullText: b.Nombre,
          location: 'Chile'
        }))
        setBids(mappedBids)
        setIsRealData(true)
        toast({
          title: "Datos en vivo",
          description: `Se han cargado ${mappedBids.length} licitaciones reales de hoy.`,
        })
      } else {
        // Si no hay datos hoy, probamos con ayer (a veces la API tarda en actualizar)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const formattedYesterday = `${String(yesterday.getDate()).padStart(2, '0')}${String(yesterday.getMonth() + 1).padStart(2, '0')}${yesterday.getFullYear()}`
        
        const yesterdayBids = await getBidsByDate(formattedYesterday)
        
        if (yesterdayBids && yesterdayBids.length > 0) {
          const mappedBids: Bid[] = yesterdayBids.map((b: MercadoPublicoBid) => ({
            id: b.CodigoExterno,
            title: b.Nombre,
            entity: b.Organismo.NombreOrganismo,
            category: 'General', 
            amount: b.MontoEstimado || 0,
            currency: b.Moneda || 'CLP',
            deadline: new Date(b.FechaCierre).toLocaleDateString(),
            status: b.Estado as any,
            description: b.Nombre,
            fullText: b.Nombre,
            location: 'Chile'
          }))
          setBids(mappedBids)
          setIsRealData(true)
        } else {
          setBids(MOCK_BIDS)
          setIsRealData(false)
          setApiError(true)
        }
      }
    } catch (error) {
      setBids(MOCK_BIDS)
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
            <Badge variant={isRealData ? "default" : "secondary"} className={isRealData ? "bg-green-500" : ""}>
              {isRealData ? "LIVE DATA" : "MODO DEMO"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Explora oportunidades reales de Mercado Público en tiempo real.</p>
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
              <h4 className="font-bold text-orange-800">Servicio de Mercado Público no disponible o sin resultados</h4>
              <p className="text-sm text-orange-700 leading-relaxed">
                La API oficial de ChileCompra no ha devuelto resultados para hoy. 
                Hemos activado el <strong>Modo Demo</strong> con licitaciones de respaldo para que puedas continuar probando las herramientas de IA.
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
          <p className="text-muted-foreground font-medium">Conectando con el Servidor (API ChileCompra)...</p>
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
              <h3 className="text-xl font-bold">No se encontraron licitaciones</h3>
              <p className="text-muted-foreground">Prueba ajustando tus filtros de búsqueda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
