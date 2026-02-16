
"use client"

import { useState } from "react"
import { useCollection, useMemoFirebase, useUser, useFirestore } from "@/firebase"
import { collection, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
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
  Ticket,
  ExternalLink,
  ChevronRight,
  Save,
  Lock,
  Unlock,
  Sparkles,
  Mail
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
import { cn } from "@/lib/utils"

export default function CompaniesManagementPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Estados para nueva empresa rápida (desde prospecto)
  const [selectedProspect, setSelectedProspect] = useState<any>(null)
  const [quickCompanyName, setQuickCompanyName] = useState("")
  const [quickCompanyRut, setQuickCompanyRut] = useState("")

  // Estados para nueva empresa manual
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyRut, setNewCompanyRut] = useState("")

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
  const planRequests = prospects.filter(u => u.planRequested === true)

  const handleCreateCompany = async (name: string, rut: string, userId?: string) => {
    if (!db || !name || !rut) return
    setIsSyncing(true)
    const companyId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    try {
      await setDoc(doc(db, "companies", companyId), {
        id: companyId,
        name: name,
        rut: rut,
        plan: 'Standard',
        subscriptionStatus: 'Active',
        maxUsers: 2,
        createdAt: new Date().toISOString()
      })

      if (userId) {
        await updateDoc(doc(db, "users", userId), { 
          companyId, 
          role: 'Admin', 
          status: 'Active',
          planRequested: false 
        })
      }

      toast({ title: "Empresa Creada y Vinculada", description: "El tenant está activo." })
      setIsAddingCompany(false)
      setSelectedProspect(null)
      setNewCompanyName("")
      setNewCompanyRut("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUpdateCompany = async () => {
    if (!db || !editingCompany) return
    setIsSyncing(true)
    try {
      await updateDoc(doc(db, "companies", editingCompany.id), editingCompany)
      toast({ title: "Empresa Actualizada", description: "Cambios guardados correctamente." })
      setEditingCompany(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAssignUser = async (userId: string, companyId: string | null, role: string = 'User') => {
    if (!db) return
    try {
      await updateDoc(doc(db, "users", userId), { companyId, role, status: 'Active' })
      toast({ 
        title: companyId ? "Usuario Vinculado" : "Usuario Desvinculado", 
        description: companyId ? "El usuario ya tiene acceso al dashboard corporativo." : "El usuario ha vuelto al modo Prospecto."
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const handleUpdateUserStatus = async (userId: string, status: 'Active' | 'Suspended') => {
    if (!db) return
    try {
      await updateDoc(doc(db, "users", userId), { status })
      toast({ title: status === 'Active' ? "Usuario Activado" : "Usuario Suspendido" })
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
            <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic tracking-tighter">Consola de Control Tenancy</h2>
          </div>
          <p className="text-muted-foreground font-medium italic">Gestiona empresas, planes de suscripción y usuarios corporativos.</p>
        </div>
        <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 font-black shadow-lg uppercase italic h-12 px-6">
              <Plus className="h-4 w-4" /> Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary uppercase italic">Registrar Empresa Cliente</DialogTitle>
              <DialogDescription>Crea un nuevo tenant aislado en el sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Nombre de la Empresa</Label>
                <Input placeholder="Ej: Alfa Ingeniería SpA" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">RUT Corporativo</Label>
                <Input placeholder="77.665.443-K" value={newCompanyRut} onChange={(e) => setNewCompanyRut(e.target.value)} />
              </div>
              <Button onClick={() => handleCreateCompany(newCompanyName, newCompanyRut)} className="w-full h-12 font-black uppercase italic" disabled={isSyncing}>
                {isSyncing ? <Loader2 className="animate-spin" /> : "Crear Tenant Corporativo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMNA SOLICITUDES */}
        <Card className="border-accent/20 bg-accent/5 rounded-3xl overflow-hidden shadow-xl border-2">
          <CardHeader className="bg-accent/10 border-b p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">
                <Sparkles className="h-5 w-5 text-accent" /> Solicitudes de Activación
              </CardTitle>
              <Badge className="bg-accent text-white font-black px-4 animate-bounce">{planRequests.length} INTERESADOS</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {planRequests.length === 0 ? (
              <div className="p-10 text-center italic text-muted-foreground font-medium text-xs">No hay solicitudes pendientes hoy.</div>
            ) : (
              <div className="divide-y divide-accent/10">
                {planRequests.map(u => (
                  <div key={u.id} className="p-6 space-y-4 hover:bg-white/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest">Empresa Prospecto</p>
                        <p className="text-xl font-black text-primary uppercase italic leading-none">{u.requestedCompanyName || "No declarada"}</p>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-accent text-accent font-black text-[9px] uppercase">URGENTE</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 font-black text-[10px] uppercase italic h-10 bg-accent"
                        onClick={() => {
                          setSelectedProspect(u);
                          setQuickCompanyName(u.requestedCompanyName || "");
                        }}
                      >
                        Crear Empresa y Vincular
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* COLUMNA PROSPECTOS GENERALES */}
        <Card className="border-primary/10 bg-white rounded-3xl overflow-hidden shadow-xl border-2">
          <CardHeader className="bg-muted/30 border-b p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">
                <Users className="h-5 w-5 text-primary" /> Nuevos Registros
              </CardTitle>
              <Badge variant="secondary" className="font-black px-4">{prospects.length} TOTAL</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px]">Email / Empresa</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.filter(u => !u.planRequested).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="py-4 pl-6">
                      <p className="font-bold text-xs text-primary">{u.email}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase">{u.requestedCompanyName || "Sin empresa"}</p>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="font-black text-[9px] uppercase">Vincular</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {companies?.map(c => (
                            <DropdownMenuItem key={c.id} className="font-bold text-xs" onClick={() => handleAssignUser(u.id, c.id)}>
                              {c.name}
                            </DropdownMenuItem>
                          ))}
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

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl mt-12">
        <CardHeader className="border-b bg-primary/5 p-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl font-black text-primary uppercase italic tracking-tighter">Cartera de Empresas Activas</CardTitle>
            </div>
            <Input 
              placeholder="Buscar empresa por nombre o RUT..." 
              className="h-12 bg-white border-primary/10 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] py-4 pl-6">Empresa / Equipo</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Plan / Suscripción</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCompaniesLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-24"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredCompanies?.map((company) => {
                const companyUsers = allUsers?.filter(u => u.companyId === company.id) || []
                return (
                  <TableRow key={company.id} className="hover:bg-muted/10 align-top">
                    <TableCell className="py-6 pl-6 space-y-4">
                      <div className="space-y-1">
                        <p className="font-black text-primary uppercase italic tracking-tighter text-xl leading-none">{company.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{company.rut}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Equipo Vinculado ({companyUsers.length})</p>
                        <div className="space-y-1">
                          {companyUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between bg-white p-2 rounded-xl border text-[10px] shadow-sm">
                              <div className="flex flex-col">
                                <span className="font-bold text-primary">{u.email}</span>
                                <span className="text-[8px] uppercase opacity-60">{u.role} • {u.status || 'Active'}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateUserStatus(u.id, u.status === 'Suspended' ? 'Active' : 'Suspended')}>
                                  {u.status === 'Suspended' ? <Unlock className="h-3 w-3 text-emerald-500" /> : <Lock className="h-3 w-3 text-red-400" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => handleAssignUser(u.id, null)}>
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-2">
                        <Badge variant="secondary" className="font-black text-[10px] uppercase block w-fit">PLAN: {company.plan}</Badge>
                        <Badge className={cn("text-[9px] font-black uppercase shadow-sm", company.subscriptionStatus === 'Active' ? "bg-emerald-500" : "bg-red-500")}>
                          {company.subscriptionStatus === 'Active' ? "SUSCRIPCIÓN ACTIVA" : "INACTIVA / PENDIENTE"}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground italic font-medium">Expira: {company.subscriptionExpiresAt ? new Date(company.subscriptionExpiresAt).toLocaleDateString() : 'No definida'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-10 w-10 border-primary/20"><MoreVertical className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-[9px] font-black uppercase">Gestión Administrativa</DropdownMenuLabel>
                          <DropdownMenuItem className="font-bold text-xs gap-2" onClick={() => setEditingCompany(company)}>
                            <Edit3 className="h-3.5 w-3.5" /> Editar Datos / Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-bold text-xs gap-2" onClick={() => {
                            const newStatus = company.subscriptionStatus === 'Active' ? 'Inactive' : 'Active'
                            updateDoc(doc(db!, "companies", company.id), { subscriptionStatus: newStatus })
                          }}>
                            {company.subscriptionStatus === 'Active' ? <><Ban className="h-3.5 w-3.5 text-red-500" /> Suspender Servicio</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Activar Servicio</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 font-bold text-xs gap-2" onClick={() => {
                            if (confirm("¿Estás seguro de eliminar esta empresa?")) deleteDoc(doc(db!, "companies", company.id))
                          }}>
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOGO DE ACTIVACIÓN RÁPIDA (DESDE PROSPECTO) */}
      <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary uppercase italic">Activar Plan Corporativo</DialogTitle>
            <DialogDescription>Convertir prospecto en cliente vinculado.</DialogDescription>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/20 rounded-xl space-y-1">
                <p className="text-[9px] font-black uppercase text-muted-foreground">Usuario</p>
                <p className="font-bold text-sm">{selectedProspect.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Nombre de la Empresa</Label>
                <Input value={quickCompanyName} onChange={(e) => setQuickCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">RUT Empresa (Opcional)</Label>
                <Input placeholder="77.665.443-K" value={quickCompanyRut} onChange={(e) => setQuickCompanyRut(e.target.value)} />
              </div>
              <Button onClick={() => handleCreateCompany(quickCompanyName, quickCompanyRut, selectedProspect.id)} className="w-full h-12 bg-accent hover:bg-accent/90 font-black uppercase italic gap-2 shadow-xl" disabled={isSyncing}>
                {isSyncing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Crear y Activar Plan</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOGO DE EDICIÓN GENERAL */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary uppercase italic">Editar Empresa</DialogTitle>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Nombre</Label>
                <Input value={editingCompany.name} onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">RUT</Label>
                <Input value={editingCompany.rut} onChange={(e) => setEditingCompany({...editingCompany, rut: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Plan de Suscripción</Label>
                <Select value={editingCompany.plan} onValueChange={(val) => setEditingCompany({...editingCompany, plan: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard" className="font-bold">Plan Standard (1.5 UF)</SelectItem>
                    <SelectItem value="Enterprise" className="font-bold">Plan Enterprise (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Fecha de Expiración</Label>
                <Input type="date" value={editingCompany.subscriptionExpiresAt?.split('T')[0] || ""} onChange={(e) => setEditingCompany({...editingCompany, subscriptionExpiresAt: new Date(e.target.value).toISOString()})} />
              </div>
              <Button onClick={handleUpdateCompany} className="w-full h-12 bg-accent hover:bg-accent/90 font-black uppercase italic gap-2 shadow-xl" disabled={isSyncing}>
                {isSyncing ? <Loader2 className="animate-spin" /> : <><Save className="h-4 w-4" /> Guardar Cambios</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
