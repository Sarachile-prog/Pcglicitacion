
"use client"

import { useState } from "react"
import { useCollection, useMemoFirebase, useUser, useFirestore, useDoc } from "@/firebase"
import { collection, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

// Importación unificada para evitar errores de referencia en desarrollo
import { 
  Building2, 
  ShieldCheck, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Zap, 
  MoreVertical, 
  Edit3, 
  Ban, 
  Trash2, 
  UserMinus, 
  CheckCircle2, 
  Save, 
  Lock, 
  Unlock, 
  Sparkles, 
  Mail, 
  Users 
} from "lucide-react"

export default function CompaniesManagementPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any>(null)
  const [companyToDelete, setCompanyToDelete] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Validación de SuperAdmin
  const myProfileRef = useMemoFirebase(() => user ? doc(db!, "users", user.uid) : null, [db, user])
  const { data: myProfile } = useDoc(myProfileRef)

  // Estados para nueva empresa rápida (desde prospecto)
  const [selectedProspect, setSelectedProspect] = useState<any>(null)
  const [quickCompanyName, setQuickCompanyName] = useState("")
  const [quickCompanyRut, setQuickCompanyRut] = useState("")

  // Estados para nueva empresa manual
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyRut, setNewCompanyRut] = useState("")

  // Datos de Firebase
  const companiesRef = useMemoFirebase(() => db ? collection(db, "companies") : null, [db])
  const { data: companies, isLoading: isCompaniesLoading } = useCollection(companiesRef)

  const usersRef = useMemoFirebase(() => db ? collection(db, "users") : null, [db])
  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersRef)

  const prospects = allUsers?.filter(u => !u.companyId && u.role !== 'SuperAdmin') || []
  const planRequests = prospects.filter(u => u.planRequested === true)

  const handleCreateCompany = async (name: string, rut: string, userId?: string) => {
    if (!db || !name || !rut) return
    setIsSyncing(true)
    
    // Cerramos diálogos antes de la operación asíncrona para evitar que la UI se trabe
    setIsAddingCompany(false)
    setSelectedProspect(null)

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

      toast({ title: "Empresa Creada", description: "Tenant activado correctamente." })
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
    const company = { ...editingCompany }
    setEditingCompany(null) // Cerrar diálogo
    setIsSyncing(true)
    try {
      await updateDoc(doc(db, "companies", company.id), company)
      toast({ title: "Cambios Guardados" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleCompanyStatus = async (companyId: string, currentStatus: string) => {
    if (!db) return
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
    try {
      await updateDoc(doc(db, "companies", companyId), { subscriptionStatus: newStatus })
      toast({ title: `Estado: ${newStatus}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    }
  }

  const handleDeleteCompany = async () => {
    if (!db || !companyToDelete) return
    const id = companyToDelete.id
    setCompanyToDelete(null) // Cerrar diálogo inmediatamente
    setIsSyncing(true)
    try {
      await deleteDoc(doc(db, "companies", id))
      toast({ title: "Tenant Eliminado" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAssignUser = async (userId: string, companyId: string | null) => {
    if (!db) return
    try {
      await updateDoc(doc(db, "users", userId), { companyId, role: companyId ? 'User' : 'User', status: 'Active' })
      toast({ title: companyId ? "Usuario Vinculado" : "Usuario Desvinculado" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || myProfile?.role === 'SuperAdmin'

  if (!user || !isSuperAdmin) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black text-primary uppercase italic">Acceso Restringido</h2>
        <p className="text-muted-foreground italic">Solo el SuperAdministrador puede gestionar esta área.</p>
      </div>
    )
  }

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.rut.includes(searchTerm)
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase italic tracking-tighter">Control de Tenancy</h2>
          <p className="text-muted-foreground italic">Gestión de empresas y usuarios del ecosistema.</p>
        </div>
        <Button onClick={() => setIsAddingCompany(true)} className="bg-primary font-black uppercase italic h-12 px-6">
          <Plus className="h-4 w-4 mr-2" /> Nueva Empresa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SOLICITUDES */}
        <Card className="border-2 border-accent/20 bg-accent/5 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="bg-accent/10 border-b p-6 flex flex-row justify-between items-center">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-primary uppercase italic">
              <Sparkles className="h-5 w-5 text-accent" /> Solicitudes
            </CardTitle>
            <Badge className="bg-accent text-white">{planRequests.length} PENDIENTES</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {planRequests.length === 0 ? (
              <div className="p-10 text-center italic text-muted-foreground text-xs">Sin solicitudes hoy.</div>
            ) : (
              <div className="divide-y divide-accent/10">
                {planRequests.map(u => (
                  <div key={u.id} className="p-6 flex justify-between items-center hover:bg-white/50 transition-colors">
                    <div className="space-y-1">
                      <p className="text-xl font-black text-primary uppercase italic leading-none">{u.requestedCompanyName || "No declarada"}</p>
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-accent font-black text-[10px] uppercase italic h-10"
                      onClick={() => { setSelectedProspect(u); setQuickCompanyName(u.requestedCompanyName || ""); }}
                    >
                      Activar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* NUEVOS REGISTROS */}
        <Card className="border-2 border-primary/10 bg-white rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="bg-muted/30 border-b p-6 flex flex-row justify-between items-center">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-primary uppercase italic">
              <Users className="h-5 w-5 text-primary" /> Nuevos Usuarios
            </CardTitle>
            <Badge variant="secondary">{prospects.length} TOTAL</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {prospects.filter(u => !u.planRequested).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="py-4 pl-6">
                      <p className="font-bold text-xs">{u.email}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase">{u.requestedCompanyName || "Sin empresa"}</p>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-[9px] font-black uppercase">Vincular</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {companies?.map(c => (
                            <DropdownMenuItem key={c.id} onClick={() => handleAssignUser(u.id, c.id)} className="text-xs font-bold">{c.name}</DropdownMenuItem>
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

      {/* CARTERA ACTIVA */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden mt-8">
        <CardHeader className="bg-primary/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-black text-primary uppercase italic tracking-tighter">Empresas Activas</CardTitle>
          </div>
          <Input 
            placeholder="Filtrar por nombre o RUT..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 bg-white"
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] pl-6">Empresa / Equipo</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Suscripción</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCompaniesLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredCompanies?.map((company) => {
                const companyUsers = allUsers?.filter(u => u.companyId === company.id) || []
                return (
                  <TableRow key={company.id} className="align-top hover:bg-muted/10">
                    <TableCell className="py-6 pl-6 space-y-4">
                      <div className="space-y-1">
                        <p className="font-black text-primary uppercase italic text-xl leading-none">{company.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{company.rut}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase opacity-40">Equipo ({companyUsers.length})</p>
                        {companyUsers.map(u => (
                          <div key={u.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-[10px] shadow-sm">
                            <span className="font-bold">{u.email}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400" onClick={() => handleAssignUser(u.id, null)}><UserMinus className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge variant="secondary" className="font-black text-[10px] mb-2">PLAN: {company.plan}</Badge>
                      <Badge className={cn("text-[9px] font-black block w-fit", company.subscriptionStatus === 'Active' ? "bg-emerald-500" : "bg-red-500")}>
                        {company.subscriptionStatus === 'Active' ? "ACTIVA" : "INACTIVA"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem className="font-bold text-xs gap-2" onClick={() => setEditingCompany(company)}><Edit3 className="h-3.5 w-3.5" /> Editar Plan</DropdownMenuItem>
                          <DropdownMenuItem className="font-bold text-xs gap-2" onClick={() => handleToggleCompanyStatus(company.id, company.subscriptionStatus)}>
                            {company.subscriptionStatus === 'Active' ? <><Ban className="h-3.5 w-3.5 text-red-500" /> Suspender</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Activar</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 font-bold text-xs gap-2" onClick={() => setCompanyToDelete(company)}><Trash2 className="h-3.5 w-3.5" /> Eliminar Tenant</DropdownMenuItem>
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

      {/* DIÁLOGOS CONTROLADOS POR ESTADO (CON CIERRE EXPLÍCITO) */}
      
      {/* 1. Alerta de Eliminación */}
      <AlertDialog open={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase italic">¿Eliminar permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>Estás a punto de borrar a <b>{companyToDelete?.name}</b>. Esta acción no tiene vuelta atrás.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold uppercase">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-red-600 font-black uppercase italic" disabled={isSyncing}>
              {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />} Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Diálogo de Registro Manual */}
      <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl font-black uppercase italic">Registrar Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Nombre</Label><Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">RUT</Label><Input value={newCompanyRut} onChange={(e) => setNewCompanyRut(e.target.value)} /></div>
            <Button onClick={() => handleCreateCompany(newCompanyName, newCompanyRut)} className="w-full h-12 font-black uppercase italic" disabled={isSyncing}>{isSyncing ? <Loader2 className="animate-spin" /> : "Crear Tenant"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Activación Rápida desde Prospecto */}
      <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl font-black uppercase italic">Activar Plan Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/20 rounded-xl"><p className="text-[9px] font-black uppercase opacity-50">Usuario</p><p className="font-bold text-xs">{selectedProspect?.email}</p></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Nombre de la Empresa</Label><Input value={quickCompanyName} onChange={(e) => setQuickCompanyName(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">RUT Corporativo</Label><Input value={quickCompanyRut} onChange={(e) => setQuickCompanyRut(e.target.value)} /></div>
            <Button onClick={() => handleCreateCompany(quickCompanyName, quickCompanyRut, selectedProspect?.id)} className="w-full h-12 bg-accent font-black uppercase italic" disabled={isSyncing}>
              {isSyncing ? <Loader2 className="animate-spin" /> : "Vincular y Activar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Editar Plan Existente */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl font-black uppercase italic">Editar Empresa</DialogTitle></DialogHeader>
          {editingCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Nombre</Label><Input value={editingCompany.name} onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})} /></div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Plan</Label>
                <Select value={editingCompany.plan} onValueChange={(v) => setEditingCompany({...editingCompany, plan: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Standard">Standard (1.5 UF)</SelectItem><SelectItem value="Enterprise">Enterprise (Custom)</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateCompany} className="w-full h-12 bg-primary font-black uppercase italic" disabled={isSyncing}><Save className="h-4 w-4 mr-2" /> Guardar Cambios</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
