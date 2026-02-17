
"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Headset, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Filter,
  User,
  MessageSquare
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminSupportPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  const isAuthorized = user?.email === 'control@pcgoperacion.com'

  const ticketsQuery = useMemoFirebase(() => {
    if (!db || !isAuthorized) return null
    return query(collection(db, "support_tickets"), orderBy("updatedAt", "desc"))
  }, [db, isAuthorized])

  const { data: tickets, isLoading } = useCollection(ticketsQuery)

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !selectedTicket || !isAuthorized) return null
    return query(
      collection(db, "support_tickets", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    )
  }, [db, selectedTicket, isAuthorized])

  const { data: messages } = useCollection(messagesQuery)

  const handleReply = async () => {
    if (!db || !user || !selectedTicket || !replyText || !isAuthorized) return
    setIsSyncing(true)
    try {
      await addDoc(collection(db, "support_tickets", selectedTicket.id, "messages"), {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: "Admin",
        text: replyText,
        createdAt: serverTimestamp()
      })

      await updateDoc(doc(db, "support_tickets", selectedTicket.id), {
        updatedAt: serverTimestamp(),
        lastMessage: replyText,
        status: "InProgress"
      })

      setReplyText("")
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    if (!db || !selectedTicket || !isAuthorized) return
    try {
      await updateDoc(doc(db, "support_tickets", selectedTicket.id), { status })
      toast({ title: `Ticket marcado como ${status}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    }
  }

  if (!isAuthorized) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Acceso Denegado</h2>
        <p className="text-muted-foreground font-medium italic">Esta sección es exclusiva para el administrador principal.</p>
      </div>
    )
  }

  const filteredTickets = tickets?.filter(t => statusFilter === "all" || t.status === statusFilter)

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-primary uppercase italic tracking-tighter flex items-center gap-3">
            <Headset className="h-8 w-8 text-accent" /> Centro de Operaciones Soporte
          </h2>
          <p className="text-muted-foreground font-medium italic">Gestión global de consultas y tickets de clientes.</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white border-2 font-black uppercase italic h-12">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold">Todos</SelectItem>
              <SelectItem value="Open" className="font-bold">Abiertos</SelectItem>
              <SelectItem value="InProgress" className="font-bold">En Proceso</SelectItem>
              <SelectItem value="Closed" className="font-bold">Cerrados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Filter className="h-3 w-3" /> Bandeja de Entrada ({filteredTickets?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[700px] overflow-y-auto">
              {isLoading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></div>
              ) : !filteredTickets || filteredTickets.length === 0 ? (
                <div className="p-10 text-center text-xs italic text-muted-foreground">No hay tickets que coincidan.</div>
              ) : (
                <div className="divide-y divide-primary/5">
                  {filteredTickets.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setSelectedTicket(t)}
                      className={cn(
                        "w-full text-left p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group",
                        selectedTicket?.id === t.id && "bg-muted/50 border-l-4 border-l-accent"
                      )}
                    >
                      <div className="space-y-1.5 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-muted-foreground uppercase">{t.updatedAt ? new Date(t.updatedAt.toDate()).toLocaleDateString() : '---'}</p>
                          <Badge className={cn(
                            "text-[7px] uppercase font-black h-4",
                            t.status === 'Open' ? "bg-red-500" : t.status === 'InProgress' ? "bg-blue-500" : "bg-emerald-500"
                          )}>
                            {t.status}
                          </Badge>
                        </div>
                        <p className="font-black text-primary uppercase italic truncate text-md">{t.subject}</p>
                        <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                          <User className="h-2.5 w-2.5" /> {t.userEmail}
                        </p>
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
          {selectedTicket ? (
            <div className="space-y-6">
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[700px]">
                <CardHeader className="bg-primary text-white p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-accent text-white uppercase font-black text-[9px] h-5 tracking-widest">TICKET #{selectedTicket.id.slice(0,8)}</Badge>
                        <p className="text-xs font-bold text-primary-foreground/60">{selectedTicket.userEmail}</p>
                      </div>
                      <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">{selectedTicket.subject}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant={selectedTicket.status === 'InProgress' ? "default" : "outline"} onClick={() => handleUpdateStatus('InProgress')} className="text-[9px] font-black uppercase h-8 bg-blue-600 border-none">Procesando</Button>
                      <Button size="sm" variant={selectedTicket.status === 'Closed' ? "default" : "outline"} onClick={() => handleUpdateStatus('Closed')} className="text-[9px] font-black uppercase h-8 bg-emerald-600 border-none">Cerrar</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-8 space-y-6 bg-muted/5 shadow-inner">
                  {messages?.map(m => (
                    <div key={m.id} className={cn(
                      "flex flex-col max-w-[85%]",
                      m.senderRole === 'Admin' ? "ml-auto items-end" : "mr-auto items-start"
                    )}>
                      <div className={cn(
                        "p-5 rounded-2xl text-sm font-medium shadow-md",
                        m.senderRole === 'Admin' ? "bg-primary text-white rounded-tr-none" : "bg-white text-primary border-2 border-primary/5 rounded-tl-none"
                      )}>
                        {m.text}
                      </div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 px-1 tracking-widest">
                        {m.senderRole === 'Admin' ? 'Tú (ADMIN)' : 'Usuario'} • {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleString([], {day:'2-digit', month:'2-digit', hour: '2-digit', minute:'2-digit'}) : '---'}
                      </p>
                    </div>
                  ))}
                </CardContent>
                <CardContent className="p-8 border-t bg-white">
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Escribe una respuesta resolutiva..." 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      className="flex-1 bg-muted/20 border-none h-14 font-medium italic"
                    />
                    <Button onClick={handleReply} disabled={isSyncing || !replyText} className="bg-accent h-14 w-14 rounded-2xl shadow-xl transform hover:scale-105 transition-all">
                      {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-40 bg-muted/10 rounded-[4rem] border-4 border-dashed border-primary/10">
              <div className="h-24 w-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 transform -rotate-6">
                <MessageSquare className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-2xl font-black text-primary/30 uppercase italic tracking-tighter">Selecciona un ticket para gestionar</h3>
              <p className="text-muted-foreground text-sm font-medium italic mt-2">La respuesta rápida mejora el NPS del SaaS.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
