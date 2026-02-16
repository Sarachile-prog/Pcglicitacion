
"use client"

import { useState } from "react"
import { useCollection, useMemoFirebase, useUser, useFirestore } from "@/firebase"
import { collection, doc, setDoc, query, where } from "firebase/firestore"
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
  AlertCircle
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

export default function CompaniesManagementPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
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

  // Colección de Usuarios para asignar (vincular)
  const usersRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "users")
  }, [db])

  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersRef)

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

  const handleAssignUser = async (userId: string, companyId: string) => {
    if (!db) return
    try {
      await setDoc(doc(db, "users", userId), { companyId, role: 'User' }, { merge: true })
      toast({ title: "Usuario Vinculado", description: "El usuario ya tiene acceso al dashboard corporativo." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    }
  }

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.rut.includes(searchTerm)
  )

  if (!user || user.email !== 'control@pcgoperacion.com') {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black text-primary uppercase italic">Acceso Denegado</h2>
        <p className="text-muted-foreground">Solo el SuperAdministrador puede gestionar cuentas corporativas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic">Consola de Control Tenancy</h2>
          <p className="text-muted-foreground">Gestión centralizada de empresas, planes y vinculación de usuarios.</p>
        </div>
        
        <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 font-black gap-2 uppercase italic shadow-lg">
              <Plus className="h-4 w-4" /> Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary uppercase italic">Alta de Nueva Empresa</DialogTitle>
              <DialogDescription>Configura los parámetros del arrendamiento mensual.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Empresa</Label>
                <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Ej: Construcciones Alfa S.A." />
              </div>
              <div className="space-y-2">
                <Label>RUT / Tax ID</Label>
                <Input value={newCompanyRut} onChange={(e) => setNewCompanyRut(e.target.value)} placeholder="76.XXX.XXX-X" />
              </div>
              <div className="space-y-2">
                <Label>Plan de Suscripción</Label>
                <Select value={newCompanyPlan} onValueChange={setNewCompanyPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard (1.5 UF - 2 Users)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise (5.0 UF - 10 Users)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCompany} disabled={isSyncing} className="w-full h-12 font-black uppercase italic">
                {isSyncing ? <Loader2 className="animate-spin" /> : "Confirmar Alta de Empresa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-primary">
              <Building2 className="h-4 w-4" /> Total Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{companies?.length || 0}</div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Empresas con contrato activo</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-accent">
              <Users className="h-4 w-4" /> Usuarios Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent">{allUsers?.length || 0}</div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Entre todas las corporaciones</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-emerald-600">
              <ShieldCheck className="h-4 w-4" /> Salud de Cuentas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">100%</div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Suscripciones vigentes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar empresa por nombre o RUT..." 
                className="pl-10 h-11"
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
                <TableHead className="font-black uppercase text-[10px]">Empresa / Tenant</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Plan</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Capacidad</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Facturación</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px]">Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCompaniesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredCompanies && filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-black text-primary uppercase italic">{company.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground">{company.rut}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.plan === 'Enterprise' ? 'default' : 'secondary'} className="font-black text-[10px] uppercase">
                        {company.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-xs uppercase">
                      {allUsers?.filter(u => u.companyId === company.id).length} / {company.maxUsers} USUARIOS
                    </TableCell>
                    <TableCell className="font-black text-primary text-xs italic uppercase">
                      {company.ufPriceBase} UF / MES
                    </TableCell>
                    <TableCell className="text-right">
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button variant="outline" size="sm" className="font-black text-[10px] uppercase gap-2 border-primary text-primary">
                             <UserPlus className="h-3 w-3" /> Vincular Equipo
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-2xl">
                           <DialogHeader>
                             <DialogTitle className="text-2xl font-black text-primary uppercase italic">Vincular Usuarios a {company.name}</DialogTitle>
                             <DialogDescription>Asigna usuarios registrados a esta corporación.</DialogDescription>
                           </DialogHeader>
                           <div className="max-h-[400px] overflow-auto border rounded-xl">
                              <Table>
                                <TableBody>
                                  {allUsers?.map(u => (
                                    <TableRow key={u.id}>
                                      <TableCell className="font-bold text-xs">{u.email || u.id}</TableCell>
                                      <TableCell>
                                        {u.companyId === company.id ? (
                                          <Badge className="bg-emerald-500 font-black uppercase text-[8px]">YA VINCULADO</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[8px] font-black uppercase">{u.companyId || 'SIN EMPRESA'}</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          disabled={u.companyId === company.id}
                                          onClick={() => handleAssignUser(u.id, company.id)}
                                          className="text-accent font-black text-[10px] uppercase italic"
                                        >
                                          Vincular <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                           </div>
                         </DialogContent>
                       </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No hay empresas dadas de alta.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
