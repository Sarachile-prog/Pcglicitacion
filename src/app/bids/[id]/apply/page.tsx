
"use client"

import { useParams, useRouter } from "next/navigation"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  Loader2, 
  ChevronLeft, 
  ShieldCheck, 
  AlertCircle, 
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
  FileCheck
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

export default function BidApplyPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [annexes, setAnnexes] = useState<AnnexDocument[]>([])
  const [selectedAnnex, setSelectedAnnex] = useState<AnnexDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !user || !bidId) return null
    return doc(db, "users", user.uid, "bookmarks", bidId)
  }, [db, user, bidId])

  const { data: bookmark, isLoading: isBookmarkLoading } = useDoc(bookmarkRef)
  const { data: bid, isLoading: isBidLoading } = useDoc(useMemoFirebase(() => db && bidId ? doc(db, "bids", bidId) : null, [db, bidId]))

  useEffect(() => {
    if (bookmark?.annexes && bookmark.annexes.length > 0) {
      setAnnexes(bookmark.annexes)
    } else {
      const analysis = (bookmark as any)?.aiAnalysis || bid?.aiAnalysis || null
      if (analysis?.formChecklist) {
        const initialAnnexes: AnnexDocument[] = analysis.formChecklist.map((f: any) => ({
          name: f.formName,
          purpose: f.purpose,
          status: 'pending',
          fileDataUri: null,
          fileName: null,
          auditResult: null
        }))
        setAnnexes(initialAnnexes)
        if (bookmarkRef && bookmark && !bookmark.annexes) {
          updateDoc(bookmarkRef, { annexes: initialAnnexes })
        }
      }
    }
  }, [bookmark, bid, bookmarkRef])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedAnnex || !bookmarkRef) return
    
    if (file.type !== 'application/pdf') {
      toast({ variant: "destructive", title: "Formato no válido", description: "Solo se permiten archivos PDF." })
      return
    }

    setIsUploading(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64String = event.target?.result as string
        
        const updatedAnnexes: AnnexDocument[] = annexes.map(a => 
          a.name === selectedAnnex.name 
            ? { ...a, fileDataUri: base64String, fileName: file.name, status: 'uploaded' as const, auditResult: null } 
            : a
        )
        
        await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
        setAnnexes(updatedAnnexes)
        toast({ title: "Documento Guardado", description: `${file.name} ahora está en tu carpeta segura.` })
        setIsDialogOpen(false)
        setSelectedAnnex(null)
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
      setIsUploading(false)
    }
  }

  const handleAuditAnnex = async (annex: AnnexDocument) => {
    if (!annex.fileDataUri || !bookmarkRef) {
      toast({ variant: "destructive", title: "Archivo faltante", description: "Debes subir un PDF primero." })
      return
    }

    setIsAuditing(true)
    try {
      toast({ title: "Iniciando Auditoría Multimodal", description: "Analizando contenido del PDF y verificando sumas..." })
      const strategicContext = (bookmark as any)?.aiAnalysis || bid?.aiAnalysis || {}
      
      const result = await auditBidProposal({
        bidId,
        fileDataUri: annex.fileDataUri,
        strategicContext
      })

      const updatedAnnexes: AnnexDocument[] = annexes.map(a => 
        a.name === annex.name 
          ? { ...a, auditResult: result, status: result.isReady ? 'uploaded' : 'error' as const } 
          : a
      )

      await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
      setAnnexes(updatedAnnexes)
      
      if (!result.isReady) {
        toast({ variant: "destructive", title: "Alerta de Cumplimiento", description: "Se detectaron errores críticos en el PDF." })
      } else {
        toast({ title: "PDF Validado", description: "El documento está listo para ser enviado." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de IA", description: error.message })
    } finally {
      setIsAuditing(false)
    }
  }

  const handleDeleteAnnex = async (annexName: string) => {
    if (!bookmarkRef) return
    const updatedAnnexes: AnnexDocument[] = annexes.map(a => 
      a.name === annexName ? { ...a, fileDataUri: null, fileName: null, status: 'pending' as const, auditResult: null } : a
    )
    await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
    setAnnexes(updatedAnnexes)
    toast({ title: "Documento Eliminado", description: "Archivo removido de la nube." })
  }

  const isLoading = isBookmarkLoading || isBidLoading

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
  
  if (!bookmark) return (
    <div className="text-center py-24 space-y-4">
      <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
      <h2 className="text-xl font-bold">Licitación no seguida</h2>
      <p className="text-muted-foreground">Sigue este proceso para gestionar tu documentación.</p>
      <Button onClick={() => router.push('/bids')}>Ir al Explorador</Button>
    </div>
  )

  const criticalEvents = (bookmark as any).timeline?.filter((e: any) => e.criticality === 'alta') || 
                         (bid as any)?.aiAnalysis?.timeline?.filter((e: any) => e.criticality === 'alta') || []

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground group">
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Regresar al Detalle
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary/20 uppercase font-black">Carpeta Digital de Licitación</Badge>
          <Badge className="bg-primary text-white font-mono">{bidId}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-red-600 shadow-xl overflow-hidden">
            <CardHeader className="bg-red-600 text-white py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" /> Hitos de Supervivencia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {criticalEvents.length > 0 ? (
                criticalEvents.map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-[9px] font-black uppercase text-red-700">{item.event}</p>
                    <p className="text-md font-black text-primary">{item.date}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-4 text-center">Sin alertas críticas.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" /> Estado de Carpeta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                 <span className="opacity-70">Documentos:</span>
                 <span className="font-bold">{annexes.length}</span>
               </div>
               <div className="flex justify-between items-center text-xs text-emerald-400">
                 <span className="opacity-70">Auditados OK:</span>
                 <span className="font-bold">{annexes.filter(a => a.status === 'uploaded' && a.auditResult?.isReady).length}</span>
               </div>
               <div className="pt-4 border-t border-white/10">
                 <p className="text-[9px] font-bold uppercase opacity-60 mb-2">Seguridad</p>
                 <p className="text-[10px] leading-relaxed italic opacity-80">"La IA revisará tus sumas y formatos de RUT en cada PDF cargado."</p>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Documentación Oficial</h2>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              {annexes.filter(a => a.status !== 'pending').length} de {annexes.length} Archivos
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {annexes.length > 0 ? (
              annexes.map((annex, i) => (
                <Card key={i} className={cn(
                  "border-2 transition-all overflow-hidden",
                  annex.status === 'pending' ? "border-dashed border-muted bg-muted/10" : 
                  annex.status === 'error' ? "border-red-200 bg-red-50/50" : "border-emerald-100 bg-white"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-primary uppercase text-xs">{annex.name}</h4>
                          {annex.status === 'uploaded' && annex.auditResult?.isReady && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                          {annex.status === 'error' && <FileWarning className="h-4 w-4 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{annex.purpose}</p>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-bold uppercase",
                        annex.status === 'pending' ? "bg-muted text-muted-foreground" :
                        annex.status === 'error' ? "bg-red-600 text-white" : "bg-emerald-500 text-white"
                      )}>
                        {annex.status === 'pending' ? 'Pendiente' : annex.status === 'error' ? 'Corregir' : 'Cargado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {annex.fileName && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border text-[10px] font-medium text-primary">
                        <FileCheck className="h-3 w-3" /> {annex.fileName}
                      </div>
                    )}

                    {annex.auditResult && (
                      <div className={cn(
                        "p-3 rounded-lg text-[10px] space-y-2",
                        annex.auditResult.isReady ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
                      )}>
                        <p className="font-bold flex items-center gap-2">
                          <Zap className="h-3 w-3" /> Audit Score: {annex.auditResult.complianceScore}%
                        </p>
                        <ul className="list-disc pl-4 space-y-1 opacity-80">
                           {annex.auditResult.riskWarnings.slice(0, 2).map((w, idx) => <li key={idx}>{w}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Dialog open={isDialogOpen && selectedAnnex?.name === annex.name} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setSelectedAnnex(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant={annex.status === 'pending' ? "default" : "outline"} 
                            className="h-10 text-[10px] font-bold gap-2"
                            onClick={() => setSelectedAnnex(annex)}
                          >
                            <FileUp className="h-3 w-3" /> {annex.status === 'pending' ? 'Subir PDF' : 'Cambiar PDF'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cargar Documento Oficial</DialogTitle>
                            <DialogDescription>
                              Selecciona el archivo PDF del {selectedAnnex?.name} para su análisis técnico.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 bg-muted/10">
                             <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                               <Upload className="h-6 w-6 text-primary" />
                             </div>
                             <input 
                               type="file" 
                               accept="application/pdf" 
                               className="hidden" 
                               ref={fileInputRef}
                               onChange={handleFileChange}
                             />
                             <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                               {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : "Elegir Archivo PDF"}
                             </Button>
                             <p className="text-[10px] text-muted-foreground">Tamaño máximo: 5MB</p>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        className="h-10 text-[10px] font-bold gap-2 border-accent text-accent"
                        disabled={annex.status === 'pending' || isAuditing}
                        onClick={() => handleAuditAnnex(annex)}
                      >
                        {isAuditing ? <Loader2 className="animate-spin h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
                        Auditar con IA
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-muted/50">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] font-bold text-muted-foreground gap-1.5"
                        disabled={annex.status === 'pending' || !annex.fileDataUri}
                        onClick={() => {
                          if (annex.fileDataUri) {
                            const link = document.createElement('a');
                            link.href = annex.fileDataUri;
                            link.download = annex.fileName || `${annex.name}.pdf`;
                            link.click();
                          }
                        }}
                       >
                         <Download className="h-3 w-3" /> Bajar Anexo
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] font-bold text-red-400 hover:text-red-600 gap-1.5"
                        disabled={annex.status === 'pending'}
                        onClick={() => handleDeleteAnnex(annex.name)}
                       >
                         <Trash2 className="h-3 w-3" /> Borrar
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-muted/10 rounded-3xl border-2 border-dashed space-y-4">
                <FileSearch className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <h5 className="font-bold text-primary">Carpeta vacía</h5>
                <Button variant="outline" onClick={() => router.push(`/bids/${bidId}`)}>Volver al Análisis IA</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
