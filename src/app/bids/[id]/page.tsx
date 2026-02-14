"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { extractAndSummarizeBidDetails, PostulationAdvisorOutput } from "@/ai/flows/extract-and-summarize-bid-details"
import { useState, useEffect } from "react"
import { 
  Building2, 
  Clock, 
  DollarSign, 
  FileText, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  Calendar,
  ClipboardList,
  Target,
  FileSpreadsheet,
  Info,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getBidDetail, MercadoPublicoBid } from "@/services/mercado-publico"

export default function BidDetailPage() {
  const params = useParams()
  const bidId = params.id as string
  const [liveBid, setLiveBid] = useState<MercadoPublicoBid | null>(null)
  const [loadingBid, setLoadingBid] = useState(true)
  const [loadingAI, setLoadingAI] = useState(false)
  const [analysis, setAnalysis] = useState<PostulationAdvisorOutput | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function loadDetail() {
      setLoadingBid(true)
      const data = await getBidDetail(bidId)
      setLiveBid(data)
      setLoadingBid(false)
    }
    loadDetail()
  }, [bidId])

  const handleAnalyze = async () => {
    if (!liveBid) return
    setLoadingAI(true)
    try {
      const fullText = `Título: ${liveBid.Nombre}. Descripción: ${liveBid.Descripcion || liveBid.Nombre}. Estado: ${liveBid.Estado}.`
      const result = await extractAndSummarizeBidDetails({ 
        bidDocumentText: fullText,
        bidId: liveBid.CodigoExterno 
      })
      setAnalysis(result)
      toast({
        title: "Asesoría Generada",
        description: "Análisis estratégico completado con éxito.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Análisis",
        description: "La IA no pudo procesar los datos en este momento.",
      })
    } finally {
      setLoadingAI(false)
    }
  }

  if (loadingBid) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Obteniendo detalles oficiales desde ChileCompra...</p>
      </div>
    )
  }

  if (!liveBid) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
        <h2 className="text-2xl font-bold">Licitación no encontrada</h2>
        <p className="text-muted-foreground">El ID {bidId} no existe o no es público en este momento.</p>
        <Link href="/bids">
          <Button variant="outline">Volver al explorador</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/bids">
        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver al explorador
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/20">ID: {liveBid.CodigoExterno}</Badge>
            <Badge className={cn(
               "text-white",
               liveBid.Estado === 'Publicada' ? 'bg-green-500' : 'bg-blue-500'
            )}>{liveBid.Estado}</Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary leading-tight">{liveBid.Nombre}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-border">
              <Building2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Institución</p>
                <p className="text-sm font-semibold text-foreground">{liveBid.Organismo?.NombreOrganismo || "Institución no especificada"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-border">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Cierre Oficial</p>
                <p className="text-sm font-semibold text-foreground">{liveBid.FechaCierre ? new Date(liveBid.FechaCierre).toLocaleDateString() : 'No definido'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="w-full md:w-96 border-2 border-primary shadow-2xl bg-primary/5 overflow-hidden">
          <CardHeader className="bg-primary text-white p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Asesoría Estratégica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!analysis ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Analizaremos los detalles oficiales para detectar riesgos, plazos y una guía de postulación.</p>
                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12" 
                  onClick={handleAnalyze}
                  disabled={loadingAI}
                >
                  {loadingAI ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</> : 'Activar Asesor IA'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-accent shadow-sm">
                  <p className="text-xs font-bold text-accent uppercase mb-2">Consejo Estratégico</p>
                  <p className="text-sm font-medium leading-relaxed italic">"{analysis.strategicAdvice}"</p>
                </div>
                <Button variant="outline" className="w-full border-primary text-primary" onClick={() => setAnalysis(null)}>
                  Reiniciar Análisis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="description" className="space-y-6">
        <TabsList className="bg-muted p-1 gap-1 h-12">
          <TabsTrigger value="description" className="px-6">Detalle Público</TabsTrigger>
          <TabsTrigger value="items" className="px-6">Ítems Solicitados</TabsTrigger>
          {analysis && (
            <>
              <TabsTrigger value="ai-advisor" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Target className="h-4 w-4 mr-2" /> Estrategia
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="description" className="animate-in fade-in duration-300">
          <Card>
            <CardContent className="pt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-2xl font-bold text-primary">Descripción del Proceso</h3>
                  <p className="text-lg text-foreground leading-relaxed">
                    {liveBid.Descripcion || "Sin descripción detallada disponible en el resumen público."}
                  </p>
                  <div className="pt-4">
                    <Button asChild variant="outline" className="gap-2">
                      <a href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${liveBid.CodigoExterno}`} target="_blank">
                        Ver Ficha en Mercado Público <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 p-6 rounded-2xl border border-border">
                  <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accent" /> Aspectos Económicos
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Monto Estimado</p>
                      <p className="text-2xl font-black text-primary">
                        {liveBid.MontoEstimado ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: liveBid.Moneda || 'CLP' }).format(liveBid.MontoEstimado) : 'Monto no definido'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Moneda</p>
                      <p className="text-sm font-semibold">{liveBid.Moneda || 'CLP'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Listado de Bienes y Servicios</CardTitle>
              <CardDescription>Ítems específicos que la institución requiere adquirir.</CardDescription>
            </CardHeader>
            <CardContent>
              {liveBid.Items?.Listado && liveBid.Items.Listado.length > 0 ? (
                <div className="grid gap-4">
                  {liveBid.Items.Listado.map((item, i) => (
                    <div key={i} className="p-4 bg-muted/20 rounded-xl border flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="font-bold text-primary">{item.NombreProducto}</p>
                        <p className="text-xs text-muted-foreground">{item.Categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-accent">{item.Cantidad} {item.UnidadMedida}</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Cantidad</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground italic">
                  No hay ítems detallados disponibles en esta vista rápida.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {analysis && (
          <TabsContent value="ai-advisor" className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-red-100 bg-red-50/30">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" /> Alertas Críticas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {analysis.strategicAlerts.map((alert, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                          <p className="text-sm font-medium text-red-900">{alert}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-accent" /> Hitos Clave
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analysis.timeline.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white border border-border rounded-xl">
                            <div>
                              <p className="font-bold text-sm text-primary">{item.event}</p>
                              <p className="text-xs text-muted-foreground">{item.date}</p>
                            </div>
                            <Badge variant="outline" className="uppercase text-[10px]">{item.criticality}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card className="bg-primary text-white border-none shadow-xl h-fit">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Target className="h-6 w-6 text-accent" /> Veredicto IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-primary-foreground/90 leading-relaxed font-medium">
                        {analysis.strategicAdvice}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}