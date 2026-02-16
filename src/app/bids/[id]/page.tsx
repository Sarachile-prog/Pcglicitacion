
"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { extractAndSummarizeBidDetails, PostulationAdvisorOutput } from "@/ai/flows/extract-and-summarize-bid-details"
import { useState, useEffect, useMemo } from "react"
import { 
  Building2, 
  Clock, 
  DollarSign, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  Calendar,
  Target,
  ExternalLink,
  RefreshCw,
  Info,
  Bookmark,
  BookmarkCheck,
  FileText,
  CheckSquare,
  FilePlus2,
  BrainCircuit,
  Zap,
  Globe,
  Database,
  Users
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getBidDetail } from "@/services/mercado-publico"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore"

export default function BidDetailPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [loadingAI, setLoadingAI] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [analysis, setAnalysis] = useState<PostulationAdvisorOutput | null>(null)
  const [manualText, setManualText] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const bidRef = useMemoFirebase(() => {
    if (!db || !bidId) return null
    return doc(db, "bids", bidId)
  }, [db, bidId])

  const { data: bid, isLoading: isDocLoading } = useDoc(bidRef)

  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !user || !bidId) return null
    return doc(db, "users", user.uid, "bookmarks", bidId)
  }, [db, user, bidId])

  const { data: bookmark, isLoading: isBookmarkLoading } = useDoc(bookmarkRef)

  // Sincronizar estado local de análisis con los datos de Firestore
  useEffect(() => {
    if (bid?.aiAnalysis) {
      setAnalysis(bid.aiAnalysis as PostulationAdvisorOutput)
    }
  }, [bid])

  useEffect(() => {
    if (bidId && !isDocLoading && bid && !bid.fullDetailAt) {
      handleRefreshData(false)
    }
  }, [bidId, isDocLoading, bid])

  const handleRefreshData = async (showToast = true) => {
    setIsRefreshing(true)
    try {
      const liveData = await getBidDetail(bidId)
      if (liveData && showToast) {
        toast({
          title: "Datos Actualizados",
          description: "Se han sincronizado los detalles extendidos y montos reales.",
        })
      }
    } catch (error) {
      if (showToast) {
        toast({
          variant: "destructive",
          title: "Error de Sincronización",
          description: "No se pudo conectar con la API oficial.",
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes estar autenticado para seguir licitaciones.",
      })
      return
    }
    if (!bid || !bookmarkRef) return

    try {
      if (bookmark) {
        await deleteDoc(bookmarkRef)
        toast({ title: "Licitación eliminada", description: "Ya no sigues este proceso." })
      } else {
        await setDoc(bookmarkRef, {
          bidId: bid.id,
          title: bid.title,
          entity: bid.entity || "No especificada",
          status: bid.status,
          savedAt: new Date().toISOString()
        })
        toast({ title: "Licitación seguida", description: "Se ha guardado en tu cartera." })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado." })
    }
  }

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    if (!bid || !bidRef) return

    // Si ya existe un análisis guardado y es modo rápido, avisamos que lo estamos recuperando
    if (mode === 'fast' && bid.aiAnalysis) {
      toast({
        title: "Análisis Recuperado",
        description: "Mostrando inteligencia ya almacenada en la base de datos.",
      })
      setAnalysis(bid.aiAnalysis as PostulationAdvisorOutput)
      return
    }

    setLoadingAI(true)
    if (mode === 'deep') setIsDialogOpen(false)

    try {
      toast({
        title: "Iniciando Análisis IA",
        description: mode === 'fast' ? "Escaneando portal en vivo..." : "Procesando bases administrativas...",
      })

      const contextText = mode === 'deep' ? manualText : (bid.description || bid.title)
      
      const result = await extractAndSummarizeBidDetails({ 
        bidId: bid.id,
        bidDocumentText: contextText,
        useLivePortal: true
      })
      
      // PERSISTENCIA: Guardamos el análisis en la base de datos para que sea compartido
      updateDoc(bidRef, {
        aiAnalysis: result,
        lastAnalyzedAt: new Date().toISOString()
      })

      setAnalysis(result)
      toast({
        title: "Análisis Finalizado",
        description: "La inteligencia ha sido guardada y compartida con la comunidad.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de Análisis",
        description: error.message || "La IA no pudo procesar los datos.",
      })
    } finally {
      setLoadingAI(false)
    }
  }

  if (isDocLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Cargando licitación...</p>
      </div>
    )
  }

  if (!bid) {
    return (
      <div className="text-center py-20 space-y-4 animate-in fade-in">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
        <h2 className="text-2xl font-bold">Licitación no encontrada</h2>
        <p className="text-muted-foreground">El ID {bidId} no existe en nuestra base de datos.</p>
        <Link href="/bids">
          <Button variant="outline">Volver al explorador</Button>
        </Link>
      </div>
    )
  }

  const formattedAmount = bid.amount > 0 
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency || 'CLP' }).format(bid.amount) 
    : 'Por Definir';

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Link href="/bids">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver al explorador
          </Button>
        </Link>
        <div className="flex gap-2">
           <Button 
            variant={bookmark ? "default" : "outline"} 
            size="sm" 
            onClick={handleToggleFollow}
            disabled={isBookmarkLoading}
            className={cn("gap-2", bookmark ? "bg-accent hover:bg-accent/90 border-none" : "border-accent text-accent")}
          >
            {bookmark ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {bookmark ? "Siguiendo" : "Seguir Licitación"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleRefreshData(true)}
            disabled={isRefreshing}
            className="gap-2 border-primary/20 text-primary"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Actualizando..." : "Refrescar desde API"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/20">ID: {bid.id}</Badge>
            <Badge className={cn(
               "text-white",
               bid.status === 'Publicada' ? 'bg-emerald-500' : 'bg-blue-600'
            )}>{bid.status}</Badge>
            {bid.aiAnalysis && (
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-100 flex items-center gap-1">
                <Database className="h-3 w-3" /> Inteligencia Persistida
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary leading-tight">{bid.title}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-border">
              <Building2 className="h-5 w-5 text-accent" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Institución</p>
                <p className="text-sm font-semibold text-foreground truncate">{bid.entity || "No especificada"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-border">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Cierre Oficial</p>
                <p className="text-sm font-semibold text-foreground">
                  {bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString() : 'No definido'}
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Inicia un análisis para descubrir riesgos ocultos y documentación necesaria. 
                  {bid.aiAnalysis && " Ya hay un análisis disponible en la base de datos."}
                </p>
                
                <div className="grid gap-2">
                  <Button 
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 gap-2" 
                    onClick={() => handleAnalyze('fast')}
                    disabled={loadingAI || isRefreshing}
                  >
                    {loadingAI ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : <><Zap className="h-4 w-4" /> {bid.aiAnalysis ? 'Ver Análisis Guardado' : 'Escanear Portal (Live)'}</>}
                  </Button>

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="w-full border-accent text-accent font-bold h-12 gap-2 group"
                        disabled={loadingAI || isRefreshing}
                      >
                        <BrainCircuit className="h-4 w-4 group-hover:scale-110 transition-transform" /> 
                        Entrenar con Bases (Análisis Profundo)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader className="space-y-3">
                        <DialogTitle className="text-2xl flex items-center gap-2">
                          <Users className="h-6 w-6 text-accent" /> Inteligencia Estratégica Compartida
                        </DialogTitle>
                        <DialogDescription className="text-md leading-relaxed">
                          Pega aquí el texto extraído de las <b>Bases Administrativas o Técnicas (PDF)</b>. 
                          La IA procesará multas, boletas de garantía y anexos, <b>guardando este análisis permanentemente</b> para que tú y otros usuarios puedan postular con éxito.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Textarea 
                          placeholder="Pega aquí el contenido de los anexos, criterios de evaluación o bases administrativas..." 
                          className="min-h-[300px] font-mono text-xs border-accent/20 focus:border-accent"
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                        />
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                          <Info className="h-3 w-3" />
                          <span>Tip: Puedes seleccionar todo el texto del PDF (Ctrl+A) y pegarlo aquí directamente.</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          className="bg-accent hover:bg-accent/90 font-bold w-full h-14 text-lg gap-2 shadow-lg" 
                          onClick={() => handleAnalyze('deep')}
                          disabled={!manualText || loadingAI}
                        >
                          {loadingAI ? <Loader2 className="animate-spin h-5 w-5" /> : <Database className="h-5 w-5" />}
                          Actualizar Inteligencia de la Comunidad
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-accent shadow-sm">
                  <p className="text-xs font-bold text-accent uppercase mb-2">Consejo Estratégico</p>
                  <p className="text-sm font-medium leading-relaxed italic">"{analysis.strategicAdvice}"</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full border-primary text-primary" onClick={() => setAnalysis(null)}>
                    Cambiar Modo de Análisis
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Los resultados están persistidos en la base de datos global.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={analysis ? "ai-advisor" : "description"} className="space-y-6">
        <TabsList className="bg-muted p-1 gap-1 h-12 overflow-x-auto">
          <TabsTrigger value="description" className="px-6">Detalle Público</TabsTrigger>
          <TabsTrigger value="items" className="px-6">Ítems Solicitados</TabsTrigger>
          {(analysis || bid?.aiAnalysis) && (
            <TabsTrigger value="ai-advisor" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Target className="h-4 w-4 mr-2" /> Inteligencia IA {bid?.aiAnalysis && <Database className="h-3 w-3 ml-2 opacity-50" />}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="description" className="animate-in fade-in duration-300">
          <Card>
            <CardContent className="pt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-2xl font-bold text-primary">Descripción del Proceso</h3>
                  <div className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                    {bid.description || "La descripción extendida se cargará automáticamente al finalizar la sincronización en segundo plano."}
                  </div>
                  <div className="pt-4 flex gap-4">
                    <Button asChild variant="outline" className="gap-2">
                      <a href={bid.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Ver Ficha en Mercado Público <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 p-6 rounded-2xl border border-border h-fit">
                  <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accent" /> Aspectos Económicos
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Monto Estimado</p>
                      <p className="text-2xl font-black text-primary">
                        {formattedAmount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Moneda</p>
                      <p className="text-sm font-semibold">{bid.currency || 'CLP'}</p>
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
              {bid.items && bid.items.length > 0 ? (
                <div className="grid gap-4">
                  {bid.items.map((item: any, i: number) => (
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
                <div className="text-center py-10 space-y-4">
                   <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Info className="h-6 w-6 text-muted-foreground" />
                   </div>
                  <p className="text-muted-foreground italic">No hay ítems detallados guardados. Pulsa 'Refrescar desde API' para intentar obtenerlos.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {analysis && (
          <TabsContent value="ai-advisor" className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* ALERTAS */}
                  <Card className="border-red-100 bg-red-50/30">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" /> Alertas Estratégicas
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

                  {/* CHECKLIST DE FORMULARIOS */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                        <CheckSquare className="h-6 w-6 text-accent" /> Documentación Identificada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {analysis.formChecklist.map((form, i) => (
                        <div key={i} className="p-4 bg-muted/20 rounded-xl border space-y-3">
                          <h4 className="font-bold text-primary flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" /> {form.formName}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{form.purpose}</p>
                          <div className="flex flex-wrap gap-2">
                            {form.dataRequired.map((data, j) => (
                              <Badge key={j} variant="outline" className="bg-white text-[10px]">{data}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* HITOS */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-accent" /> Cronograma Estratégico
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
                            <Badge variant="outline" className={cn(
                              "uppercase text-[10px]",
                              item.criticality === 'alta' ? 'border-red-200 text-red-700 bg-red-50' : ''
                            )}>{item.criticality}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {/* VERDICTO FINAL */}
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
                      <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                        <p className="text-[10px] uppercase font-bold text-accent mb-2">Razonamiento</p>
                        <p className="text-xs italic opacity-80 leading-relaxed">
                          {analysis.reasoning}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* LEADS POTENCIALES */}
                  {analysis.identifiedLeads.length > 0 && (
                    <Card className="border-accent/20 bg-accent/5">
                      <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-accent" /> Prospección de Leads
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.identifiedLeads.map((lead, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg border border-accent/10 shadow-sm">
                            <p className="font-bold text-sm text-primary">{lead.name}</p>
                            <p className="text-[10px] text-accent font-bold uppercase mb-1">{lead.role}</p>
                            <p className="text-[10px] text-muted-foreground italic">{lead.reason}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
