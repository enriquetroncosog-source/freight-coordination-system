"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Ship, Truck, Users, Route } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Ocean Freight", href: "/ocean", icon: Ship },
  { label: "Land Freight", href: "/land", icon: Truck },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Carriers", href: "/carriers", icon: Route },
]

export function AppSidebar() {
  const pathname = usePathname()

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
        {navItems.map((item) => {
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

      <div className="px-6 py-4">
        <p className="text-xs text-[hsl(var(--sidebar-foreground))] opacity-40">
          Freight Coordination System
        </p>
      </div>
    </aside>
  )
}
