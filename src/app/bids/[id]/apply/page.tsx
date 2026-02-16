
"use client"

import { useParams, useRouter } from "next/navigation"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  BrainCircuit,
  Zap,
  ArrowRight,
  AlertTriangle,
  Clock,
  Upload,
  Download,
  FileSearch,
  CheckCircle,
  FileWarning,
  Trash2
} from "lucide-react"
import { auditBidProposal, AuditOutput } from "@/ai/flows/audit-bid-proposal"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface AnnexDocument {
  name: string;
  purpose: string;
  status: 'pending' | 'uploaded' | 'error';
  content?: string;
  auditResult?: AuditOutput;
}

export default function BidApplyPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [annexes, setAnnexes] = useState<AnnexDocument[]>([])
  const [selectedAnnex, setSelectedAnnex] = useState<AnnexDocument | null>(null)
  const [tempContent, setTempContent] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)

  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !user || !bidId) return null
    return doc(db, "users", user.uid, "bookmarks", bidId)
  }, [db, user, bidId])

  const { data: bookmark, isLoading } = useDoc(bookmarkRef)

  useEffect(() => {
    if (bookmark?.annexes) {
      setAnnexes(bookmark.annexes)
    } else if (bookmark?.timeline) {
      // Si no hay anexos pero hay análisis previo, intentamos poblar desde el checklist de la IA
      const analysis = (bookmark as any).aiAnalysis || {}
      if (analysis.formChecklist) {
        const initialAnnexes = analysis.formChecklist.map((f: any) => ({
          name: f.formName,
          purpose: f.purpose,
          status: 'pending'
        }))
        setAnnexes(initialAnnexes)
      }
    }
  }, [bookmark])

  const handleUploadAnnex = async () => {
    if (!selectedAnnex || !bookmarkRef) return
    setIsUploading(true)
    
    try {
      const updatedAnnexes = annexes.map(a => 
        a.name === selectedAnnex.name 
          ? { ...a, content: tempContent, status: 'uploaded' as const } 
          : a
      )
      
      await updateDoc(bookmarkRef, {
        annexes: updatedAnnexes
      })
      
      setAnnexes(updatedAnnexes)
      toast({ title: "Documento Cargado", description: `El anexo ${selectedAnnex.name} ha sido guardado en la nube.` })
      setTempContent("")
      setSelectedAnnex(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleAuditAnnex = async (annex: AnnexDocument) => {
    if (!annex.content || !bookmarkRef) {
      toast({ variant: "destructive", title: "Sin contenido", description: "Primero debes cargar el contenido del anexo." })
      return
    }

    setIsAuditing(true)
    try {
      toast({ title: "Auditoría en Curso", description: `Revisando rigor técnico de ${annex.name}...` })
      const result = await auditBidProposal({
        bidId,
        proposalText: annex.content,
        strategicContext: (bookmark as any).aiAnalysis || {}
      })

      const updatedAnnexes = annexes.map(a => 
        a.name === annex.name 
          ? { ...a, auditResult: result, status: result.isReady ? 'uploaded' : 'error' as const } 
          : a
      )

      await updateDoc(bookmarkRef, {
        annexes: updatedAnnexes
      })

      setAnnexes(updatedAnnexes)
      
      if (!result.isReady) {
        toast({ variant: "destructive", title: "Riesgo Detectado", description: `El auditor detectó errores críticos en ${annex.name}.` })
      } else {
        toast({ title: "Anexo Validado", description: "El documento cumple con los estándares requeridos." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsAuditing(false)
    }
  }

  const handleDeleteAnnex = async (annexName: string) => {
    if (!bookmarkRef) return
    const updatedAnnexes = annexes.map(a => 
      a.name === annexName ? { ...a, content: undefined, status: 'pending' as const, auditResult: undefined } : a
    )
    await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
    setAnnexes(updatedAnnexes)
    toast({ title: "Documento Eliminado", description: "Se ha liberado el espacio del anexo." })
  }

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
  if (!bookmark) return (
    <div className="text-center py-24 space-y-4">
      <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
      <h2 className="text-xl font-bold">Licitación no seguida</h2>
      <p className="text-muted-foreground">Debes seguir esta licitación para gestionar sus anexos.</p>
      <Button onClick={() => router.push('/bids')}>Volver al Explorador</Button>
    </div>
  )

  const criticalEvents = (bookmark as any).timeline?.filter((e: any) => e.criticality === 'alta') || []

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground group">
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Volver al detalle
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary/20 uppercase font-black">Gestor de Documentación Segura</Badge>
          <Badge className="bg-primary text-white font-mono">{bidId}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PANEL IZQUIERDO: HITOS DE SUPERVIVENCIA */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-red-600 shadow-xl overflow-hidden">
            <CardHeader className="bg-red-600 text-white py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Cronograma de Supervivencia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {criticalEvents.length > 0 ? (
                criticalEvents.map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-red-50 border-2 border-red-200 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-full w-1 bg-red-500" />
                    <p className="text-[10px] font-black uppercase text-red-700">{item.event}</p>
                    <p className="text-lg font-black text-primary">{item.date}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-4 text-center">Sin hitos críticos detectados.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" /> Resumen de Carpeta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                 <span className="opacity-70">Anexos Totales:</span>
                 <span className="font-bold">{annexes.length}</span>
               </div>
               <div className="flex justify-between items-center text-xs text-emerald-400">
                 <span className="opacity-70">Listos para Envío:</span>
                 <span className="font-bold">{annexes.filter(a => a.status === 'uploaded' && a.auditResult?.isReady).length}</span>
               </div>
               <div className="pt-4 border-t border-white/10">
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Consejo de Seguridad</p>
                 <p className="text-[11px] leading-relaxed italic">"Asegúrate de que todos los anexos tengan el ticket verde antes de subir al portal oficial."</p>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* ÁREA CENTRAL: GESTOR DE ANEXOS */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Documentación Requerida</h2>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              {annexes.filter(a => a.status !== 'pending').length} de {annexes.length} completados
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {annexes.length > 0 ? (
              annexes.map((annex, i) => (
                <Card key={i} className={cn(
                  "border-2 transition-all group overflow-hidden",
                  annex.status === 'pending' ? "border-dashed border-muted bg-muted/20" : 
                  annex.status === 'error' ? "border-red-200 bg-red-50" : "border-emerald-100 bg-white shadow-md"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-primary uppercase text-sm">{annex.name}</h4>
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
                        {annex.status === 'pending' ? 'Pendiente' : annex.status === 'error' ? 'Revisión' : 'Cargado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {annex.auditResult && (
                      <div className={cn(
                        "p-3 rounded-lg text-[10px] space-y-2",
                        annex.auditResult.isReady ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
                      )}>
                        <p className="font-bold flex items-center gap-2">
                          <Zap className="h-3 w-3" /> Score: {annex.auditResult.complianceScore}%
                        </p>
                        <p className="line-clamp-2 opacity-80">{annex.auditResult.improvementSuggestions}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant={annex.status === 'pending' ? "default" : "outline"} 
                            className="h-10 text-xs font-bold gap-2"
                            onClick={() => setSelectedAnnex(annex)}
                          >
                            <Upload className="h-3 w-3" /> {annex.status === 'pending' ? 'Subir' : 'Reemplazar'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Upload className="h-5 w-5 text-primary" /> Cargar {selectedAnnex?.name}
                            </DialogTitle>
                            <DialogDescription>
                              Pega el contenido del anexo para que la IA pueda auditarlo antes de tu postulación oficial.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                             <Textarea 
                               placeholder="Pega aquí el contenido de tu documento..."
                               className="min-h-[300px] font-mono text-xs"
                               value={tempContent}
                               onChange={(e) => setTempContent(e.target.value)}
                             />
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setSelectedAnnex(null)}>Cancelar</Button>
                            <Button 
                              className="bg-primary hover:bg-primary/90 font-bold" 
                              disabled={!tempContent || isUploading}
                              onClick={handleUploadAnnex}
                            >
                              {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <SaveIcon className="h-4 w-4 mr-2" />}
                              Guardar Documento
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        className="h-10 text-xs font-bold gap-2 border-accent text-accent"
                        disabled={annex.status === 'pending' || isAuditing}
                        onClick={() => handleAuditAnnex(annex)}
                      >
                        {isAuditing ? <Loader2 className="animate-spin h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
                        Auditar IA
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-muted/50">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] font-bold text-muted-foreground gap-1.5"
                        disabled={annex.status === 'pending'}
                        onClick={() => {
                          const blob = new Blob([annex.content || ""], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${annex.name.replace(/\s+/g, '_')}.txt`;
                          a.click();
                        }}
                       >
                         <Download className="h-3 w-3" /> Descargar
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 gap-1.5"
                        disabled={annex.status === 'pending'}
                        onClick={() => handleDeleteAnnex(annex.name)}
                       >
                         <Trash2 className="h-3 w-3" /> Eliminar
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-muted space-y-4">
                <FileSearch className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <div className="space-y-1">
                  <h5 className="font-bold text-primary">No se han identificado anexos</h5>
                  <p className="text-sm text-muted-foreground">Realiza el análisis IA en la ficha de la licitación para poblar esta lista.</p>
                </div>
                <Button variant="outline" onClick={() => router.push(`/bids/${bidId}`)}>Ir a Análisis IA</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
  )
}
