
"use client"

import { useState } from "react"
import { useCollection, useMemoFirebase, useUser, useFirestore } from "@/firebase"
import { collection, doc, setDoc, updateDoc, increment } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Building2, 
  ShieldCheck, 
  Plus, 
  Search as SearchIcon, 
  Loader2, 
  ArrowRight,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  UserCog,
  UserCheck,
  Zap,
  MoreVertical,
  Edit3,
  Ban,
  Trash2,
  UserMinus,
  Coins,
  Ticket
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

export default function CompaniesManagementPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [creditAmount, setCreditAmount] = useState("5")

  // Colección de Empresas
  const companiesRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "companies")
  }, [db])

  const { data: companies, isLoading: isCompaniesLoading } = useCollection(companiesRef)

  // Colección de Usuarios
  const usersRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "users")
  }, [db])

  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersRef)

  const prospects = allUsers?.filter(u => !u.companyId && u.role !== 'SuperAdmin') || []

  const handleAssignUser = async (userId: string, companyId: string | null, role: string = 'User') => {
    if (!db) return
    try {
      await setDoc(doc(db, "users", userId), { companyId, role, status: 'Active' }, { merge: true })
      toast({ 
        title: companyId ? "Usuario Vinculado" : "Usuario Desvinculado", 
        description: companyId ? "El usuario ya tiene acceso al dashboard corporativo." : "El usuario ha vuelto al modo Prospecto."
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleAddCredits = async (userId: string) => {
    if (!db) return
    const amount = parseInt(creditAmount)
    if (isNaN(amount)) return

    try {
      await updateDoc(doc(db, "users", userId), {
        aiCredits: increment(amount)
      })
      toast({ title: "Créditos Cargados", description: `Se han añadido ${amount} análisis al usuario.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.rut.includes(searchTerm)
  )

  const isSuperAdmin = user?.email === 'control@pcgoperacion.com'

  if (!user || !isSuperAdmin) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Acceso Requerido</h2>
        <Button onClick={() => window.location.href = '/login'} className="w-full bg-primary font-black uppercase italic h-12">Login Administrativo</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic tracking-tighter">Gestión de Clientes y Pagos</h2>
          </div>
          <p className="text-muted-foreground font-medium italic">Administra suscripciones y recarga créditos de análisis IA.</p>
        </div>
      </div>

      {/* SECCIÓN DE PROSPECTOS / RECARGAS */}
      <Card className="border-accent/20 bg-accent/5 rounded-3xl overflow-hidden shadow-xl">
        <CardHeader className="bg-accent/10 border-b p-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">
              <Ticket className="h-5 w-5 text-accent" /> Recargas y Usuarios Pendientes
            </CardTitle>
            <Badge className="bg-accent text-white font-black px-4">{prospects.length} PERSONAS</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] py-4">Usuario</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Créditos Actuales</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] pr-6">Acción de Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : prospects.map((u) => (
                <TableRow key={u.id} className="hover:bg-white/80">
                  <TableCell className="py-4 pl-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{u.email || "Usuario Anónimo"}</span>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">{u.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-black text-primary border-primary/20">
                      <Coins className="h-3 w-3 mr-1" /> {u.aiCredits || 0} DISPONIBLES
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="font-black text-[10px] uppercase italic h-8 gap-2 border-accent text-accent">
                            <Plus className="h-3 w-3" /> Cargar Créditos
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs">
                          <DialogHeader>
                            <DialogTitle className="font-black uppercase italic">Recarga Manual</DialogTitle>
                            <DialogDescription>Añadir análisis al balance del usuario.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase">Cantidad de Análisis</Label>
                              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="h-12 text-center text-xl font-black" />
                            </div>
                            <Button onClick={() => handleAddCredits(u.id)} className="w-full h-12 font-black uppercase italic">Confirmar Recarga</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button size="sm" onClick={() => handleAssignUser(u.id, "empresa-pendiente")} className="font-black text-[10px] uppercase italic h-8">
                        Vincular Empresa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b bg-muted/20 p-6">
          <Input 
            placeholder="Buscar empresa por nombre o RUT..." 
            className="h-12 bg-white/50 border-none shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] py-4">Empresa</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Plan</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Estado</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] pr-6">Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCompaniesLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-24"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredCompanies?.map((company) => (
                <TableRow key={company.id} className="hover:bg-muted/30">
                  <TableCell className="py-6 pl-6">
                    <p className="font-black text-primary uppercase italic tracking-tighter">{company.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{company.rut}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-black text-[10px] uppercase">{company.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={company.subscriptionStatus === 'Active' ? "bg-emerald-500" : "bg-red-500"}>
                      {company.subscriptionStatus === 'Active' ? "ACTIVO" : "INACTIVO"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="font-bold">Editar Empresa</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 font-bold">Suspender Servicio</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
