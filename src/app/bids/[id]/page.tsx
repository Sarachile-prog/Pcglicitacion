
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
  SendHorizontal,
  ShieldCheck,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  LockKeyhole,
  MessageCircle
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getBidDetail } from "@/services/mercado-publico"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore"

const DEMO_AI_LIMIT = 3;
const WHATSAPP_URL = "https://wa.me/56941245316?text=Hola,%20quiero%20activar%20el%20plan%20corporativo%20para%20mi%20empresa.";

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
  const [activeTab, setActiveTab] = useState<string>("description")

  // Perfil para obtener el companyId y conteo de IA
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  const bidRef = useMemoFirebase(() => {
    if (!db || !bidId) return null
    return doc(db, "bids", bidId)
  }, [db, bidId])

  const { data: bid, isLoading: isDocLoading } = useDoc(bidRef)

  // Bookmarks corporativos
  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !profile?.companyId || !bidId) return null
    return doc(db, "companies", profile.companyId, "bookmarks", bidId)
  }, [db, profile, bidId])

  const { data: bookmark } = useDoc(bookmarkRef)

  const isDemo = user && (!profile || !profile.companyId);
  const demoUsage = profile?.aiUsageCount || 0;
  const isLimitReached = isDemo && demoUsage >= DEMO_AI_LIMIT;

  useEffect(() => {
    if (bid?.aiAnalysis) {
      setAnalysis(bid.aiAnalysis as PostulationAdvisorOutput)
      if (activeTab !== "ai-advisor") {
        setActiveTab("ai-advisor")
      }
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
    if (!user || !profile?.companyId) {
      toast({ title: "Acceso Restringido", description: "Debes estar vinculado a una empresa para seguir procesos." })
      return
    }
    if (!bid || !bookmarkRef) return

    try {
      if (bookmark) {
        await deleteDoc(bookmarkRef)
        toast({ title: "Eliminado de Cartera", description: "El proceso ya no es visible para tu equipo." })
      } else {
        const currentAnalysis = analysis || (bid.aiAnalysis as any) || null
        const timelineSnapshot = currentAnalysis?.timeline || []
        
        await setDoc(bookmarkRef, {
          bidId: bid.id,
          title: bid.title,
          entity: bid.entity || "No especificada",
          status: bid.status,
          preparationStatus: "En Estudio",
          savedAt: new Date().toISOString(),
          timeline: timelineSnapshot,
          aiAnalysis: currentAnalysis
        })
        toast({ title: "Guardado en Equipo", description: "Ahora todo tu equipo puede ver y colaborar en este proceso." })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." })
    }
  }

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    if (!bid || !bidRef || !profileRef) return

    if (isLimitReached) {
      toast({ 
        variant: "destructive", 
        title: "Límite de Demo", 
        description: "Has agotado tus 3 análisis de prueba. Activa tu cuenta empresa para continuar." 
      })
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
      
      // Actualizar licitación
      await updateDoc(bidRef, {
        aiAnalysis: result,
        lastAnalyzedAt: new Date().toISOString()
      })

      // Si es demo, descontar crédito
      if (isDemo) {
        await updateDoc(profileRef, {
          aiUsageCount: increment(1)
        })
      }

      if (bookmarkRef && bookmark) {
        await updateDoc(bookmarkRef, {
          timeline: result.timeline,
          aiAnalysis: result
        })
      }

      setAnalysis(result)
      setActiveTab("ai-advisor")
      toast({ title: "Análisis Finalizado", description: "La inteligencia ha sido guardada y sincronizada." })
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

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes('publicada') || s?.includes('abierta')) return 'bg-emerald-600';
    if (s?.includes('adjudicada')) return 'bg-blue-600';
    if (s?.includes('desierta') || s?.includes('cancelada')) return 'bg-red-600';
    if (s?.includes('cerrada')) return 'bg-gray-600';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Link href="/bids">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver al explorador
          </Button>
        </Link>
        <div className="flex gap-2">
          {bookmark && (
            <Link href={`/bids/${bidId}/apply`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 shadow-lg uppercase italic text-xs">
                <SendHorizontal className="h-4 w-4" /> Preparar Oferta
              </Button>
            </Link>
          )}
          <Button 
            variant={bookmark ? "default" : "outline"} 
            size="sm" 
            onClick={handleToggleFollow}
            className={cn(
              "gap-2 uppercase font-black italic transition-all", 
              bookmark ? "bg-accent hover:bg-accent/90" : "border-accent text-accent hover:bg-accent hover:text-white shadow-[0_0_15px_rgba(38,166,154,0.3)]",
              isDemo && !bookmark && "animate-pulse"
            )}
          >
            {bookmark ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {bookmark ? "En Cartera" : "Seguir"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleRefreshData(true)} disabled={isRefreshing} className="gap-2 border-primary/20">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border-2 border-primary/5 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-primary/20 text-primary">ID: {bid.id}</Badge>
              <Badge className={cn("text-xs font-black uppercase tracking-widest py-1.5 px-4 shadow-lg", getStatusColor(bid.status))}>
                {bid.status || 'NO DEFINIDO'}
              </Badge>
              {bid.aiAnalysis && (
                <Badge variant="secondary" className="bg-teal-50 text-teal-700 text-xs font-bold px-3">
                  <Database className="h-3.5 w-3.5 mr-1.5" /> IA ACTIVA
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-primary leading-tight uppercase italic tracking-tighter">
              {bid.title}
            </h1>
          </div>
          
          <div className="flex flex-col items-end gap-2 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Presupuesto Referencial</p>
            <p className="text-3xl font-black text-primary leading-none">{formattedAmount}</p>
            <p className="text-[10px] font-bold text-accent uppercase">{bid.currency || 'CLP'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Institución</p>
              <p className="text-sm font-bold truncate text-primary uppercase">{bid.entity || "No especificada"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Cierre</p>
              <p className="text-sm font-bold text-primary">
                {bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString() : 'No definido'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Colaboración</p>
              <p className="text-sm font-bold text-primary uppercase">{profile?.companyId ? 'EQUIPO ACTIVO' : 'MODO SOLO'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted p-1 h-14 mb-6 w-full md:w-auto">
              <TabsTrigger value="description" className="px-8 font-black text-[10px] uppercase tracking-widest">Descripción</TabsTrigger>
              <TabsTrigger value="items" className="px-8 font-black text-[10px] uppercase tracking-widest">Ítems</TabsTrigger>
              {(analysis || bid?.aiAnalysis) && (
                <TabsTrigger 
                  value="ai-advisor" 
                  className={cn(
                    "px-8 font-black text-[10px] uppercase tracking-widest transition-all duration-500",
                    "data-[state=active]:bg-primary data-[state=active]:text-white",
                    activeTab !== 'ai-advisor' && "border-2 border-accent text-accent shadow-[0_0_20px_rgba(38,166,154,0.3)] animate-pulse"
                  )}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Inteligencia IA
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="animate-in fade-in space-y-6">
              <Card className="border-none shadow-lg">
                <CardContent className="pt-8 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-6 w-6 text-accent" />
                    <h3 className="text-2xl font-black text-primary uppercase italic">Detalle del Proceso</h3>
                  </div>
                  <div className="text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground font-medium">
                    {bid.description || "No hay una descripción detallada disponible. Intente refrescar los datos."}
                  </div>
                  <div className="pt-6 border-t flex flex-wrap gap-4">
                    <Button asChild variant="outline" className="gap-2 border-primary text-primary font-black uppercase italic">
                      <a href={bid.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Ficha Oficial <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="animate-in fade-in">
              <Card className="border-none shadow-lg">
                <CardContent className="pt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <CheckSquare className="h-6 w-6 text-accent" />
                    <h3 className="text-2xl font-black text-primary uppercase italic">Listado Técnico</h3>
                  </div>
                  {bid.items ? (
                    <div className="grid gap-4">
                      {bid.items.map((item: any, i: number) => (
                        <div key={i} className="p-5 bg-muted/20 rounded-2xl border-2 border-transparent hover:border-accent/20 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <p className="font-black text-primary uppercase">{item.NombreProducto}</p>
                            <p className="text-[10px] font-black text-accent uppercase">{item.Categoria}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 font-medium italic">{item.Descripcion}</p>
                          </div>
                          <div className="bg-white px-6 py-2 rounded-xl border-2 border-primary/5 text-center shadow-sm">
                            <p className="text-2xl font-black text-primary">{item.Cantidad}</p>
                            <p className="text-[10px] font-black uppercase text-muted-foreground">{item.UnidadMedida}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-4">
                      <RefreshCw className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                      <p className="text-muted-foreground font-bold italic uppercase text-xs">Sin ítems cargados.</p>
                      <Button variant="outline" onClick={() => handleRefreshData(true)} className="font-black uppercase italic">Sincronizar Ítems</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {analysis && (
              <TabsContent value="ai-advisor" className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* PROMO PARA USUARIOS DEMO */}
                {isDemo && (
                  <Card className="bg-accent text-white border-none shadow-[0_20px_50px_rgba(38,166,154,0.4)] overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                      <Sparkles className="h-32 w-32" />
                    </div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-white text-accent font-black animate-bounce">PLAN CORPORATIVO</Badge>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">¡Potencia tu Equipo con PCG!</CardTitle>
                      </div>
                      <p className="text-lg font-medium leading-tight italic">
                        Has activado la IA, pero este es solo el 10% del poder de la plataforma.
                      </p>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-6">
                      <p className="text-sm font-bold bg-black/10 p-4 rounded-xl border border-white/20">
                        Presiona el botón <span className="text-primary-foreground underline decoration-white font-black px-1">SEGUIR</span> arriba ↗️ para desbloquear estas herramientas exclusivas:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { icon: Users, text: "Dashboard de Equipo Compartido" },
                          { icon: SendHorizontal, text: "Carpeta Digital Colaborativa" },
                          { icon: BrainCircuit, text: "Auditoría IA de Anexos PDF" },
                          { icon: ShieldCheck, text: "Soporte Estratégico 24/7" },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs font-black uppercase">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <item.icon className="h-4 w-4" />
                            </div>
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
                        <Button asChild size="lg" className="w-full sm:w-auto bg-white text-accent hover:bg-gray-100 font-black uppercase italic h-14 px-10 gap-2 shadow-2xl">
                          <a href={WHATSAPP_URL} target="_blank">
                            <MessageCircle className="h-5 w-5" /> Activar Plan Empresas
                          </a>
                        </Button>
                        <p className="text-xs font-black uppercase tracking-widest opacity-80 italic flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 animate-pulse" /> Soporte vía WhatsApp 24/7
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-8">
                  <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-white/10 p-8">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="h-6 w-6 text-accent" />
                        <CardTitle className="text-2xl font-black italic uppercase tracking-widest">Análisis del Equipo</CardTitle>
                      </div>
                      <p className="text-xl font-medium leading-relaxed italic">"{analysis.strategicAdvice}"</p>
                    </CardHeader>
                    <CardContent className="p-8 bg-black/5">
                      <div className="flex items-start gap-4">
                        <Info className="h-5 w-5 text-accent shrink-0 mt-1" />
                        <p className="text-sm font-medium opacity-80 leading-relaxed italic">{analysis.reasoning}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-none shadow-lg bg-red-50/50">
                      <CardHeader>
                        <CardTitle className="text-red-700 flex items-center gap-3 uppercase font-black italic text-lg">
                          <AlertTriangle className="h-6 w-6" /> Riesgos Críticos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {analysis.strategicAlerts.map((alert, i) => (
                          <div key={i} className="p-4 bg-white rounded-xl border-l-4 border-l-red-600 shadow-sm">
                            <p className="text-xs font-bold text-red-900 leading-relaxed uppercase">{alert}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-3 uppercase font-black italic text-lg">
                          <CheckSquare className="h-6 w-6 text-accent" /> Documentación
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {analysis.formChecklist.map((form, i) => (
                          <div key={i} className="p-4 bg-muted/20 rounded-xl border space-y-2 group hover:bg-white hover:shadow-md transition-all">
                            <h4 className="font-black text-primary uppercase text-[11px]">{form.formName}</h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-bold italic">{form.purpose}</p>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {form.dataRequired.map((d, j) => (
                                <Badge key={j} variant="outline" className="bg-white text-[8px] font-black uppercase">{d}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden sticky top-24">
            <CardHeader className="bg-primary text-white p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" /> Motor IA
                </CardTitle>
                <Badge variant="outline" className={cn(
                  "font-black text-[8px]",
                  isDemo ? "border-orange-400 text-orange-400" : "border-accent text-accent animate-pulse"
                )}>
                  {isDemo ? `DEMO: ${DEMO_AI_LIMIT - demoUsage} CRÉDITOS` : 'CORPORATIVO'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {!analysis ? (
                <div className="space-y-6">
                  {isLimitReached ? (
                    <div className="text-center py-6 bg-red-50 rounded-2xl border border-red-100 px-4 space-y-4">
                      <LockKeyhole className="h-10 w-10 text-red-600 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="font-black text-red-900 uppercase italic text-xs">Créditos de Prueba Agotados</h4>
                        <p className="text-[10px] text-red-700 font-bold leading-tight">
                          Has alcanzado el límite de {DEMO_AI_LIMIT} análisis para el modo Demo. Contacta soporte para activar tu plan corporativo ilimitado.
                        </p>
                      </div>
                      <Button asChild className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black uppercase italic h-12 text-xs">
                        <a href={WHATSAPP_URL} target="_blank">
                          Activar Plan Empresas
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BrainCircuit className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-black text-primary mb-2 uppercase italic text-xs">Análisis no ejecutado</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed font-bold">
                        Activa la IA para detectar requisitos ocultos y riesgos de inadmisibilidad.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid gap-3">
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 font-black h-14 text-lg gap-3 shadow-lg uppercase italic" 
                      onClick={() => handleAnalyze('fast')} 
                      disabled={loadingAI || isLimitReached}
                    >
                      {loadingAI ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5" />}
                      Escanear Portal
                    </Button>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full border-accent text-accent font-black h-12 gap-2 uppercase italic"
                          disabled={isLimitReached}
                        >
                          <FileText className="h-4 w-4" /> Entrenar con PDF
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black text-primary uppercase italic">Análisis Profundo de Bases</DialogTitle>
                          <DialogDescription className="text-md font-medium">
                            Pega el texto extraído de las bases administrativas para que la IA identifique multas, garantías y requisitos específicos de tu rubro.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Textarea 
                            placeholder="Contenido de las bases..." 
                            className="min-h-[300px] font-mono text-xs p-4 bg-muted/30 border-2"
                            value={manualText}
                            onChange={(e) => setManualText(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button 
                            className="bg-accent hover:bg-accent/90 font-black w-full h-14 text-lg uppercase italic shadow-xl" 
                            onClick={() => handleAnalyze('deep')} 
                            disabled={!manualText || loadingAI || isLimitReached}
                          >
                            {loadingAI ? <Loader2 className="animate-spin" /> : <Sparkles />}
                            Generar Inteligencia
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {analysis.timeline && (
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Hitos de Equipo
                      </h5>
                      <div className="space-y-2">
                        {analysis.timeline.map((item, i) => (
                          <div key={i} className={cn(
                            "p-3 rounded-xl border flex justify-between items-center transition-all shadow-sm",
                            item.criticality === 'alta' ? "bg-red-50 border-red-200" : "bg-white"
                          )}>
                             <div className="min-w-0 flex-1">
                               <p className="text-[9px] font-black uppercase text-muted-foreground truncate">{item.event}</p>
                               <p className="text-xs font-black text-primary">{item.date}</p>
                             </div>
                             {item.criticality === 'alta' && <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse shrink-0 ml-2" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-6 border-t">
                    <Button variant="ghost" className="w-full text-[10px] font-black text-muted-foreground hover:text-primary uppercase italic" onClick={() => { setAnalysis(null); setActiveTab("description"); }}>
                      Volver a Analizar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={cn("block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>{children}</label>;
}
