
"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { extractAndSummarizeBidDetails, PostulationAdvisorOutput } from "@/ai/flows/extract-and-summarize-bid-details"
import { useState, useEffect } from "react"
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
  BrainCircuit,
  Zap,
  Database,
  Users,
  SendHorizontal
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
          description: "Se han sincronizado los detalles extendidos.",
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
      toast({ title: "Inicia sesión", description: "Debes estar autenticado." })
      return
    }
    if (!bid || !bookmarkRef) return

    try {
      if (bookmark) {
        await deleteDoc(bookmarkRef)
        toast({ title: "Licitación eliminada", description: "Ya no sigues este proceso." })
      } else {
        // Capturamos el cronograma actual si existe para que el dashboard tenga alertas inmediatas
        const timelineSnapshot = analysis?.timeline || (bid.aiAnalysis as any)?.timeline || []
        
        await setDoc(bookmarkRef, {
          bidId: bid.id,
          title: bid.title,
          entity: bid.entity || "No especificada",
          status: bid.status,
          savedAt: new Date().toISOString(),
          timeline: timelineSnapshot
        })
        toast({ title: "Licitación seguida", description: "Se ha guardado en tu cartera." })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." })
    }
  }

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    if (!bid || !bidRef) return

    if (mode === 'fast' && bid.aiAnalysis) {
      setAnalysis(bid.aiAnalysis as PostulationAdvisorOutput)
      return
    }

    setLoadingAI(true)
    if (mode === 'deep') setIsDialogOpen(false)

    try {
      toast({ title: "Iniciando Análisis IA", description: "Analizando datos estratégicos..." })
      const contextText = mode === 'deep' ? manualText : (bid.description || bid.title)
      const result = await extractAndSummarizeBidDetails({ 
        bidId: bid.id,
        bidDocumentText: contextText,
        useLivePortal: true
      })
      
      await updateDoc(bidRef, {
        aiAnalysis: result,
        lastAnalyzedAt: new Date().toISOString()
      })

      // Si ya está seguida, actualizamos el bookmark también para que el dashboard se refresque
      if (bookmarkRef && bookmark) {
        await updateDoc(bookmarkRef, {
          timeline: result.timeline
        })
      }

      setAnalysis(result)
      toast({ title: "Análisis Finalizado", description: "La inteligencia ha sido guardada." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de Análisis", description: error.message })
    } finally {
      setLoadingAI(false)
    }
  }

  if (isDocLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>

  if (!bid) return <div className="text-center py-20"><AlertTriangle className="mx-auto mb-4" /><h2 className="text-2xl font-bold">No encontrado</h2></div>

  const formattedAmount = bid.amount > 0 
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency || 'CLP' }).format(bid.amount) 
    : 'Por Definir';

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Link href="/bids">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver al explorador
          </Button>
        </Link>
        <div className="flex gap-2">
          {bookmark && (
            <Link href={`/bids/${bidId}/apply`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 shadow-lg">
                <SendHorizontal className="h-4 w-4" /> Preparar Oferta
              </Button>
            </Link>
          )}
          <Button 
            variant={bookmark ? "default" : "outline"} 
            size="sm" 
            onClick={handleToggleFollow}
            className={cn("gap-2", bookmark ? "bg-accent hover:bg-accent/90" : "border-accent text-accent")}
          >
            {bookmark ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {bookmark ? "Siguiendo" : "Seguir"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleRefreshData(true)} disabled={isRefreshing} className="gap-2 border-primary/20">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">ID: {bid.id}</Badge>
            <Badge className="bg-emerald-500 text-white">{bid.status}</Badge>
            {bid.aiAnalysis && <Badge variant="secondary" className="bg-teal-50 text-teal-700"><Database className="h-3 w-3 mr-1" /> IA Lista</Badge>}
          </div>
          <h1 className="text-4xl font-black text-primary leading-tight">{bid.title}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
              <Building2 className="h-5 w-5 text-accent" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Institución</p>
                <p className="text-sm font-semibold truncate">{bid.entity || "No especificada"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Cierre Oficial</p>
                <p className="text-sm font-semibold">
                  {bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString() : 'No definido'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="w-full md:w-96 border-2 border-primary bg-primary/5">
          <CardHeader className="bg-primary text-white p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Asesoría Estratégica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!analysis ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Inicia un análisis para detectar riesgos ocultos.</p>
                <div className="grid gap-2">
                  <Button className="w-full bg-accent hover:bg-accent/90 font-bold h-12 gap-2" onClick={() => handleAnalyze('fast')} disabled={loadingAI}>
                    <Zap className="h-4 w-4" /> {bid.aiAnalysis ? 'Ver Análisis Guardado' : 'Escanear Portal'}
                  </Button>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full border-accent text-accent font-bold h-12 gap-2">
                        <BrainCircuit className="h-4 w-4" /> Entrenar con Bases
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Inteligencia de Bases</DialogTitle>
                        <DialogDescription>Pega el texto de las Bases Administrativas para detectar multas y anexos.</DialogDescription>
                      </DialogHeader>
                      <Textarea 
                        placeholder="Pega aquí el contenido del PDF..." 
                        className="min-h-[300px] font-mono text-xs"
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                      />
                      <DialogFooter>
                        <Button className="bg-accent hover:bg-accent/90 font-bold w-full h-12" onClick={() => handleAnalyze('deep')} disabled={!manualText || loadingAI}>
                          Generar Inteligencia Profunda
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-accent shadow-sm">
                  <p className="text-xs font-bold text-accent uppercase mb-1">Consejo Maestro</p>
                  <p className="text-sm font-medium italic">"{analysis.strategicAdvice}"</p>
                </div>
                <Button variant="outline" className="w-full border-primary text-primary" onClick={() => setAnalysis(null)}>
                  Ver Otros Modos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={analysis ? "ai-advisor" : "description"} className="space-y-6">
        <TabsList className="bg-muted p-1 h-12">
          <TabsTrigger value="description" className="px-6">Detalle Público</TabsTrigger>
          <TabsTrigger value="items" className="px-6">Ítems</TabsTrigger>
          {(analysis || bid?.aiAnalysis) && (
            <TabsTrigger value="ai-advisor" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Target className="h-4 w-4 mr-2" /> Inteligencia IA
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="description" className="animate-in fade-in">
          <Card>
            <CardContent className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-2xl font-bold text-primary">Descripción</h3>
                <div className="text-lg leading-relaxed whitespace-pre-wrap">{bid.description || "Cargando detalle..."}</div>
                <Button asChild variant="outline" className="gap-2">
                  <a href={bid.sourceUrl} target="_blank" rel="noopener noreferrer">Ficha Oficial <ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="bg-muted/30 p-6 rounded-2xl border h-fit">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Monto Referencial</p>
                <p className="text-2xl font-black text-primary">{formattedAmount}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="animate-in fade-in">
          <Card><CardContent className="pt-6">
            {bid.items ? (
              <div className="grid gap-4">
                {bid.items.map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-muted/20 rounded-xl border flex justify-between items-center">
                    <div><p className="font-bold text-primary">{item.NombreProducto}</p><p className="text-xs text-muted-foreground">{item.Categoria}</p></div>
                    <div className="text-right"><p className="text-lg font-black text-accent">{item.Cantidad} {item.UnidadMedida}</p></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center py-10 text-muted-foreground">Usa el botón refrescar para ver los ítems.</p>}
          </CardContent></Card>
        </TabsContent>

        {analysis && (
          <TabsContent value="ai-advisor" className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-red-100 bg-red-50/30">
                    <CardHeader><CardTitle className="text-red-700 flex items-center gap-2"><AlertTriangle /> Alertas Estratégicas</CardTitle></CardHeader>
                    <CardContent className="grid gap-3">
                      {analysis.strategicAlerts.map((alert, i) => (
                        <div key={i} className="p-4 bg-white rounded-xl border border-red-100 shadow-sm"><p className="text-sm font-medium text-red-900">{alert}</p></div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-primary flex items-center gap-2"><CheckSquare /> Documentación Requerida</CardTitle></CardHeader>
                    <CardContent className="grid gap-4">
                      {analysis.formChecklist.map((form, i) => (
                        <div key={i} className="p-4 bg-muted/20 rounded-xl border space-y-2">
                          <h4 className="font-bold text-primary">{form.formName}</h4>
                          <p className="text-xs text-muted-foreground">{form.purpose}</p>
                          <div className="flex flex-wrap gap-2">{form.dataRequired.map((d, j) => <Badge key={j} variant="outline" className="bg-white text-[10px]">{d}</Badge>)}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card className="bg-primary text-white border-none shadow-xl">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Target /> Veredicto</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="font-medium">{analysis.strategicAdvice}</p>
                      <div className="p-3 bg-white/10 rounded-lg text-xs italic opacity-80">{analysis.reasoning}</div>
                    </CardContent>
                  </Card>
                  {analysis.timeline && (
                     <Card className="border-accent/20 bg-accent/5">
                        <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Clock /> Cronograma IA</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                           {analysis.timeline.map((item, i) => (
                              <div key={i} className={cn(
                                "p-3 rounded-lg border shadow-sm",
                                item.criticality === 'alta' ? "bg-red-50 border-red-200" : "bg-white"
                              )}>
                                 <p className="text-[10px] font-black uppercase text-muted-foreground">{item.event}</p>
                                 <p className="text-sm font-bold text-primary">{item.date}</p>
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
