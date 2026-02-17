"use client"

import { useState } from "react"
import useSWR from "swr"
import { Users, Plus, Search, Trash2, Mail, Pencil } from "lucide-react"
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

async function fetchClientes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("clientes")
    .select("id, name, email, created_at")
    .order("name", { ascending: true })

  if (error) throw error
  return data ?? []
}

interface EditingCliente {
  id: string
  name: string
  email: string
}

export function ClientesList() {
  const { data: clientes, isLoading, mutate } = useSWR("clientes", fetchClientes)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editing, setEditing] = useState<EditingCliente | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const filtered = clientes?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("El nombre del cliente es requerido")
      return
    }
    if (!newEmail.trim()) {
      toast.error("El correo del cliente es requerido")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("clientes")
      .insert({ name: newName.trim(), email: newEmail.trim().toLowerCase() })
    setSaving(false)

    if (error) {
      toast.error("Error al crear cliente: " + error.message)
    } else {
      toast.success("Cliente creado")
      setNewName("")
      setNewEmail("")
      setShowCreate(false)
      mutate()
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    if (!editing.name.trim()) {
      toast.error("El nombre del cliente es requerido")
      return
    }
    if (!editing.email.trim()) {
      toast.error("El correo del cliente es requerido")
      return
    }
    setEditSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("clientes")
      .update({ name: editing.name.trim(), email: editing.email.trim().toLowerCase() })
      .eq("id", editing.id)
    setEditSaving(false)

    if (error) {
      toast.error("Error al actualizar cliente: " + error.message)
    } else {
      toast.success("Cliente actualizado")
      setEditing(null)
      mutate()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el cliente "${name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("clientes").delete().eq("id", id)
    if (error) {
      toast.error("Error al eliminar cliente: " + error.message)
    } else {
      toast.success("Cliente eliminado")
      mutate()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los clientes del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o correo..."
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
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? "No se encontraron clientes" : "No hay clientes registrados"}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                Crear Primer Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered?.map((cliente) => (
            <Card key={cliente.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{cliente.name}</CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {cliente.email || "Sin correo"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing({ id: cliente.id, name: cliente.name, email: cliente.email || "" })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cliente.id, cliente.name)}
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
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-name">
                Nombre del Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-name"
                placeholder="Nombre del cliente"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-email">
                Correo Electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Creando..." : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">
                Nombre del Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="Nombre del cliente"
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : null)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-email">
                Correo Electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={editing?.email ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, email: e.target.value } : null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
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
