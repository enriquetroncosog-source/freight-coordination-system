"use client"

import useSWR from "swr"
import Link from "next/link"
import { Ship, Truck, FileCheck, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { createClient } from "@/lib/supabase/client"

async function fetchDashboardData() {
  const supabase = createClient()
  const [oceanRes, landRes] = await Promise.all([
    supabase
      .from("ocean_freight")
      .select("id, vendor_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("land_freight")
      .select("id, freight_date, freight_time, origin, destination, carrier_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const [oceanCountRes, landCountRes] = await Promise.all([
    supabase.from("ocean_freight").select("status"),
    supabase.from("land_freight").select("status"),
  ])

  return {
    recentOcean: oceanRes.data ?? [],
    recentLand: landRes.data ?? [],
    oceanStats: {
      total: oceanCountRes.data?.length ?? 0,
      pending: oceanCountRes.data?.filter((r) => r.status === "pending_docs").length ?? 0,
      complete: oceanCountRes.data?.filter((r) => r.status === "docs_complete").length ?? 0,
      cleared: oceanCountRes.data?.filter((r) => r.status === "cleared").length ?? 0,
    },
    landStats: {
      total: landCountRes.data?.length ?? 0,
      pending:
        landCountRes.data?.filter((r) =>
          ["pending_data", "pending_carta_porte_layout", "pending_carta_porte"].includes(r.status)
        ).length ?? 0,
      active:
        landCountRes.data?.filter((r) =>
          ["ready", "dispatched", "green_light"].includes(r.status)
        ).length ?? 0,
      delivered: landCountRes.data?.filter((r) => r.status === "delivered").length ?? 0,
    },
  }
}

export function DashboardContent() {
  const { data, isLoading } = useSWR("dashboard", fetchDashboardData, {
    refreshInterval: 10000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of all freight operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ocean Freight
            </CardTitle>
            <Ship className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data.oceanStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.oceanStats.pending} pending, {data.oceanStats.cleared} cleared
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Land Freight
            </CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data.landStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.landStats.active} active, {data.landStats.delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Items
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {data.oceanStats.pending + data.landStats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {data.oceanStats.cleared + data.landStats.delivered}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.oceanStats.cleared} cleared, {data.landStats.delivered} delivered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Ocean Freight */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Recent Ocean Freight</CardTitle>
            </div>
            <Link href="/ocean">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentOcean.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FileCheck className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No ocean freight entries yet</p>
                <Link href="/ocean">
                  <Button variant="outline" size="sm">
                    Create First Entry
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recentOcean.map((item) => (
                  <Link
                    key={item.id}
                    href={`/ocean/${item.id}`}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Land Freight */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Recent Land Freight</CardTitle>
            </div>
            <Link href="/land">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentLand.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No land freight entries yet</p>
                <Link href="/land">
                  <Button variant="outline" size="sm">
                    Create First Entry
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recentLand.map((item) => (
                  <Link
                    key={item.id}
                    href={`/land/${item.id}`}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.origin && item.destination
                          ? `${item.origin} → ${item.destination}`
                          : item.carrier_name ?? "New Freight"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.freight_date} at {item.freight_time}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
