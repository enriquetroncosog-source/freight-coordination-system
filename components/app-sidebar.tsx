"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Ship, Truck, Users, Route, Shield, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { ROUTE_ACCESS, type UserRole } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const navItems: { label: string; href: string; icon: typeof LayoutDashboard; roles?: UserRole[] }[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Ocean Freight", href: "/ocean", icon: Ship, roles: ROUTE_ACCESS["/ocean"] },
  { label: "Land Freight", href: "/land", icon: Truck, roles: ROUTE_ACCESS["/land"] },
  { label: "Clientes", href: "/clientes", icon: Users, roles: ROUTE_ACCESS["/clientes"] },
  { label: "Carriers", href: "/carriers", icon: Route, roles: ROUTE_ACCESS["/carriers"] },
  { label: "Usuarios", href: "/admin", icon: Shield, roles: ROUTE_ACCESS["/admin"] },
]

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  operador: "Operador",
  cliente: "Cliente",
  transportista: "Transportista",
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return user && item.roles.includes(user.role)
  })

  return (
    <aside className="flex h-screen w-64 flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
      <div className="flex items-center gap-3 px-6 py-6">
        <Image
          src="/images/logo.png"
          alt="Core Integrated Solutions logo"
          width={40}
          height={40}
          className="rounded"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[hsl(var(--sidebar-primary))]">
            Core Integrated
          </span>
          <span className="text-xs text-[hsl(var(--sidebar-foreground))] opacity-70">
            Solutions LLC
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
                  : "text-[hsl(var(--sidebar-foreground))] opacity-70 hover:bg-[hsl(var(--sidebar-accent))] hover:opacity-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {user && (
        <div className="border-t border-[hsl(var(--sidebar-accent))] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium truncate max-w-[140px]">
                {user.full_name || user.email}
              </span>
              <Badge variant="secondary" className="w-fit text-xs">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Cerrar sesion"
              className="h-8 w-8 opacity-70 hover:opacity-100"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  )
}
