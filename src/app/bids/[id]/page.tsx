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
  Info,
  FileUp,
  FileCheck,
  Trash2,
  Plus
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore"

// Extender tiempo de respuesta para el análisis multimodal pesado (120 segundos)
export const maxDuration = 120;

// FUNCIÓN DE PERSISTENCIA PARA DATA HEALING
const isEntityMissing = (entity: string | undefined) => {
  if (!entity) return true;
  const pendingStrings = [
    "Pendiente Enriquecimiento", 
    "Institución no especificada", 
    "Pendiente Datos...", 
    "Pendiente",
    "NO ESPECIFICADA"
  ];
  return pendingStrings.some(ps => entity.toUpperCase().includes(ps.toUpperCase()));
}

export default function BidDetailPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [loadingAI, setLoadingAI] = useState(false)
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false)
  const [manualText, setManualText] = useState("")
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("description")
  const hasAttemptedFetch = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.type !== 'application/pdf') {
      toast({ variant: "destructive", title: "Formato Incorrecto", description: "Solo se permiten archivos PDF." })
      return
    }

    if (file.size > 40 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Archivo Muy Pesado", description: "El PDF supera el límite de 40MB." })
      return
    }

    setPdfFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      setPdfDataUri(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    if (!bid || !bidRef || !profileRef) return
    setLoadingAI(true)
    if (mode === 'deep') setIsDialogOpen(false)

    try {
      toast({ title: "Motor IA Iniciado", description: mode === 'deep' ? "Extrayendo datos y analizando PDF..." : "Analizando portal oficial..." })
      
      const contextText = mode === 'deep' ? manualText : (bid.description || bid.title)
      const pdfToProcess = mode === 'deep' ? pdfDataUri : null

      const result = await extractAndSummarizeBidDetails({ 
        bidId: bid.id, 
        bidDocumentText: contextText, 
        pdfDataUri: pdfToProcess || undefined,
        useLivePortal: true 
      })
      
      // LOGICA DE AUTO-CURACIÓN (DATA HEALING)
      const updatePayload: any = { 
        aiAnalysis: result, 
        lastAnalyzedAt: new Date().toISOString() 
      }

      // Si la institución falta, la IA la cura
      if (isEntityMissing(bid.entity) && result.identifiedInstitution) {
        updatePayload.entity = result.identifiedInstitution;
      }

      // Si el monto es 0, intentamos usar el numérico de la IA
      if ((!bid.amount || bid.amount === 0) && result.numericAmount) {
        updatePayload.amount = result.numericAmount;
      }

      await updateDoc(bidRef, updatePayload)
      if (bookmarkRef && bookmark) {
        await updateDoc(bookmarkRef, { 
          aiAnalysis: result,
          entity: updatePayload.entity || bookmark.entity
        })
      }
      
      if (!profile?.companyId) await updateDoc(profileRef, { demoUsageCount: increment(1) })

      setActiveTab("ai-advisor")
      toast({ title: "Análisis y Curación Completa", description: "La IA ha reparado los datos faltantes del proceso." })
      setPdfDataUri(null)
      setPdfFileName(null)
      setManualText("")
    } catch (error: any) {
      if (error.message?.includes("exceeded")) {
        toast({ 
          variant: "destructive", 
          title: "Error de Tamaño", 
          description: "Archivo demasiado grande. Prueba con un PDF más ligero." 
        })
      } else {
        toast({ variant: "destructive", title: "Error IA", description: error.message || "Error de tiempo de ejecución." })
      }
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
          {bookmark && <Link href={`/bids/${bidId}/apply`}><Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 uppercase italic text-xs shadow-lg"><SendHorizontal className="h-4 w-4" /> Preparar Oferta</Button></Link>}
          <Button variant={bookmark ? "default" : "outline"} size="sm" onClick={handleToggleFollow} className={cn("gap-2 uppercase font-black italic shadow-md", bookmark ? "bg-accent" : "border-accent text-accent")}>
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
          <div className="flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", isEntityMissing(bid.entity) ? "bg-red-50 text-red-500" : "bg-primary/5 text-primary")}>
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black opacity-60">Institución Responsable</p>
              <p className={cn("text-sm font-bold uppercase", isEntityMissing(bid.entity) && "text-red-600 animate-pulse")}>
                {bid.entity || "NO ESPECIFICADA"}
              </p>
              {isEntityMissing(bid.entity) && <p className="text-[8px] font-black text-red-400 uppercase mt-0.5 tracking-widest">Ejecuta Motor IA para Auto-Curar este dato</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0"><Calendar className="h-6 w-6" /></div>
            <div><p className="text-[10px] uppercase font-black opacity-60">Cierre de Ofertas</p><p className="text-sm font-bold">{bid.deadlineDate ? new Date(bid.deadlineDate).toLocaleDateString('es-CL') : '---'}</p></div>
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
                  <Card className="bg-primary text-white border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
                    <CardHeader className="bg-white/10 p-8">
                      <CardTitle className="text-2xl font-black italic uppercase text-accent flex items-center gap-2"><Sparkles className="h-6 w-6" /> Consejo Estratégico</CardTitle>
                      <p className="text-xl font-medium italic mt-4 leading-relaxed">"{analysis.strategicAdvice}"</p>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase text-accent mb-1">Institución Detectada</p>
                          <p className="text-lg font-black italic">{analysis.identifiedInstitution}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase text-accent mb-1">Monto Presupuestado</p>
                          <p className="text-lg font-black italic">{analysis.monetaryAmount}</p>
                        </div>
                      </div>
                      <p className="text-sm opacity-80 italic font-medium">RAZONAMIENTO: {analysis.reasoning}</p>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-red-50/50 border-2 border-red-100 rounded-3xl overflow-hidden">
                      <CardHeader className="bg-red-100/50"><CardTitle className="text-red-700 text-sm font-black uppercase italic">Alertas de Riesgo</CardTitle></CardHeader>
                      <CardContent className="space-y-3 p-6">{analysis.strategicAlerts.map((a, i) => <div key={i} className="p-4 bg-white rounded-2xl border-l-4 border-red-600 shadow-sm text-[10px] font-bold uppercase italic">{a}</div>)}</CardContent>
                    </Card>
                    <Card className="border-2 border-primary/5 rounded-3xl overflow-hidden">
                      <CardHeader className="bg-primary/5"><CardTitle className="text-primary text-sm font-black uppercase italic">Carpeta de Documentos</CardTitle></CardHeader>
                      <CardContent className="space-y-3 p-6">{analysis.formChecklist.map((f, i) => <div key={i} className="p-4 bg-muted/20 border-2 border-white rounded-2xl shadow-sm"><p className="font-black text-[10px] uppercase text-primary mb-1">{f.formName}</p><p className="text-[9px] text-muted-foreground italic font-medium">{f.purpose}</p></div>)}</CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4">
          <Card className="border-2 border-primary/20 shadow-2xl sticky top-24 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary text-white p-6">
              <CardTitle className="text-lg font-black uppercase italic tracking-widest flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" /> Motor de Análisis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-center">
              <div className="h-20 w-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto transform -rotate-6 border-2 border-primary/10 shadow-inner">
                <BrainCircuit className="h-10 w-10 text-primary" />
              </div>
              <div className="grid gap-4">
                <Button 
                  className={cn(
                    "w-full font-black h-14 uppercase italic shadow-lg transition-all rounded-2xl text-md",
                    analysis ? "bg-emerald-600 hover:bg-emerald-700" : "bg-accent hover:bg-accent/90"
                  )} 
                  onClick={() => handleAnalyze('fast')} 
                  disabled={loadingAI || isRefreshingDetail}
                >
                  {loadingAI ? <Loader2 className="animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />} 
                  {analysis ? "Refrescar Análisis" : "Ejecutar Motor IA"}
                </Button>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-accent text-accent font-black h-12 uppercase italic rounded-2xl hover:bg-accent/5">
                      Análisis de Bases (PDF)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-3xl border-4 border-primary/5 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-3xl font-black uppercase italic text-primary tracking-tighter">Análisis Multimodal</DialogTitle>
                      <DialogDescription className="font-medium italic">Sube el PDF de las bases para detectar requisitos ocultos y auto-curar datos (Máx 40MB).</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-6">
                      <div className="py-16 border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-6 bg-muted/5 relative">
                         {pdfFileName ? (
                           <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
                             <div className="h-20 w-20 bg-emerald-50 rounded-3xl shadow-xl flex items-center justify-center text-emerald-600 border-2 border-emerald-100">
                               <FileCheck className="h-10 w-10" />
                             </div>
                             <div className="text-center">
                               <p className="text-sm font-black text-primary uppercase italic">{pdfFileName}</p>
                               <button onClick={() => { setPdfDataUri(null); setPdfFileName(null); }} className="text-[10px] font-black text-red-500 uppercase italic hover:underline mt-1 flex items-center gap-1 mx-auto">
                                 <Trash2 className="h-3 w-3" /> Eliminar y cambiar
                               </button>
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="h-24 w-24 rounded-[2rem] bg-white shadow-2xl flex items-center justify-center transform -rotate-6 transition-transform hover:rotate-0">
                               <FileUp className="h-12 w-12 text-accent" />
                             </div>
                             <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                             <Button onClick={() => fileInputRef.current?.click()} className="h-14 px-10 font-black uppercase italic rounded-2xl bg-primary text-lg shadow-xl hover:scale-105 transition-transform">
                               <Plus className="mr-2 h-5 w-5" /> Seleccionar Bases PDF
                             </Button>
                             <p className="text-[10px] font-black uppercase text-muted-foreground italic tracking-widest">Formato PDF • Máx 40MB</p>
                           </>
                         )}
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase"><span className="bg-white px-4 text-muted-foreground">Opcional</span></div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-60 ml-1">Instrucciones Manuales o Texto</label>
                        <Textarea 
                          placeholder="Pega texto de las bases aquí o instrucciones específicas para la IA..." 
                          className="min-h-[120px] text-xs p-4 bg-muted/20 rounded-2xl border-none font-medium italic" 
                          value={manualText} 
                          onChange={(e) => setManualText(e.target.value)} 
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button 
                        className="bg-accent w-full h-16 font-black uppercase italic text-xl shadow-2xl rounded-2xl transform active:scale-95 transition-all" 
                        onClick={() => handleAnalyze('deep')} 
                        disabled={(!manualText && !pdfDataUri) || loadingAI}
                      >
                        {loadingAI ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Sparkles className="mr-3 h-6 w-6 fill-white" />} 
                        {loadingAI ? "Analizando Documento..." : "Ejecutar Motor Multimodal"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-muted-foreground italic font-medium">El análisis profundo con PDF permite detectar requisitos críticos y reparar la ficha técnica.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
