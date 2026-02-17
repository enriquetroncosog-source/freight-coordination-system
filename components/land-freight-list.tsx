"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Truck, Plus, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { LandFreightCreateDialog } from "@/components/land-freight-create-dialog"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { CAN_CREATE_FREIGHT } from "@/lib/auth"

async function fetchLandFreight() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("land_freight")
    .select("id, folio, client_name, freight_date, freight_time, origin, destination, carrier_name, status, description, created_at")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export function LandFreightList() {
  const { data: entries, isLoading, mutate } = useSWR("land-freight", fetchLandFreight)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuth()
  const canCreate = user && CAN_CREATE_FREIGHT.includes(user.role)

  const filtered = entries?.filter(
    (e) =>
      (e.folio?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.client_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.origin?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.destination?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.carrier_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Land Freight</h1>
          <p className="text-sm text-muted-foreground">
            Manage land freight shipments and carta porte documents
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Freight
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, origen, destino o carrier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Truck className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? "No se encontraron resultados" : "No hay entradas de Land Freight"}
            </p>
            {!search && canCreate && (
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                Crear Primera Entrada
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered?.map((entry) => (
            <Link key={entry.id} href={`/land/${entry.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {entry.folio && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                            {entry.folio}
                          </span>
                        )}
                        {entry.origin && entry.destination
                          ? `${entry.origin} → ${entry.destination}`
                          : entry.carrier_name ?? "Nuevo Flete"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {entry.client_name && `${entry.client_name} | `}
                        {entry.freight_date} a las {entry.freight_time}
                        {entry.carrier_name && ` | ${entry.carrier_name}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={entry.status} />
                </CardHeader>
                {entry.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <LandFreightCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => mutate()}
      />
    </div>
  )
}
