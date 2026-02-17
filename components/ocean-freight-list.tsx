"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Ship, Plus, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { OceanFreightCreateDialog } from "@/components/ocean-freight-create-dialog"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { CAN_CREATE_FREIGHT } from "@/lib/auth"

async function fetchOceanFreight() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("ocean_freight")
    .select("id, client_name, vendor_name, container_number, bl_number, status, created_at")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export function OceanFreightList() {
  const { data: entries, isLoading, mutate } = useSWR("ocean-freight", fetchOceanFreight)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuth()
  const canCreate = user && CAN_CREATE_FREIGHT.includes(user.role)

  const filtered = entries?.filter(
    (e) =>
      e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.container_number?.toLowerCase().includes(search.toLowerCase()) ||
      e.bl_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocean Freight</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor documents for MX Customs release
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, proveedor, contenedor o BL..."
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
            <Ship className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? "No se encontraron resultados" : "No hay entradas de Ocean Freight"}
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
            <Link key={entry.id} href={`/ocean/${entry.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Ship className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{entry.client_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Proveedor: {entry.vendor_name}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={entry.status} />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {entry.container_number && <span>Contenedor: {entry.container_number}</span>}
                    {entry.bl_number && <span>BL: {entry.bl_number}</span>}
                    <span>Creado: {new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <OceanFreightCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => mutate()}
      />
    </div>
  )
}
