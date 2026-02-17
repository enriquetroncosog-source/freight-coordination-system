"use client"

import { useState } from "react"
import useSWR from "swr"
import { Truck, Plus, Search, Trash2, Mail, Phone, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

async function fetchCarriers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("carriers")
    .select("id, name, phone, email, created_at")
    .order("name", { ascending: true })

  if (error) throw error
  return data ?? []
}

interface EditingCarrier {
  id: string
  name: string
  phone: string
  email: string
}

export function CarriersList() {
  const { data: carriers, isLoading, mutate } = useSWR("carriers", fetchCarriers)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<EditingCarrier | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const filtered = carriers?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("El nombre del carrier es requerido")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("carriers").insert({
      name: newName.trim(),
      phone: newPhone.trim() || null,
      email: newEmail.trim().toLowerCase() || null,
    })
    setSaving(false)

    if (error) {
      toast.error("Error al crear carrier: " + error.message)
    } else {
      toast.success("Carrier creado")
      setNewName("")
      setNewPhone("")
      setNewEmail("")
      setShowCreate(false)
      mutate()
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    if (!editing.name.trim()) {
      toast.error("El nombre del carrier es requerido")
      return
    }
    setEditSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("carriers")
      .update({
        name: editing.name.trim(),
        phone: editing.phone.trim() || null,
        email: editing.email.trim().toLowerCase() || null,
      })
      .eq("id", editing.id)
    setEditSaving(false)

    if (error) {
      toast.error("Error al actualizar carrier: " + error.message)
    } else {
      toast.success("Carrier actualizado")
      setEditing(null)
      mutate()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el carrier "${name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("carriers").delete().eq("id", id)
    if (error) {
      toast.error("Error al eliminar carrier: " + error.message)
    } else {
      toast.success("Carrier eliminado")
      mutate()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carriers</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los transportistas del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Carrier
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o correo..."
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
              {search ? "No se encontraron carriers" : "No hay carriers registrados"}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                Crear Primer Carrier
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered?.map((carrier) => (
            <Card key={carrier.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{carrier.name}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {carrier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {carrier.phone}
                        </span>
                      )}
                      {carrier.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {carrier.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing({
                      id: carrier.id,
                      name: carrier.name,
                      phone: carrier.phone || "",
                      email: carrier.email || "",
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(carrier.id, carrier.name)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Carrier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="carrier-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input id="carrier-name" placeholder="Nombre del carrier" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="carrier-phone">Teléfono</Label>
              <Input id="carrier-phone" type="tel" placeholder="Teléfono" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="carrier-email">Correo Electrónico</Label>
              <Input id="carrier-email" type="email" placeholder="correo@ejemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Creando..." : "Crear Carrier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Carrier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-carrier-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-carrier-name" placeholder="Nombre del carrier" value={editing?.name ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : null)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-carrier-phone">Teléfono</Label>
              <Input id="edit-carrier-phone" type="tel" placeholder="Teléfono" value={editing?.phone ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, phone: e.target.value } : null)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-carrier-email">Correo Electrónico</Label>
              <Input id="edit-carrier-email" type="email" placeholder="correo@ejemplo.com" value={editing?.email ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, email: e.target.value } : null)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" disabled={editSaving} className="bg-primary text-primary-foreground">
                {editSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
