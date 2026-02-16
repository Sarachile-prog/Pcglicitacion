
"use client"

import { useState } from "react"
import { useCollection, useMemoFirebase, useUser, useFirestore } from "@/firebase"
import { collection, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Users, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Search as SearchIcon, 
  Loader2, 
  ArrowRight,
  UserPlus,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Mail,
  UserCog,
  UserCheck,
  Zap,
  MoreVertical,
  Edit3,
  Ban,
  Trash2,
  ExternalLink,
  ShieldAlert,
  UserMinus
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

  // Form states
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyRut, setNewCompanyRut] = useState("")
  const [newCompanyPlan, setNewCompanyPlan] = useState("Standard")

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

  const handleCreateCompany = async () => {
    if (!db || !newCompanyName || !newCompanyRut) return
    setIsSyncing(true)
    
    try {
      const companyId = newCompanyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const newCompanyRef = doc(db, "companies", companyId)
      
      await setDoc(newCompanyRef, {
        id: companyId,
        name: newCompanyName,
        rut: newCompanyRut,
        plan: newCompanyPlan,
        maxUsers: newCompanyPlan === 'Enterprise' ? 10 : 2,
        subscriptionStatus: 'Active',
        ufPriceBase: newCompanyPlan === 'Enterprise' ? 5 : 1.5,
        ufPriceExtraUser: 0.5,
        createdAt: new Date().toISOString()
      })

      toast({ title: "Empresa Creada", description: `${newCompanyName} ha sido dada de alta.` })
      setIsAddingCompany(false)
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
      const ref = doc(db, "companies", editingCompany.id)
      await updateDoc(ref, {
        name: editingCompany.name,
        rut: editingCompany.rut,
        plan: editingCompany.plan,
        maxUsers: editingCompany.plan === 'Enterprise' ? 10 : 2,
        ufPriceBase: editingCompany.plan === 'Enterprise' ? 5 : 1.5,
      })
      toast({ title: "Empresa Actualizada", description: "Los cambios han sido guardados." })
      setIsEditingCompany(false)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleCompanyStatus = async (company: any) => {
    if (!db) return
    const newStatus = company.subscriptionStatus === 'Active' ? 'Inactive' : 'Active'
    try {
      await updateDoc(doc(db, "companies", company.id), { subscriptionStatus: newStatus })
      toast({ title: "Estado Actualizado", description: `La empresa ahora está ${newStatus === 'Active' ? 'Activa' : 'Suspendida'}.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

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

  const handleToggleUserStatus = async (userProfile: any) => {
    if (!db) return
    const newStatus = userProfile.status === 'Suspended' ? 'Active' : 'Suspended'
    try {
      await updateDoc(doc(db, "users", userProfile.id), { status: newStatus })
      toast({ title: "Usuario Actualizado", description: `Estado: ${newStatus === 'Active' ? 'Activo' : 'Suspendido'}` })
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
        <h2 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Acceso de SuperAdministrador Requerido</h2>
        <p className="text-muted-foreground font-medium italic">Esta consola es de uso exclusivo para PCG Operaciones. Por favor, inicia sesión con tu cuenta de control.</p>
        <Button onClick={() => window.location.href = '/login'} className="w-full bg-primary font-black uppercase italic h-12">Ir al Login Administrativo</Button>
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
          <p className="text-muted-foreground font-medium italic">Gestión centralizada de empresas, planes y vinculación de equipos.</p>
        </div>
        
        <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 font-black gap-2 uppercase italic shadow-lg h-12 px-6">
              <Plus className="h-5 w-5" /> Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="space-y-2">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-black text-primary uppercase italic tracking-tighter">Alta de Nueva Empresa</DialogTitle>
              <DialogDescription className="font-medium italic">Configura los parámetros del arrendamiento mensual para el nuevo cliente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Nombre de la Empresa</Label>
                <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Ej: Construcciones Alfa S.A." className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">RUT / Tax ID</Label>
                <Input value={newCompanyRut} onChange={(e) => setNewCompanyRut(e.target.value)} placeholder="76.XXX.XXX-X" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Plan de Suscripción</Label>
                <Select value={newCompanyPlan} onValueChange={setNewCompanyPlan}>
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard" className="font-bold">Standard (1.5 UF - 2 Users)</SelectItem>
                    <SelectItem value="Enterprise" className="font-bold">Enterprise (5.0 UF - 10 Users)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCompany} disabled={isSyncing} className="w-full h-14 font-black uppercase italic text-lg shadow-xl">
                {isSyncing ? <Loader2 className="animate-spin" /> : "Confirmar Alta de Empresa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* MODAL DE EDICIÓN DE EMPRESA */}
      <Dialog open={isEditingCompany} onOpenChange={setIsEditingCompany}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary uppercase italic">Editar Empresa</DialogTitle>
            <DialogDescription>Modifica los parámetros de contrato del cliente.</DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Nombre Comercial</Label>
                <Input 
                  value={editingCompany.name} 
                  onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})} 
                  className="h-11 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">RUT Empresa</Label>
                <Input 
                  value={editingCompany.rut} 
                  onChange={(e) => setEditingCompany({...editingCompany, rut: e.target.value})} 
                  className="h-11 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Plan Contratado</Label>
                <Select 
                  value={editingCompany.plan} 
                  onValueChange={(val) => setEditingCompany({...editingCompany, plan: val})}
                >
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard" className="font-bold">Standard</SelectItem>
                    <SelectItem value="Enterprise" className="font-bold">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateCompany} disabled={isSyncing} className="w-full h-14 font-black uppercase italic text-lg shadow-xl">
              {isSyncing ? <Loader2 className="animate-spin" /> : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SECCIÓN DE PROSPECTOS */}
      <Card className="border-accent/20 bg-accent/5 rounded-3xl overflow-hidden shadow-xl">
        <CardHeader className="bg-accent/10 border-b p-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">
                <Zap className="h-5 w-5 text-accent animate-pulse" /> Prospectos en Espera de Activación
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium italic">Usuarios registrados o demo que aún no pertenecen a ninguna corporación.</p>
            </div>
            <Badge className="bg-accent text-white font-black px-4">{prospects.length} PENDIENTES</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader className="bg-white/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] py-4">Usuario / Identificador</TableHead>
                  <TableHead className="font-black uppercase text-[10px]">Tipo de Acceso</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] pr-6">Acción Rápida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUsersLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                ) : prospects.length > 0 ? (
                  prospects.map((u) => (
                    <TableRow key={u.id} className="hover:bg-white/80">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                            {u.email?.[0].toUpperCase() || '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{u.email || u.id}</span>
                            <span className="text-[9px] font-mono text-muted-foreground uppercase">{u.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.email ? "outline" : "secondary"} className="text-[8px] font-black uppercase">
                          {u.email ? "REGISTRADO" : "MODO DEMO"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 font-black text-[10px] uppercase italic h-8 px-4 gap-2">
                              <UserCheck className="h-3 w-3" /> Vincular a Empresa
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-black text-primary uppercase italic">Vincular Prospecto</DialogTitle>
                              <DialogDescription className="font-medium italic">Selecciona a qué empresa pertenece este usuario.</DialogDescription>
                            </DialogHeader>
                            <div className="py-6 space-y-4">
                              <div className="p-4 bg-muted/30 rounded-xl border space-y-1">
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Usuario Seleccionado</p>
                                <p className="font-bold text-primary">{u.email || u.id}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Empresa Destino</Label>
                                <Select onValueChange={(val) => handleAssignUser(u.id, val)}>
                                  <SelectTrigger className="h-12 font-bold">
                                    <SelectValue placeholder="Selecciona una empresa..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {companies?.map(c => (
                                      <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic text-xs font-bold uppercase">No hay usuarios pendientes de vinculación.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b bg-muted/20 p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar empresa por nombre o RUT..." 
                className="pl-10 h-12 bg-white/50 border-none shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Empresa / Tenant</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Plan</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Capacidad</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-6">Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCompaniesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto opacity-20" />
                  </TableCell>
                </TableRow>
              ) : filteredCompanies && filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="py-6 pl-6">
                      <div className="space-y-1">
                        <p className="font-black text-primary uppercase italic tracking-tighter text-lg">{company.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{company.rut}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.plan === 'Enterprise' ? 'default' : 'secondary'} className="font-black text-[10px] uppercase px-3 py-1">
                        {company.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={company.subscriptionStatus === 'Active' ? "bg-emerald-500" : "bg-red-500"}>
                        {company.subscriptionStatus === 'Active' ? "ACTIVO" : "SUSPENDIDO"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-xs uppercase italic">
                      <span className="text-primary font-black">{allUsers?.filter(u => u.companyId === company.id).length}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span>{company.maxUsers} USUARIOS</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                       <div className="flex justify-end items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="font-black text-[10px] uppercase gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-all h-9 px-4">
                                <UserPlus className="h-3.5 w-3.5" /> Vincular Equipo
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl rounded-3xl">
                              <DialogHeader className="space-y-2">
                                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center mb-2">
                                  <UserCog className="h-6 w-6 text-primary" />
                                </div>
                                <DialogTitle className="text-3xl font-black text-primary uppercase italic tracking-tighter">Vincular Equipo a {company.name}</DialogTitle>
                                <DialogDescription className="font-medium italic">Asigna usuarios registrados a esta corporación y define sus roles de acceso.</DialogDescription>
                              </DialogHeader>
                              <div className="max-h-[450px] overflow-auto border-2 border-primary/5 rounded-2xl mt-4">
                                  <Table>
                                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                      <TableRow>
                                        <TableHead className="font-black uppercase text-[10px]">Usuario</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Estado</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px]">Acciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {allUsers?.map(u => (
                                        <TableRow key={u.id} className="hover:bg-muted/20">
                                          <TableCell className="font-bold text-sm py-4">
                                            <div className="flex items-center gap-3">
                                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                                {u.email?.[0].toUpperCase() || '?'}
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="truncate max-w-[200px]">{u.email || u.id}</span>
                                                <span className="text-[9px] text-muted-foreground uppercase font-black">{u.role || 'USER'}</span>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              {u.companyId === company.id ? (
                                                <Badge className="bg-emerald-500 font-black uppercase text-[8px] tracking-widest">VINCULADO</Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/20 text-muted-foreground">
                                                  {u.companyId ? `EMPRESA: ${u.companyId}` : 'PROSPECTO'}
                                                </Badge>
                                              )}
                                              {u.status === 'Suspended' && <Badge variant="destructive" className="text-[8px] font-black uppercase">BLOQUEADO</Badge>}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                              {u.companyId !== company.id ? (
                                                <Button 
                                                  size="sm" 
                                                  variant="ghost" 
                                                  onClick={() => handleAssignUser(u.id, company.id, 'User')}
                                                  className="text-accent font-black text-[10px] uppercase italic h-8"
                                                >
                                                  Vincular <ArrowRight className="h-3 w-3 ml-1" />
                                                </Button>
                                              ) : (
                                                <>
                                                  <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleAssignUser(u.id, company.id, u.role === 'Admin' ? 'User' : 'Admin')}
                                                    className="border-primary/20 text-[9px] font-black uppercase h-8"
                                                  >
                                                    {u.role === 'Admin' ? 'Hacer User' : 'Hacer Admin'}
                                                  </Button>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuLabel className="text-[10px] font-black uppercase">Seguridad Usuario</DropdownMenuLabel>
                                                      <DropdownMenuItem onClick={() => handleToggleUserStatus(u)} className="text-red-600 font-bold gap-2">
                                                        <Ban className="h-4 w-4" /> {u.status === 'Suspended' ? 'Reactivar Cuenta' : 'Suspender Cuenta'}
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => handleAssignUser(u.id, null)} className="text-orange-600 font-bold gap-2">
                                                        <UserMinus className="h-4 w-4" /> Desvincular de Empresa
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted/50 rounded-full border border-transparent hover:border-primary/10">
                                <MoreVertical className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acciones Empresa</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setEditingCompany(company); setIsEditingCompany(true); }} className="gap-3 font-bold">
                                <Edit3 className="h-4 w-4 text-primary" /> Editar Datos Contrato
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleCompanyStatus(company)} className={company.subscriptionStatus === 'Active' ? "text-red-600 gap-3 font-bold" : "text-emerald-600 gap-3 font-bold"}>
                                <Ban className="h-4 w-4" /> {company.subscriptionStatus === 'Active' ? 'Suspender Servicio' : 'Activar Servicio'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-muted-foreground gap-3 font-bold">
                                <Trash2 className="h-4 w-4" /> Eliminar (Solo si no hay usuarios)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic font-medium">No hay empresas dadas de alta en el sistema.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
