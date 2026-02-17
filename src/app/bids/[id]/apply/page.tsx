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
  Cloud
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

  // Calculamos los anexos de forma dinámica para evitar bucles de actualización en useEffect
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
             <SelectTrigger className="w-[200px] h-11 font-black uppercase italic shadow-lg bg-accent text-white">
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
          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2 uppercase font-black italic"><ShieldCheck className="h-4 w-4 text-accent" /> Estado Carpeta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center text-xs font-bold uppercase"><span className="opacity-70">Documentos:</span><span className="font-black text-lg">{stats.total}</span></div>
               <div className="flex justify-between items-center text-xs text-emerald-400 font-bold uppercase"><span className="opacity-70">Validados:</span><span className="font-black text-lg">{stats.ready}</span></div>
            </CardContent>
          </Card>

          {criticalEvents.length > 0 && (
            <Card className="border-red-600 shadow-xl border-2">
              <CardHeader className="bg-red-600 text-white py-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest">Hitos Críticos</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-2">
                {criticalEvents.map((item: any, i: number) => (
                  <div key={i} className="p-3 bg-red-50 rounded-lg"><p className="text-[9px] font-black text-red-700 uppercase">{item.event}</p><p className="text-sm font-bold">{item.date}</p></div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-9 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentAnnexes.length > 0 ? (
              currentAnnexes.map((annex, i) => (
                <Card key={i} className={cn("border-2 transition-all", annex.status === 'pending' ? "border-dashed bg-muted/5" : annex.status === 'error' ? "border-red-200" : "border-emerald-100")}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-primary uppercase text-xs">{annex.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold italic line-clamp-1">{annex.purpose}</p>
                      </div>
                      <Badge className={cn("text-[9px] font-black uppercase", annex.status === 'pending' ? "bg-muted" : annex.status === 'error' ? "bg-red-600" : "bg-emerald-500")}>
                        {annex.status === 'pending' ? 'Pendiente' : annex.status === 'error' ? 'Corregir' : 'Listo'}
                      </Badge>
                    </div>

                    {annex.fileName && <div className="text-[10px] font-black bg-muted/30 p-2 rounded border truncate">{annex.fileName}</div>}

                    <div className="grid grid-cols-2 gap-2">
                      <Dialog open={isDialogOpen && selectedAnnex?.name === annex.name} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setSelectedAnnex(null); }}>
                        <DialogTrigger asChild><Button variant="outline" className="h-10 text-[10px] font-black uppercase" onClick={() => setSelectedAnnex(annex)}>Cargar PDF</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle className="text-xl font-black text-primary uppercase italic">Subir para el Equipo</DialogTitle></DialogHeader>
                          <div className="py-10 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 bg-muted/10">
                             <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                             <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-12 px-8 font-black uppercase italic">{isUploading ? <Loader2 className="animate-spin" /> : "Elegir Archivo"}</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" className="h-10 text-[10px] font-black border-accent text-accent uppercase" disabled={annex.status === 'pending' || isAuditing} onClick={() => handleAuditAnnex(annex)}>
                        {isAuditing ? <Loader2 className="animate-spin" /> : "Auditar IA"}
                      </Button>
                    </div>

                    {annex.status !== 'pending' && (
                      <div className="flex justify-end pt-2 border-t"><Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 h-6 text-[9px] font-black uppercase" onClick={() => handleDeleteAnnex(annex.name)}><Trash2 className="h-3 w-3 mr-1" /> Eliminar</Button></div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-muted/10 rounded-3xl border-2 border-dashed space-y-4">
                <FileSearch className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="font-black text-primary uppercase italic">Sin anexos detectados. Ejecuta el análisis IA primero.</p>
                <Button variant="outline" onClick={() => router.push(`/bids/${bidId}`)}>Ir al Análisis</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}