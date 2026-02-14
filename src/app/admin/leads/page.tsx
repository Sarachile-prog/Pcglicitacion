
"use client"

import { useState } from "react"
import { useCollection, useMemoFirebase, useUser, useFirestore } from "@/firebase"
import { collection } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Mail, ExternalLink, UserPlus, Filter, Search as SearchIcon, Building2, ShieldAlert, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function LeadsManagementPage() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  
  const companiesRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "companies")
  }, [db, user])

  const { data: companies, isLoading: isCollectionLoading, error } = useCollection(companiesRef)

  // Datos mock para cuando la colección está vacía (común en el primer inicio)
  const mockLeads = [
    { id: "1", name: "Construcciones Alfa S.A.", taxId: "76.123.456-0", address: "Av. Providencia 1234", lastIdentifiedAt: new Date().toISOString() },
    { id: "2", name: "TecnoSalud SpA", taxId: "77.987.654-K", address: "Huerfanos 800", lastIdentifiedAt: new Date().toISOString() },
    { id: "3", name: "Servicios Integrales Omega", taxId: "76.444.222-1", address: "El Golf 50", lastIdentifiedAt: new Date().toISOString() }
  ]

  const displayLeads = companies && companies.length > 0 ? companies : mockLeads
  const isActuallyRestricted = error && (error as any).request?.method === 'list';

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando credenciales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Gestión de Leads</h2>
          <p className="text-muted-foreground">Empresas identificadas para outreach estratégico.</p>
        </div>
        <div className="flex gap-2">
           {!user && (
            <Link href="/login">
              <Button variant="outline" className="border-accent text-accent font-bold">Iniciar Sesión</Button>
            </Link>
          )}
          <Button className="bg-accent hover:bg-accent/90 font-bold">
            <UserPlus className="h-4 w-4 mr-2" /> Agregar Lead Manual
          </Button>
        </div>
      </div>

      {!user && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-10 w-10 text-orange-600 shrink-0" />
            <div>
              <h4 className="font-bold text-orange-800">Acceso Restringido</h4>
              <p className="text-sm text-orange-700 leading-relaxed">
                Debes iniciar sesión para ver los datos reales de prospección. Se muestran datos de ejemplo por ahora.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isActuallyRestricted && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-10 w-10 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800">Error de Permisos</h4>
              <p className="text-sm text-red-700 leading-relaxed">
                Tu usuario no tiene rango de administrador. Contacta al soporte para habilitar tu UID: <code className="bg-red-100 px-1 rounded text-xs">{user?.uid}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{displayLeads.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" /> Invitaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">12</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" /> Nuevos Rubros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">5</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o RUT..." 
                className="pl-10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11 px-6">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">Empresa</TableHead>
                  <TableHead className="font-bold">RUT / Tax ID</TableHead>
                  <TableHead className="font-bold">Ubicación</TableHead>
                  <TableHead className="font-bold">Detección</TableHead>
                  <TableHead className="text-right font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCollectionLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cargando base de datos...</p>
                    </TableCell>
                  </TableRow>
                ) : displayLeads.length > 0 ? (
                  displayLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-primary">{lead.name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{lead.taxId}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{lead.address}</TableCell>
                      <TableCell className="text-sm">{new Date(lead.lastIdentifiedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="text-accent hover:bg-accent/10">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">No se han identificado leads aún.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
