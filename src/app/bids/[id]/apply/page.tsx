
"use client"

import { useParams, useRouter } from "next/navigation"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useState, useEffect, useRef, useMemo } from "react"
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
  
  const [annexes, setAnnexes] = useState<AnnexDocument[]>([])
  const [selectedAnnex, setSelectedAnnex] = useState<AnnexDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Perfil para obtener el companyId
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  // Bookmarks corporativos
  const bookmarkRef = useMemoFirebase(() => {
    if (!db || !profile?.companyId || !bidId) return null
    return doc(db, "companies", profile.companyId, "bookmarks", bidId)
  }, [db, profile, bidId])

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

  const stats = useMemo(() => {
    const total = annexes.length;
    const uploaded = annexes.filter(a => a.status !== 'pending').length;
    const ready = annexes.filter(a => a.status === 'uploaded' && a.auditResult?.isReady).length;
    const toCorrect = annexes.filter(a => a.status === 'error').length;
    return { total, uploaded, ready, toCorrect };
  }, [annexes]);

  const handleStatusChange = async (newStatus: string) => {
    if (!bookmarkRef) return
    setIsSyncing(true)
    try {
      await updateDoc(bookmarkRef, { preparationStatus: newStatus })
      toast({ title: "Estado Corporativo Actualizado", description: `El equipo ahora ve este proceso como ${newStatus}.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedAnnex || !bookmarkRef) return
    
    if (file.type !== 'application/pdf') {
      toast({ variant: "destructive", title: "Formato no válido", description: "Solo se permiten archivos PDF." })
      return
    }

    setIsUploading(true)
    setIsSyncing(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64String = event.target?.result as string
        const updatedAnnexes: AnnexDocument[] = annexes.map(a => 
          a.name === selectedAnnex.name 
            ? { ...a, fileDataUri: base64String, fileName: file.name, status: 'uploaded' as const, auditResult: null } 
            : a
        )
        
        await updateDoc(bookmarkRef, { 
          annexes: updatedAnnexes,
          preparationStatus: (bookmark as any)?.preparationStatus === "En Estudio" ? "En Preparación" : (bookmark as any)?.preparationStatus
        })
        setAnnexes(updatedAnnexes)
        toast({ title: "Documento de Equipo Guardado", description: "El archivo ya está disponible para todo tu equipo." })
        setIsDialogOpen(false)
        setSelectedAnnex(null)
        setIsUploading(false)
        setIsSyncing(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
      setIsUploading(false)
      setIsSyncing(false)
    }
  }

  const handleAuditAnnex = async (annex: AnnexDocument) => {
    if (!annex.fileDataUri || !bookmarkRef) {
      toast({ variant: "destructive", title: "Archivo faltante", description: "Debes subir un PDF primero." })
      return
    }

    setIsAuditing(true)
    setIsSyncing(true)
    try {
      toast({ title: "Auditoría Multimodal", description: "Analizando contenido compartido..." })
      const strategicContext = (bookmark as any)?.aiAnalysis || bid?.aiAnalysis || {}
      
      const result = await auditBidProposal({
        bidId,
        fileDataUri: annex.fileDataUri,
        strategicContext
      })

      const cleanResult = JSON.parse(JSON.stringify(result));

      const updatedAnnexes: AnnexDocument[] = annexes.map(a => 
        a.name === annex.name 
          ? { ...a, auditResult: cleanResult || null, status: cleanResult?.isReady ? 'uploaded' : 'error' as const } 
          : a
      )

      await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
      setAnnexes(updatedAnnexes)
      
      if (!cleanResult?.isReady) {
        toast({ variant: "destructive", title: "Hallazgo de Auditoría", description: "Se detectaron errores que el equipo debe corregir." })
      } else {
        toast({ title: "Validación Exitosa", description: "Documento listo para envío." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de IA", description: error.message })
    } finally {
      setIsAuditing(false)
      setIsSyncing(false)
    }
  }

  const handleDeleteAnnex = async (annexName: string) => {
    if (!bookmarkRef) return
    setIsSyncing(true)
    const updatedAnnexes: AnnexDocument[] = annexes.map(a => 
      a.name === annexName ? { ...a, fileDataUri: null, fileName: null, status: 'pending' as const, auditResult: null } : a
    )
    await updateDoc(bookmarkRef, { annexes: updatedAnnexes })
    setAnnexes(updatedAnnexes)
    toast({ title: "Documento Removido", description: "El archivo ha sido eliminado de la carpeta compartida." })
    setIsSyncing(false)
  }

  const isLoading = isBookmarkLoading || isBidLoading

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
  
  if (!bookmark) return (
    <div className="text-center py-24 space-y-4 max-w-md mx-auto">
      <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
      <h2 className="text-2xl font-black text-primary uppercase italic">Proceso no compartido</h2>
      <p className="text-muted-foreground font-medium">
        Para gestionar documentación en equipo, primero debes "Seguir" esta licitación desde su detalle.
      </p>
      <Button onClick={() => router.push('/bids')} className="font-black uppercase italic">Volver al Explorador</Button>
    </div>
  )

  const criticalEvents = (bookmark as any).timeline?.filter((e: any) => e.criticality === 'alta') || 
                         (bid as any)?.aiAnalysis?.timeline?.filter((e: any) => e.criticality === 'alta') || []

  const displayTitle = bid?.title || bookmark?.title || "Cargando..."
  const currentPrepStatus = (bookmark as any)?.preparationStatus || "En Estudio";
  const bidStatus = bid?.status || bookmark?.status || "NO DEFINIDO";

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes('publicada') || s?.includes('abierta')) return 'bg-emerald-600';
    if (s?.includes('adjudicada')) return 'bg-blue-600';
    if (s?.includes('desierta') || s?.includes('cancelada')) return 'bg-red-600';
    if (s?.includes('cerrada')) return 'bg-gray-600';
    return 'bg-orange-500';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="space-y-2 flex-1 min-w-0">
          <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground group -ml-4 hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" /> Regresar al Detalle
          </Button>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-sm", getStatusColor(bidStatus))}>
              {bidStatus}
            </Badge>
            <Badge variant="outline" className="text-primary border-primary/20 uppercase font-black text-[10px]">EQUIPO: {profile?.companyId || 'PROV'}</Badge>
          </div>
          <h1 className="text-2xl font-black text-primary leading-tight line-clamp-2 italic uppercase tracking-tighter">
            {displayTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-white font-mono text-[10px]">{bidId}</Badge>
            {isSyncing ? (
              <Badge variant="ghost" className="text-muted-foreground text-[10px] animate-pulse flex items-center gap-1 font-black uppercase">
                <Cloud className="h-3 w-3" /> Sincronizando Equipo...
              </Badge>
            ) : (
              <Badge variant="ghost" className="text-emerald-600 text-[10px] flex items-center gap-1 font-black uppercase">
                <Cloud className="h-3 w-3" /> Sincronizado
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estado de Gestión</p>
           <Select value={currentPrepStatus} onValueChange={handleStatusChange}>
             <SelectTrigger className={cn(
               "w-[200px] h-11 font-black uppercase italic shadow-lg transition-all",
               currentPrepStatus === 'Presentada' ? "bg-emerald-600 text-white" : "bg-accent text-white"
             )}>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {PREPARATION_STATUSES.map(s => (
                 <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-red-600 shadow-xl overflow-hidden border-2">
            <CardHeader className="bg-red-600 text-white py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" /> Alert de Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {criticalEvents.length > 0 ? (
                criticalEvents.map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-[9px] font-black uppercase text-red-700 leading-tight mb-1">{item.event}</p>
                    <p className="text-md font-black text-primary">{item.date}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-4 text-center font-bold uppercase">Sin hitos críticos.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 uppercase font-black italic">
                <ShieldCheck className="h-4 w-4 text-accent" /> Estado Carpeta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center text-xs font-bold uppercase">
                 <span className="opacity-70">Documentos:</span>
                 <span className="font-black text-lg">{stats.total}</span>
               </div>
               <div className="flex justify-between items-center text-xs text-emerald-400 font-bold uppercase">
                 <span className="opacity-70">Auditados OK:</span>
                 <span className="font-black text-lg">{stats.ready}</span>
               </div>
               <div className="flex justify-between items-center text-xs text-red-400 font-bold uppercase">
                 <span className="opacity-70">A corregir:</span>
                 <span className="font-black text-lg">{stats.toCorrect}</span>
               </div>
               <div className="pt-4 border-t border-white/10">
                 <p className="text-[9px] font-black uppercase text-accent mb-2 tracking-widest">Seguridad</p>
                 <p className="text-[10px] leading-relaxed italic opacity-80 font-medium">"Todo el equipo puede ver estas auditorías en tiempo real."</p>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Documentación Compartida</h2>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-black">
              {stats.uploaded} de {stats.total} ARCHIVOS
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {annexes.length > 0 ? (
              annexes.map((annex, i) => (
                <Card key={i} className={cn(
                  "border-2 transition-all overflow-hidden shadow-sm hover:shadow-md",
                  annex.status === 'pending' ? "border-dashed border-muted bg-muted/5" : 
                  annex.status === 'error' ? "border-red-200 bg-red-50/30" : "border-emerald-100 bg-white"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-primary uppercase text-xs">{annex.name}</h4>
                          {annex.status === 'uploaded' && annex.auditResult?.isReady && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                          {annex.status === 'error' && <FileWarning className="h-4 w-4 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 font-bold italic">{annex.purpose}</p>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase shadow-sm",
                        annex.status === 'pending' ? "bg-muted text-muted-foreground" :
                        annex.status === 'error' ? "bg-red-600 text-white" : "bg-emerald-500 text-white"
                      )}>
                        {annex.status === 'pending' ? 'Pendiente' : annex.status === 'error' ? 'Corregir' : 'Validado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {annex.fileName && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border text-[10px] font-black text-primary truncate">
                        <FileCheck className="h-3.5 w-3.5 shrink-0 text-accent" /> {annex.fileName}
                      </div>
                    )}

                    {annex.auditResult && (
                      <div className={cn(
                        "p-3 rounded-lg text-[10px] space-y-2 border shadow-inner",
                        annex.auditResult.isReady ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-red-50 border-red-100 text-red-900"
                      )}>
                        <p className="font-black flex items-center gap-2 uppercase tracking-widest">
                          <Zap className="h-3 w-3" /> Audit Score: {annex.auditResult.complianceScore}%
                        </p>
                        <ul className="list-disc pl-4 space-y-1 opacity-80 font-bold italic">
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
                            className="h-11 text-[10px] font-black gap-2 uppercase italic shadow-md"
                            onClick={() => setSelectedAnnex(annex)}
                          >
                            <FileUp className="h-4 w-4" /> {annex.status === 'pending' ? 'Cargar PDF' : 'Cambiar'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-primary uppercase italic">Cargar para el Equipo</DialogTitle>
                            <DialogTitle className="text-xs text-muted-foreground uppercase font-bold">{annex.name}</DialogTitle>
                            <DialogDescription className="font-medium italic">
                              Este archivo será visible para todos los miembros vinculados a tu empresa.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-10 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 bg-muted/10">
                             <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                               <Upload className="h-8 w-8 text-primary" />
                             </div>
                             <input 
                               type="file" 
                               accept="application/pdf" 
                               className="hidden" 
                               ref={fileInputRef}
                               onChange={handleFileChange}
                             />
                             <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-12 px-8 font-black uppercase italic">
                               {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : "Elegir PDF"}
                             </Button>
                             <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Máximo 5MB por archivo</p>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        className="h-11 text-[10px] font-black gap-2 border-accent text-accent uppercase italic shadow-sm"
                        disabled={annexes.length === 0 || annex.status === 'pending' || isAuditing}
                        onClick={() => handleAuditAnnex(annex)}
                      >
                        {isAuditing ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                        Auditar IA
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-muted/50">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] font-black text-muted-foreground gap-1.5 uppercase hover:text-primary"
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
                         <Download className="h-3 w-3" /> Descargar
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] font-black text-red-400 hover:text-red-600 gap-1.5 uppercase"
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
              <div className="col-span-full py-24 text-center bg-muted/10 rounded-3xl border-2 border-dashed space-y-6">
                <FileSearch className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                <h5 className="font-black text-primary uppercase italic text-xl tracking-tighter">Sin documentación definida</h5>
                <p className="text-muted-foreground font-medium italic max-w-sm mx-auto">
                  La IA aún no ha identificado los anexos requeridos. Ejecuta un análisis en el detalle de la licitación.
                </p>
                <Button variant="outline" onClick={() => router.push(`/bids/${bidId}`)} className="font-black uppercase italic h-12 px-10">Ir al Análisis IA</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
