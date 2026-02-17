"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquareText, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Headset,
  History,
  ShieldAlert,
  RefreshCw,
  Lock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function SupportPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [newSubject, setNewSubject] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [replyText, setReplyText] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)

  const ticketsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    try {
      // Importante: El filtro por userId es obligatorio por reglas de seguridad
      return query(
        collection(db, "support_tickets"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      )
    } catch (e) {
      console.error("Error al construir consulta de tickets", e)
      return null
    }
  }, [db, user])

  const { data: tickets, isLoading, error } = useCollection(ticketsQuery)

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !selectedTicket) return null
    return query(
      collection(db, "support_tickets", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    )
  }, [db, selectedTicket])

  const { data: messages } = useCollection(messagesQuery)

  const handleCreateTicket = async () => {
    if (!db || !user || !newSubject || !newMessage) return
    setIsSyncing(true)
    try {
      const ticketRef = await addDoc(collection(db, "support_tickets"), {
        userId: user.uid,
        userEmail: user.email,
        subject: newSubject,
        status: "Open",
        lastMessage: newMessage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      await addDoc(collection(db, "support_tickets", ticketRef.id, "messages"), {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: "User",
        text: newMessage,
        createdAt: serverTimestamp()
      })

      toast({ title: "Ticket Creado", description: "Nuestro equipo lo revisará pronto." })
      setIsCreating(false)
      setNewSubject("")
      setNewMessage("")
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleReply = async () => {
    if (!db || !user || !selectedTicket || !replyText) return
    setIsSyncing(true)
    try {
      await addDoc(collection(db, "support_tickets", selectedTicket.id, "messages"), {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: "User",
        text: replyText,
        createdAt: serverTimestamp()
      })

      await updateDoc(doc(db, "support_tickets", selectedTicket.id), {
        updatedAt: serverTimestamp(),
        lastMessage: replyText,
        status: "Open"
      })

      setReplyText("")
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-primary opacity-20" />
        <p className="text-muted-foreground font-bold italic uppercase text-xs tracking-widest">Validando Identidad...</p>
      </div>
    )
  }

  // Si no hay usuario, mostramos estado de bloqueo
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Acceso Restringido</h2>
        <p className="text-muted-foreground font-medium italic">Debes iniciar sesión para acceder a la mesa de ayuda técnica.</p>
        <Button onClick={() => window.location.href = '/login'} className="w-full bg-primary font-black uppercase italic h-12">Ir al Login</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-primary uppercase italic tracking-tighter">Mesa de Ayuda</h2>
          <p className="text-muted-foreground font-medium italic">Consulta sobre errores técnicos, activación de planes o dudas del sistema.</p>
        </div>
        <Button 
          onClick={() => { setIsCreating(true); setSelectedTicket(null); }} 
          className="bg-accent hover:bg-accent/90 font-black uppercase italic gap-2 h-12 px-6 shadow-lg"
        >
          <Plus className="h-4 w-4" /> Nuevo Ticket
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-800 animate-in slide-in-from-top-4">
          <ShieldAlert className="h-10 w-10 shrink-0" />
          <div>
            <p className="font-black uppercase italic text-sm">Problema de Sincronización</p>
            <p className="text-xs font-medium italic">No se pudieron cargar tus datos. Reintenta en unos segundos o refresca la página.</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <History className="h-4 w-4 text-primary" /> Historial de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></div>
              ) : !tickets || tickets.length === 0 ? (
                <div className="p-10 text-center text-xs italic text-muted-foreground font-medium">
                  No tienes tickets activos. Si necesitas ayuda, abre uno nuevo.
                </div>
              ) : (
                <div className="divide-y divide-primary/5">
                  {tickets.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => { setSelectedTicket(t); setIsCreating(false); }}
                      className={cn(
                        "w-full text-left p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group",
                        selectedTicket?.id === t.id && "bg-muted/50 border-l-4 border-l-accent"
                      )}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">{t.updatedAt ? new Date(t.updatedAt.toDate()).toLocaleDateString() : '---'}</p>
                        <p className="font-black text-primary uppercase italic truncate group-hover:text-accent transition-colors">{t.subject}</p>
                        <Badge className={cn(
                          "text-[8px] uppercase font-black px-2",
                          t.status === 'Open' ? "bg-red-500" : t.status === 'InProgress' ? "bg-blue-500" : "bg-emerald-500"
                        )}>
                          {t.status === 'Open' ? 'Abierto' : t.status === 'InProgress' ? 'En Proceso' : 'Cerrado'}
                        </Badge>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {isCreating ? (
            <Card className="border-2 border-accent/20 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95">
              <CardHeader className="bg-accent/5 border-b p-8">
                <CardTitle className="text-2xl font-black text-primary uppercase italic">Nueva Consulta Técnica</CardTitle>
                <CardDescription className="font-medium italic">Describe el problema para que nuestro equipo pueda asistirte.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Asunto de la consulta</label>
                  <Input 
                    placeholder="Ej: Problema al auditar PDF / Facturación pendiente" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="h-12 bg-muted/20 border-none shadow-inner font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Detalle del requerimiento</label>
                  <Textarea 
                    placeholder="Escribe aquí tu mensaje..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[200px] bg-muted/20 border-none shadow-inner font-medium italic"
                  />
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1 h-12 font-black uppercase italic">Cancelar</Button>
                  <Button onClick={handleCreateTicket} disabled={isSyncing} className="flex-[2] h-12 bg-accent font-black uppercase italic shadow-lg gap-2">
                    {isSyncing ? <Loader2 className="animate-spin" /> : <><Send className="h-4 w-4" /> Enviar Mensaje</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTicket ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden flex flex-col h-[600px]">
                <CardHeader className="bg-primary text-white p-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Referencia #{selectedTicket.id.slice(0,5)}</p>
                      <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">{selectedTicket.subject}</CardTitle>
                    </div>
                    <Badge className="bg-white text-primary font-black uppercase text-[10px] px-4">{selectedTicket.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
                  {messages?.map(m => (
                    <div key={m.id} className={cn(
                      "flex flex-col max-w-[80%]",
                      m.senderRole === 'User' ? "ml-auto items-end" : "mr-auto items-start"
                    )}>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm font-medium shadow-sm",
                        m.senderRole === 'User' ? "bg-accent text-white rounded-tr-none" : "bg-white text-primary border-2 border-primary/5 rounded-tl-none"
                      )}>
                        {m.text}
                      </div>
                      <p className="text-[8px] font-black text-muted-foreground uppercase mt-1 px-1">
                        {m.senderRole === 'User' ? 'Tú' : 'Soporte PCG'} • {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </p>
                    </div>
                  ))}
                </CardContent>
                <CardContent className="p-6 border-t bg-white">
                  {selectedTicket.status === 'Closed' ? (
                    <div className="p-4 bg-emerald-50 rounded-xl flex items-center justify-center gap-2 text-emerald-700 font-black uppercase italic text-xs">
                      <CheckCircle2 className="h-4 w-4" /> Caso resuelto. Puedes abrir uno nuevo si persiste el problema.
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Responder aquí..." 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                        className="flex-1 bg-muted/30 border-none h-12"
                      />
                      <Button onClick={handleReply} disabled={isSyncing || !replyText} className="bg-accent h-12 w-12 rounded-xl">
                        {isSyncing ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-muted/10 rounded-[3rem] border-4 border-dashed border-primary/10">
              <div className="h-20 w-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                <MessageSquareText className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-xl font-black text-primary/40 uppercase italic text-center px-6 leading-tight">Selecciona un caso del historial <br/> para ver los detalles</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}