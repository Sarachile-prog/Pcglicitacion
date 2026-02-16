
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
  Sparkles, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  Calendar,
  ExternalLink,
  RefreshCw,
  Info,
  Bookmark,
  BookmarkCheck,
  FileText,
  CheckSquare,
  Zap,
  Database,
  Users,
  SendHorizontal,
  ShieldCheck,
  ArrowUpRight,
  LockKeyhole,
  MessageCircle,
  Scale,
  Coins
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getBidDetail } from "@/services/mercado-publico"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore"

const WHATSAPP_URL = "https://wa.me/56941245316?text=Hola,%20necesito%20comprar%20créditos%20de%20análisis%20IA%20para%20PCG%20Licitación.";

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

  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !profile?.companyId || !bidId) return null
    return doc(db, "companies", profile.companyId, "bookmarks", bidId)
  }, [db, profile, bidId])

  const { data: bookmark } = useDoc(bookmarkRef)

  const userCredits = profile?.aiCredits || 0;
  const hasCredits = userCredits > 0;

  useEffect(() => {
    if (bid?.aiAnalysis) {
      setAnalysis(bid.aiAnalysis as PostulationAdvisorOutput)
      if (activeTab !== "ai-advisor") {
        setActiveTab("ai-advisor")
      }
    }
  }, [bid])

  const handleRefreshData = async (showToast = true) => {
    setIsRefreshing(true)
    try {
      const liveData = await getBidDetail(bidId)
      if (liveData && showToast) {
        toast({ title: "Datos Actualizados", description: "Se han sincronizado los detalles extendidos." })
      }
    } catch (error) {
      if (showToast) toast({ variant: "destructive", title: "Error", description: "Fallo de conexión." })
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
        await setDoc(bookmarkRef, {
          bidId: bid.id,
          title: bid.title,
          entity: bid.entity || "No especificada",
          status: bid.status,
          preparationStatus: "En Estudio",
          savedAt: new Date().toISOString(),
          aiAnalysis: analysis || bid.aiAnalysis || null
        })
        toast({ title: "Guardado en Equipo", description: "Colaboración habilitada." })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." })
    }
  }

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    if (!bid || !bidRef || !profileRef) return

    if (!hasCredits) {
      toast({ 
        variant: "destructive", 
        title: "Sin Créditos", 
        description: "No tienes análisis disponibles. Recarga tu cuenta para continuar." 
      })
      return
    }

    setLoadingAI(true)
    if (mode === 'deep') setIsDialogOpen(false)

    try {
      toast({ title: "Motor IA Iniciado", description: "Descontando 1 crédito de tu balance..." })
      const contextText = mode === 'deep' ? manualText : (bid.description || bid.title)
      const result = await extractAndSummarizeBidDetails({ 
        bidId: bid.id,
        bidDocumentText: contextText,
        useLivePortal: true
      })
      
      await updateDoc(bidRef, { aiAnalysis: result, lastAnalyzedAt: new Date().toISOString() })
      await updateDoc(profileRef, { aiCredits: increment(-1) })

      if (bookmarkRef && bookmark) {
        await updateDoc(bookmarkRef, { aiAnalysis: result })
      }

      setAnalysis(result)
      setActiveTab("ai-advisor")
      toast({ title: "Análisis Completado", description: "Inteligencia generada con éxito." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setLoadingAI(false)
    }
  }

  if (isDocLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>

  if (!bid) return <div className="text-center py-20"><AlertTriangle className="mx-auto mb-4" /><h2 className="text-2xl font-bold">No encontrado</h2></div>

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes('publicada') || s?.includes('abierta')) return 'bg-emerald-600';
    if (s?.includes('adjudicada')) return 'bg-blue-600';
    if (s?.includes('desierta') || s?.includes('cancelada')) return 'bg-red-600';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
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
              "gap-2 uppercase font-black italic", 
              bookmark ? "bg-accent" : "border-accent text-accent"
            )}
          >
            {bookmark ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {bookmark ? "En Cartera" : "Seguir Licitación"}
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
            </div>
            <h1 className="text-4xl font-black text-primary leading-tight uppercase italic tracking-tighter">
              {bid.title}
            </h1>
          </div>
          
          <div className="flex flex-col items-end gap-2 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Balance de Cuenta</p>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-accent" />
              <p className="text-3xl font-black text-primary leading-none">{userCredits}</p>
            </div>
            <p className="text-[9px] font-black text-accent uppercase italic">Créditos de Análisis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
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
              <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Cierre de Ofertas</p>
              <p className="text-sm font-bold text-primary">
                {bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString() : 'No definido'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted p-1 h-14 mb-6">
              <TabsTrigger value="description" className="px-8 font-black text-[10px] uppercase">Descripción</TabsTrigger>
              <TabsTrigger value="items" className="px-8 font-black text-[10px] uppercase">Ítems</TabsTrigger>
              {analysis && (
                <TabsTrigger value="ai-advisor" className="px-8 font-black text-[10px] uppercase text-accent border-2 border-accent/20">
                  <Sparkles className="h-4 w-4 mr-2" /> Inteligencia IA
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="animate-in fade-in space-y-6">
              <Card className="border-none shadow-lg">
                <CardContent className="pt-8 space-y-6">
                  <div className="text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground font-medium">
                    {bid.description || "Sin descripción detallada."}
                  </div>
                  <Button asChild variant="outline" className="gap-2 border-primary text-primary font-black uppercase italic">
                    <a href={bid.sourceUrl} target="_blank">Ficha Oficial <ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-advisor" className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="space-y-8">
                <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden">
                  <CardHeader className="bg-white/10 p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="h-6 w-6 text-accent" />
                      <CardTitle className="text-2xl font-black italic uppercase tracking-widest">Consejo Estratégico</CardTitle>
                    </div>
                    <p className="text-xl font-medium leading-relaxed italic">"{analysis.strategicAdvice}"</p>
                  </CardHeader>
                  <CardContent className="p-8">
                    <p className="text-sm font-medium opacity-80 italic">{analysis.reasoning}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-none shadow-lg bg-red-50/50">
                    <CardHeader><CardTitle className="text-red-700 text-lg uppercase font-black italic">Riesgos de Descalificación</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {analysis.strategicAlerts.map((alert, i) => (
                        <div key={i} className="p-4 bg-white rounded-xl border-l-4 border-l-red-600 shadow-sm text-xs font-bold text-red-900 uppercase">{alert}</div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader><CardTitle className="text-primary text-lg uppercase font-black italic">Documentación Requerida</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {analysis.formChecklist.map((form, i) => (
                        <div key={i} className="p-4 bg-muted/20 rounded-xl border space-y-2">
                          <h4 className="font-black text-primary uppercase text-[11px]">{form.formName}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold italic">{form.purpose}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden sticky top-24">
            <CardHeader className="bg-primary text-white p-6">
              <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" /> Motor de Análisis IA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-center">
              {!hasCredits && !analysis ? (
                <div className="space-y-6">
                  <LockKeyhole className="h-12 w-12 text-red-600 mx-auto" />
                  <div className="space-y-2">
                    <h4 className="font-black text-primary uppercase italic text-sm">Créditos Agotados</h4>
                    <p className="text-xs text-muted-foreground font-bold leading-relaxed">
                      Este análisis profundo requiere 1 crédito de análisis. Tu balance actual es 0.
                    </p>
                  </div>
                  <Button asChild className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black uppercase italic h-14">
                    <a href={WHATSAPP_URL} target="_blank"><MessageCircle className="h-5 w-5 mr-2" /> Comprar Créditos</a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                  </div>
                  <div className="grid gap-3">
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 font-black h-14 text-lg gap-3 shadow-lg uppercase italic" 
                      onClick={() => handleAnalyze('fast')} 
                      disabled={loadingAI}
                    >
                      {loadingAI ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5" />}
                      Ejecutar Análisis
                    </Button>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full border-accent text-accent font-black h-12 uppercase italic" disabled={loadingAI}>
                          Entrenar con PDF (Opcional)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black text-primary uppercase italic">Análisis Profundo</DialogTitle>
                          <DialogDescription>Pega el texto de las bases para identificar multas y garantías.</DialogDescription>
                        </DialogHeader>
                        <Textarea 
                          placeholder="Pega el texto aquí..." 
                          className="min-h-[300px] font-mono text-xs p-4 bg-muted/30 border-2"
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                        />
                        <DialogFooter>
                          <Button className="bg-accent hover:bg-accent/90 font-black w-full h-14 uppercase italic shadow-xl" onClick={() => handleAnalyze('deep')} disabled={!manualText || loadingAI}>
                            {loadingAI ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />} Consumir Crédito y Analizar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase italic tracking-widest">
                    Balance: {userCredits} créditos restantes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
