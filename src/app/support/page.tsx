"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquareText, 
  Plus, 
  Send, 
  Loader2, 
  ChevronRight,
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
    if (!db || !user?.uid) return null
    // Filtro obligatorio para cumplir con las reglas de seguridad
    return query(
      collection(db, "support_tickets"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    )
  }, [db, user?.uid])

  const { data: tickets, isLoading, error } = useCollection(ticketsQuery)

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !selectedTicket?.id) return null
    return query(
      collection(db, "support_tickets", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    )
  }, [db, selectedTicket?.id])

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

      toast({ title: "Ticket Creado" })
      setIsCreating(false)
      setNewSubject("")
      setNewMessage("")
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la consulta." })
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
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la respuesta." })
    } finally {
      setIsSyncing(false)
    }
  }

  if (isUserLoading) return <div className="flex flex-col items-center justify-center py-40 gap-4"><RefreshCw className="h-10 w-10 animate-spin text-primary opacity-20" /><p className="text-xs font-black uppercase italic tracking-widest">Cargando...</p></div>

  if (!user) return (
    <div className="max-w-md mx-auto py-20 text-center space-y-6">
      <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
      <h2 className="text-2xl font-black text-primary uppercase italic">Acceso Restringido</h2>
      <p className="text-muted-foreground font-medium italic">Inicia sesión para acceder a soporte técnico.</p>
      <Button onClick={() => window.location.href = '/login'} className="w-full bg-primary font-black uppercase italic">Ir al Login</Button>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-primary uppercase italic tracking-tighter">Mesa de Ayuda</h2>
          <p className="text-muted-foreground font-medium italic">Estamos aquí para asistirte técnicamente.</p>
        </div>
        <Button onClick={() => { setIsCreating(true); setSelectedTicket(null); }} className="bg-accent hover:bg-accent/90 font-black uppercase italic gap-2 h-12 shadow-lg"><Plus className="h-4 w-4" /> Nuevo Ticket</Button>
      </div>

      {error && (
        <Card className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-800">
          <ShieldAlert className="h-10 w-10" />
          <div><p className="font-black uppercase italic text-sm">Validación de Perfil</p><p className="text-xs italic">Asegúrate de haber completado tu registro de empresa.</p></div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-6"><CardTitle className="text-sm font-black uppercase flex items-center gap-2"><History className="h-4 w-4" /> Mis Consultas</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></div> : !tickets?.length ? <div className="p-10 text-center text-xs italic text-muted-foreground">No tienes tickets abiertos.</div> : (
                <div className="divide-y">
                  {tickets.map(t => (
                    <button key={t.id} onClick={() => { setSelectedTicket(t); setIsCreating(false); }} className={cn("w-full text-left p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group", selectedTicket?.id === t.id && "bg-muted/50 border-l-4 border-l-accent")}>
                      <div className="space-y-1 overflow-hidden">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">{t.updatedAt ? new Date(t.updatedAt.toDate()).toLocaleDateString('es-CL') : '---'}</p>
                        <p className="font-black text-primary uppercase italic truncate">{t.subject}</p>
                        <Badge className={cn("text-[8px] uppercase font-black", t.status === 'Open' ? "bg-red-500" : "bg-emerald-500")}>{t.status}</Badge>
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
            <Card className="border-2 border-accent/20 shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-accent/5 border-b p-8"><CardTitle className="text-2xl font-black text-primary uppercase italic">Nueva Consulta</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-60 ml-1">Asunto</label><Input placeholder="Ej: Problema con auditoría" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="h-12 bg-muted/20 border-none font-bold" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-60 ml-1">Detalle</label><Textarea placeholder="Escribe aquí..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[200px] bg-muted/20 border-none italic" /></div>
                <div className="flex gap-4"><Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1 h-12 uppercase font-black">Cancelar</Button><Button onClick={handleCreateTicket} disabled={isSyncing} className="flex-[2] h-12 bg-accent font-black uppercase italic">{isSyncing ? <Loader2 className="animate-spin" /> : "Enviar"}</Button></div>
              </CardContent>
            </Card>
          ) : selectedTicket ? (
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden flex flex-col h-[600px]">
              <CardHeader className="bg-primary text-white p-6"><CardTitle className="text-2xl font-black uppercase italic">{selectedTicket.subject}</CardTitle></CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
                {messages?.map(m => (
                  <div key={m.id} className={cn("flex flex-col max-w-[80%]", m.senderRole === 'User' ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn("p-4 rounded-2xl text-sm shadow-sm", m.senderRole === 'User' ? "bg-accent text-white rounded-tr-none" : "bg-white text-primary rounded-tl-none")}>{m.text}</div>
                    <p className="text-[8px] font-black uppercase mt-1 opacity-60">{m.senderRole === 'User' ? 'Tú' : 'Soporte PCG'} • {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
                  </div>
                ))}
              </CardContent>
              <CardContent className="p-6 border-t bg-white">
                <div className="flex gap-2">
                  <Input placeholder="Responder..." value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply()} className="flex-1 bg-muted/30 border-none h-12" />
                  <Button onClick={handleReply} disabled={isSyncing || !replyText} className="bg-accent h-12 w-12 rounded-xl">{isSyncing ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-muted/10 rounded-[3rem] border-4 border-dashed border-primary/10">
              <MessageSquareText className="h-12 w-12 text-accent opacity-20 mb-4" />
              <h3 className="text-xl font-black text-primary/40 uppercase italic">Selecciona un caso</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}