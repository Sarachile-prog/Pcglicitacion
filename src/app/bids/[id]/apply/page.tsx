"use client"

import { useParams, useRouter } from "next/navigation"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Loader2, 
  ChevronLeft, 
  ShieldCheck, 
  CheckCircle2, 
  BrainCircuit,
  Zap,
  AlertTriangle,
  Upload,
  Download,
  FileSearch,
  CheckCircle,
  FileWarning,
  Trash2,
  FileUp,
  FileCheck,
  Cloud,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import { auditBidProposal, AuditOutput } from "@/ai/flows/audit-bid-proposal"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface AnnexDocument {
  name: string;
  purpose: string;
  status: 'pending' | 'uploaded' | 'error';
  fileDataUri?: string | null;
  fileName?: string | null;
  auditResult?: AuditOutput | null;
}

const PREPARATION_STATUSES = ["En Estudio", "En Preparación", "Lista para Envío", "Presentada", "Finalizada"];

export default function BidApplyPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedAnnex, setSelectedAnnex] = useState<AnnexDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !profile?.companyId || !bidId) return null
    return doc(db, "companies", profile.companyId, "bookmarks", bidId)
  }, [db, profile, bidId])

  const { data: bookmark, isLoading: isBookmarkLoading } = useDoc(bookmarkRef)
  const { data: bid, isLoading: isBidLoading } = useDoc(useMemoFirebase(() => db && bidId ? doc(db, "bids", bidId) : null, [db, bidId]))

  const currentAnnexes = useMemo(() => {
    if (bookmark?.annexes && bookmark.annexes.length > 0) return bookmark.annexes as AnnexDocument[];
    
    const analysis = (bookmark as any)?.aiAnalysis || bid?.aiAnalysis || null;
    if (analysis?.formChecklist) {
      return analysis.formChecklist.map((f: any) => ({
        name: f.formName,
        purpose: f.purpose,
        status: 'pending',
        fileDataUri: null,
        fileName: null,
        auditResult: null
      })) as AnnexDocument[];
    }
    return [] as AnnexDocument[];
  }, [bookmark, bid]);

  const stats = useMemo(() => {
    const total = currentAnnexes.length;
    const uploaded = currentAnnexes.filter(a => a.status !== 'pending').length;
    const ready = currentAnnexes.filter(a => a.status === 'uploaded' && a.auditResult?.isReady).length;
    const toCorrect = currentAnnexes.filter(a => a.status === 'error').length;
    return { total, uploaded, ready, toCorrect };
  }, [currentAnnexes]);

  const handleStatusChange = async (newStatus: string) => {
    if (!bookmarkRef) return
    setIsSyncing(true)
    try {
      await updateDoc(bookmarkRef, { preparationStatus: newStatus })
      toast({ title: "Estado Actualizado" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado." })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedAnnex || !bookmarkRef) return
    
    setIsUploading(true)
    setIsSyncing(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64String = event.target?.result as string
        const updatedAnnexes = currentAnnexes.map(a => 
          a.name === selectedAnnex.name 
            ? { ...a, fileDataUri: base64String, fileName: file.name, status: 'uploaded' as const, auditResult: null } 
            : a
        )
        
        await updateDoc(bookmarkRef, { 
          annexes: updatedAnnexes,
          preparationStatus: (bookmark as any)?.preparationStatus === "En Estudio" ? "En Preparación" : (bookmark as any)?.preparationStatus
        })
        toast({ title: "Documento Guardado" })
        setIsDialogOpen(false)
        setSelectedAnnex(null)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo subir el archivo." })
    } finally {
      setIsUploading(false)
      setIsSyncing(false)
    }
  }

  const handleAuditAnnex = async (annex: AnnexDocument) => {
    if (!annex.fileDataUri || !bookmarkRef) return

    setIsAuditing(true)
    setIsSyncing(true)
    try {
      const strategicContext = (bookmark as any)?.aiAnalysis || bid?.aiAnalysis || {}
      const result = await auditBidProposal({ bidId, fileDataUri: annex.fileDataUri, strategicContext })

      const updatedAnnexes = currentAnnexes.map(a => 
        a.name === annex.name 
          ? { ...a, auditResult: result, status: result?.isReady ? 'uploaded' : 'error' as const } 
          : a
      )

      await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
      toast({ title: result?.isReady ? "Validación Exitosa" : "Hallazgos Detectados" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error IA", description: error.message })
    } finally {
      setIsAuditing(false)
      setIsSyncing(false)
    }
  }

  const handleDeleteAnnex = async (annexName: string) => {
    if (!bookmarkRef) return
    setIsSyncing(true)
    const updatedAnnexes = currentAnnexes.map(a => 
      a.name === annexName ? { ...a, fileDataUri: null, fileName: null, status: 'pending' as const, auditResult: null } : a
    )
    await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
    toast({ title: "Documento Removido" })
    setIsSyncing(false)
  }

  if (isBookmarkLoading || isBidLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
  
  if (!bookmark) return (
    <div className="text-center py-24 space-y-4 max-w-md mx-auto">
      <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
      <h2 className="text-2xl font-black text-primary uppercase italic">Proceso no compartido</h2>
      <Button onClick={() => router.push('/bids')}>Ir al Explorador</Button>
    </div>
  )

  const criticalEvents = (bookmark as any).timeline?.filter((e: any) => e.criticality === 'alta') || 
                         (bid as any)?.aiAnalysis?.timeline?.filter((e: any) => e.criticality === 'alta') || []

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="space-y-2 flex-1 min-w-0">
          <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground group -ml-4 hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" /> Regresar
          </Button>
          <h1 className="text-2xl font-black text-primary leading-tight line-clamp-2 italic uppercase tracking-tighter">
            {bid?.title || bookmark?.title || "Cargando..."}
          </h1>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-white font-mono text-[10px]">{bidId}</Badge>
            {isSyncing && <Badge variant="ghost" className="text-muted-foreground text-[10px] animate-pulse uppercase font-black">Sincronizando...</Badge>}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <Select value={(bookmark as any)?.preparationStatus || "En Estudio"} onValueChange={handleStatusChange}>
             <SelectTrigger className="w-[200px] h-11 font-black uppercase italic shadow-lg bg-accent text-white border-none">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {PREPARATION_STATUSES.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-primary text-white border-none shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-white/10"><CardTitle className="text-sm flex items-center gap-2 uppercase font-black italic"><ShieldCheck className="h-4 w-4 text-accent" /> Estado Carpeta</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-4">
               <div className="flex justify-between items-center text-xs font-bold uppercase"><span className="opacity-70">Documentos:</span><span className="font-black text-lg">{stats.total}</span></div>
               <div className="flex justify-between items-center text-xs text-emerald-400 font-bold uppercase"><span className="opacity-70">Validados:</span><span className="font-black text-lg">{stats.ready}</span></div>
               <div className="flex justify-between items-center text-xs text-red-400 font-bold uppercase"><span className="opacity-70">Pendientes:</span><span className="font-black text-lg">{stats.toCorrect}</span></div>
            </CardContent>
          </Card>

          {criticalEvents.length > 0 && (
            <Card className="border-red-600 shadow-xl border-2 rounded-2xl overflow-hidden">
              <CardHeader className="bg-red-600 text-white py-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /> Hitos Críticos</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-2">
                {criticalEvents.map((item: any, i: number) => (
                  <div key={i} className="p-3 bg-red-50 rounded-lg"><p className="text-[9px] font-black text-red-700 uppercase">{item.event}</p><p className="text-sm font-bold">{item.date}</p></div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-9 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentAnnexes.length > 0 ? (
              currentAnnexes.map((annex, i) => (
                <Card key={i} className={cn(
                  "border-2 transition-all rounded-3xl overflow-hidden shadow-sm hover:shadow-md", 
                  annex.status === 'pending' ? "border-dashed bg-muted/5 opacity-60" : 
                  annex.status === 'error' ? "border-red-500 bg-red-50/10 shadow-red-100" : 
                  "border-emerald-500 bg-emerald-50/10 shadow-emerald-100"
                )}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-black text-primary uppercase text-xs truncate leading-none">{annex.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold italic mt-1 line-clamp-1">{annex.purpose}</p>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5", 
                        annex.status === 'pending' ? "bg-muted" : 
                        annex.status === 'error' ? "bg-red-600" : "bg-emerald-500"
                      )}>
                        {annex.status === 'pending' ? 'Pendiente' : annex.status === 'error' ? 'Hallazgos' : 'Auditado OK'}
                      </Badge>
                    </div>

                    {annex.fileName && (
                      <div className="text-[10px] font-black bg-white/50 p-2.5 rounded-xl border-2 border-primary/5 flex items-center gap-2 truncate">
                        <FileCheck className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{annex.fileName}</span>
                      </div>
                    )}

                    {/* RESUMEN DE AUDITORÍA IA (SOLO SI FUE ANALIZADO) */}
                    {annex.auditResult && (
                      <div className="p-4 rounded-2xl bg-white border-2 border-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3 text-accent" /> Puntaje de Cumplimiento
                          </span>
                          <Badge className={cn(
                            "text-white font-black text-[10px] h-5", 
                            annex.auditResult.complianceScore > 80 ? "bg-emerald-500" : "bg-orange-500"
                          )}>
                            {annex.auditResult.complianceScore}%
                          </Badge>
                        </div>
                        
                        {annex.auditResult.riskWarnings.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-red-600 uppercase flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Hallazgos IA
                            </p>
                            <ul className="text-[10px] font-bold text-muted-foreground space-y-1">
                              {annex.auditResult.riskWarnings.slice(0, 2).map((w, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 leading-tight">
                                  <div className="h-1 w-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                  {w}
                                </li>
                              ))}
                              {annex.auditResult.riskWarnings.length > 2 && <li className="text-[8px] italic opacity-60">+{annex.auditResult.riskWarnings.length - 2} riesgos adicionales...</li>}
                            </ul>
                          </div>
                        )}

                        {annex.auditResult.improvementSuggestions && (
                          <div className="space-y-1 pt-1">
                            <p className="text-[9px] font-black text-accent uppercase flex items-center gap-1">
                              <BrainCircuit className="h-2.5 w-2.5" /> Sugerencia Estratégica
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground italic leading-tight">
                              "{annex.auditResult.improvementSuggestions.substring(0, 100)}..."
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Dialog open={isDialogOpen && selectedAnnex?.name === annex.name} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setSelectedAnnex(null); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="h-11 text-[10px] font-black uppercase rounded-xl border-2 hover:bg-muted/50" onClick={() => setSelectedAnnex(annex)}>
                            <Upload className="h-3.5 w-3.5 mr-1.5" /> Cargar PDF
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl border-4">
                          <DialogHeader><DialogTitle className="text-2xl font-black text-primary uppercase italic tracking-tighter">Subir para el Equipo</DialogTitle></DialogHeader>
                          <div className="py-14 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-6 bg-muted/10">
                             <div className="h-20 w-20 rounded-full bg-white shadow-xl flex items-center justify-center transform -rotate-6">
                               <FileUp className="h-10 w-10 text-accent" />
                             </div>
                             <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                             <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-14 px-10 font-black uppercase italic rounded-2xl bg-primary text-lg shadow-xl">
                               {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-5 w-5" />} 
                               Seleccionar Archivo
                             </Button>
                             <p className="text-[10px] font-black uppercase text-muted-foreground">Formato permitido: PDF Máx 10MB</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        className={cn(
                          "h-11 text-[10px] font-black uppercase rounded-xl shadow-md border-none transition-all",
                          annex.auditResult ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                        )}
                        disabled={annex.status === 'pending' || isAuditing} 
                        onClick={() => handleAuditAnnex(annex)}
                      >
                        {isAuditing ? <Loader2 className="animate-spin mr-1.5" /> : annex.auditResult ? <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5 fill-white" />}
                        {annex.auditResult ? "Re-Auditar" : "Auditar IA"}
                      </Button>
                    </div>

                    {annex.status !== 'pending' && (
                      <div className="flex justify-between items-center pt-2 border-t border-primary/5">
                        <Button variant="link" size="sm" className="text-muted-foreground h-6 text-[9px] font-black uppercase p-0">
                          <Download className="h-2.5 w-2.5 mr-1" /> Ver Original
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-6 text-[9px] font-black uppercase" onClick={() => handleDeleteAnnex(annex.name)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-muted/10 rounded-[3rem] border-4 border-dashed border-primary/10 space-y-6">
                <FileSearch className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-primary uppercase italic">Carpeta Digital en Blanco</h3>
                  <p className="text-muted-foreground text-sm font-bold italic max-w-xs mx-auto leading-relaxed">
                    Aún no hemos detectado los anexos requeridos. Ejecuta el análisis estratégico primero para que la IA los identifique.
                  </p>
                </div>
                <Button variant="outline" className="font-black uppercase italic h-12 px-8 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-md rounded-2xl" onClick={() => router.push(`/bids/${bidId}`)}>
                  Ejecutar Motor IA
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RefreshCw({className}: {className?: string}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
