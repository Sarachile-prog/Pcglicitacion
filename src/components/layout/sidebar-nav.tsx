"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Search, PieChart, Info, Settings, Users, Mail } from "lucide-react"
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent,
  useSidebar
} from "@/components/ui/sidebar"

export function SidebarNav() {
  const pathname = usePathname()
  const { setOpen, setOpenMobile, isMobile } = useSidebar()

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpen(false)
    }
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Licitaciones", href: "/bids", icon: Search },
    { name: "Análisis y Tendencias", href: "/trends", icon: PieChart },
  ]

  const adminItems = [
    { name: "Empresas y Leads", href: "/admin/leads", icon: Users },
    { name: "Campañas de Outreach", href: "/admin/outreach", icon: Mail },
  ]

  const supportItems = [
    { name: "Información Estado", href: "/state-info", icon: Info },
    { name: "Configuración", href: "/settings", icon: Settings },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50">Principal</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.name}
                  className="hover:bg-sidebar-accent transition-colors"
                  onClick={handleLinkClick}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50">Inteligencia de Mercado</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.name}
                  className="hover:bg-sidebar-accent transition-colors"
                  onClick={handleLinkClick}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50">Sistema</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {supportItems.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.name}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">{item.name}</span>
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
