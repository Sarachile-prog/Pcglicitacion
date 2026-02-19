"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { extractAndSummarizeBidDetails, PostulationAdvisorOutput } from "@/ai/flows/extract-and-summarize-bid-details"
import { getBidDetail } from "@/services/mercado-publico"
import { useState, useEffect, useRef } from "react"
import { 
  Building2, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  Calendar,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Zap,
  ShieldCheck,
  SendHorizontal,
  BrainCircuit,
  MessageCircle,
  Package,
  Info
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore"

export default function BidDetailPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [loadingAI, setLoadingAI] = useState(false)
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false)
  const [manualText, setManualText] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("description")
  const hasAttemptedFetch = useRef(false)

  const bidRef = useMemoFirebase(() => db && bidId ? doc(db, "bids", bidId) : null, [db, bidId])
  const { data: bid, isLoading: isDocLoading } = useDoc(bidRef)

  const profileRef = useMemoFirebase(() => user ? doc(db!, "users", user.uid) : null, [db, user])
  const { data: profile } = useDoc(profileRef)

  const companyRef = useMemoFirebase(() => profile?.companyId ? doc(db!, "companies", profile.companyId) : null, [db, profile])
  const { data: company } = useDoc(companyRef)

  const bookmarkRef = useMemoFirebase(() => profile?.companyId && bidId ? doc(db!, "companies", profile.companyId, "bookmarks", bidId) : null, [db, profile, bidId])
  const { data: bookmark } = useDoc(bookmarkRef)

  useEffect(() => {
    if (bid && !bid.description && !isRefreshingDetail && !hasAttemptedFetch.current) {
      hasAttemptedFetch.current = true
      setIsRefreshingDetail(true)
      getBidDetail(bid.id).finally(() => setIsRefreshingDetail(false))
    }
  }, [bid, isRefreshingDetail])

  const handleToggleFollow = async () => {
    if (!user || !profile?.companyId || !bid || !bookmarkRef) return
    try {
      if (bookmark) {
        await deleteDoc(bookmarkRef)
        toast({ title: "Eliminado de Cartera" })
      } else {
        await setDoc(bookmarkRef, {
          bidId: bid.id,
          title: bid.title,
          entity: bid.entity || "No especificada",
          status: bid.status,
          type: bid.type || "Licitación",
          preparationStatus: "En Estudio",
          savedAt: new Date().toISOString(),
          aiAnalysis: bid.aiAnalysis || null
        })
        toast({ title: "Guardado en Equipo" })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error de permisos" })
    }
  }

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    if (!bid || !bidRef || !profileRef) return
    setLoadingAI(true)
    if (mode === 'deep') setIsDialogOpen(false)

    try {
      toast({ title: "Motor IA Iniciado" })
      const contextText = mode === 'deep' ? manualText : (bid.description || bid.title)
      const result = await extractAndSummarizeBidDetails({ bidId: bid.id, bidDocumentText: contextText, useLivePortal: true })
      
      await updateDoc(bidRef, { aiAnalysis: result, lastAnalyzedAt: new Date().toISOString() })
      if (bookmarkRef && bookmark) await updateDoc(bookmarkRef, { aiAnalysis: result })
      if (!profile?.companyId) await updateDoc(profileRef, { demoUsageCount: increment(1) })

      setActiveTab("ai-advisor")
      toast({ title: "Análisis Completado" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error IA", description: error.message })
    } finally {
      setLoadingAI(false)
    }
  }

  if (isDocLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
  if (!bid) return <div className="text-center py-20"><AlertTriangle className="mx-auto mb-4" /><h2 className="text-2xl font-bold">Licitación no encontrada</h2></div>

  const analysis = bid.aiAnalysis as PostulationAdvisorOutput | null

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Link href="/bids"><Button variant="ghost" size="sm" className="text-muted-foreground"><ChevronLeft className="h-4 w-4 mr-1" /> Volver</Button></Link>
        <div className="flex gap-2">
          {bookmark && <Link href={`/bids/${bidId}/apply`}><Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 uppercase italic text-xs"><SendHorizontal className="h-4 w-4" /> Preparar Oferta</Button></Link>}
          <Button variant={bookmark ? "default" : "outline"} size="sm" onClick={handleToggleFollow} className={cn("gap-2 uppercase font-black italic", bookmark ? "bg-accent" : "border-accent text-accent")}>
            {bookmark ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{bookmark ? "En Cartera" : "Seguir"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border-2 border-primary/5 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-xs font-black uppercase border-primary/20">ID: {bid.id}</Badge>
              <Badge className="text-xs font-black uppercase bg-primary text-white py-1 px-4">{bid.status || 'NO DEFINIDO'}</Badge>
              {bid.type && (
                <Badge className="bg-indigo-600 text-white gap-1 px-3 py-1 text-[10px] font-black uppercase italic shadow-md">
                  <Info className="h-3 w-3" /> {bid.type}
                </Badge>
              )}
              {analysis && (
                <Badge className="bg-accent text-white gap-1 px-3 py-1 text-[10px] font-black uppercase italic shadow-[0_0_15px_rgba(38,166,154,0.4)] animate-pulse">
                  <Sparkles className="h-3 w-3 fill-white" /> Inteligencia IA Activa
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-black text-primary uppercase italic tracking-tighter leading-tight">{bid.title}</h1>
          </div>
          <div className="flex flex-col items-end gap-2 bg-primary/5 p-4 rounded-2xl border">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Suscripción</p>
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" /><p className="text-2xl font-black text-primary uppercase italic">{company?.plan || 'Demo'}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="flex items-center gap-4"><Building2 className="h-5 w-5 text-primary" /><div><p className="text-[10px] uppercase font-black opacity-60">Institución</p><p className="text-sm font-bold uppercase">{bid.entity || "No especificada"}</p></div></div>
          <div className="flex items-center gap-4"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-[10px] uppercase font-black opacity-60">Cierre</p><p className="text-sm font-bold">{bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString('es-CL') : '---'}</p></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted p-1 h-14 mb-6">
              <TabsTrigger value="description" className="px-8 font-black text-[10px] uppercase">Descripción</TabsTrigger>
              <TabsTrigger value="items" className="px-8 font-black text-[10px] uppercase">Ítems</TabsTrigger>
              {analysis && (
                <TabsTrigger 
                  value="ai-advisor" 
                  className="px-8 font-black text-[10px] uppercase text-accent border-2 border-accent bg-accent/5 data-[state=active]:bg-accent data-[state=active]:text-white shadow-lg transition-all"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Inteligencia IA
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardContent className="pt-8">
                  <div className="text-md leading-relaxed whitespace-pre-wrap text-muted-foreground font-medium">{bid.description || "Sin descripción disponible."}</div>
                  <Button asChild variant="outline" className="mt-6 gap-2 border-primary text-primary font-black uppercase italic"><a href={bid.sourceUrl} target="_blank">Ver en Portal Oficial <ExternalLink className="h-4 w-4" /></a></Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardContent className="pt-8">
                  {bid.items?.length ? (
                    <div className="divide-y">
                      {bid.items.map((item: any, i: number) => (
                        <div key={i} className="py-4 flex items-center gap-4">
                          <Package className="h-5 w-5 text-primary opacity-20" />
                          <div className="flex-1"><p className="font-bold text-sm uppercase italic">{item.NombreProducto}</p><p className="text-[10px] text-muted-foreground italic">{item.Descripcion}</p></div>
                          <Badge variant="secondary" className="font-black">{item.Cantidad} {item.UnidadMedida}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : <p className="py-10 text-center italic text-muted-foreground">No hay ítems declarados.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-advisor" className="space-y-8 animate-in slide-in-from-bottom-4">
              {analysis && (
                <div className="space-y-6">
                  <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-white/10 p-8"><CardTitle className="text-xl font-black italic uppercase text-accent flex items-center gap-2"><Sparkles className="h-5 w-5" /> Consejo Estratégico</CardTitle><p className="text-xl font-medium italic mt-2">"{analysis.strategicAdvice}"</p></CardHeader>
                    <CardContent className="p-8"><p className="text-sm opacity-80">{analysis.reasoning}</p></CardContent>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-red-50/50"><CardHeader><CardTitle className="text-red-700 text-sm font-black uppercase">Riesgos</CardTitle></CardHeader><CardContent className="space-y-2">{analysis.strategicAlerts.map((a, i) => <div key={i} className="p-3 bg-white border-l-4 border-red-600 text-[10px] font-bold uppercase">{a}</div>)}</CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-primary text-sm font-black uppercase">Documentación</CardTitle></CardHeader><CardContent className="space-y-2">{analysis.formChecklist.map((f, i) => <div key={i} className="p-3 bg-muted/20 border rounded-lg"><p className="font-black text-[10px] uppercase">{f.formName}</p><p className="text-[9px] text-muted-foreground italic">{f.purpose}</p></div>)}</CardContent></Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4">
          <Card className="border-2 border-primary/20 shadow-2xl sticky top-24">
            <CardHeader className="bg-primary text-white p-6"><CardTitle className="text-lg font-black uppercase flex items-center gap-2"><Zap className="h-5 w-5 text-accent" /> Motor IA</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-6 text-center">
              <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto"><BrainCircuit className="h-8 w-8 text-primary" /></div>
              <div className="grid gap-3">
                <Button 
                  className={cn(
                    "w-full font-black h-14 uppercase italic shadow-lg transition-all",
                    analysis ? "bg-emerald-600 hover:bg-emerald-700" : "bg-accent hover:bg-accent/90"
                  )} 
                  onClick={() => handleAnalyze('fast')} 
                  disabled={loadingAI || isRefreshingDetail}
                >
                  {loadingAI ? <Loader2 className="animate-spin" /> : <Zap className="h-5 w-5 mr-2" />} 
                  {analysis ? "Refrescar Análisis" : "Ejecutar Análisis"}
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild><Button variant="outline" className="w-full border-accent text-accent font-black h-12 uppercase italic">Análisis Profundo (Bases)</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic">Análisis Profundo</DialogTitle></DialogHeader>
                    <Textarea placeholder="Pega aquí el texto de las bases..." className="min-h-[300px] text-xs p-4 bg-muted/30" value={manualText} onChange={(e) => setManualText(e.target.value)} />
                    <DialogFooter><Button className="bg-accent w-full h-14 font-black uppercase italic" onClick={() => handleAnalyze('deep')} disabled={!manualText || loadingAI}>{loadingAI ? <Loader2 className="animate-spin" /> : "Analizar Bases"}</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}