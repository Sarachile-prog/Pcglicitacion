
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Search, PieChart, Info, Settings, Users, Mail, Sparkles, Calculator, ShieldCheck, Building2 } from "lucide-react"
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent,
  useSidebar
} from "@/components/ui/sidebar"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

export function SidebarNav() {
  const pathname = usePathname()
  const { setOpen, setOpenMobile, isMobile } = useSidebar()
  const { user } = useUser()
  const db = useFirestore()

  // Obtenemos el perfil para verificar roles
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  const isSuperAdmin = profile?.role === 'SuperAdmin' || user?.email === 'control@pcgoperacion.com'
  const isAdmin = profile?.role === 'Admin' || isSuperAdmin

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Licitaciones", href: "/bids", icon: Search },
    { name: "Análisis y Tendencias", href: "/trends", icon: PieChart },
  ]

  const adminItems = [
    { name: "Empresas y Usuarios", href: "/admin/leads", icon: Building2, show: isSuperAdmin },
    { name: "Campañas de Outreach", href: "/admin/outreach", icon: Mail, show: isSuperAdmin },
    { name: "Test de IA", href: "/admin/ai-test", icon: Sparkles, show: isSuperAdmin },
    { name: "Costos de Operación", href: "/admin/costs", icon: Calculator, show: isSuperAdmin },
  ]

  const supportItems = [
    { name: "Información Estado", href: "/state-info", icon: Info, show: true },
    { name: "Configuración", href: "/settings", icon: Settings, show: isAdmin },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] font-black tracking-widest">Navegación</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.name}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isSuperAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-accent uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" /> Control Operativo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    onClick={handleLinkClick}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] font-black tracking-widest">Soporte</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {supportItems.filter(i => i.show).map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.name}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  )
}
