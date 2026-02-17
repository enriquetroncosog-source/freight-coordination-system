"use client"

import { useState } from "react"
import useSWR from "swr"
import { Shield, Plus, Search, Trash2, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/lib/auth"

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  operador: "Operador",
  cliente: "Cliente",
  transportista: "Transportista",
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700",
  operador: "bg-blue-100 text-blue-700",
  cliente: "bg-green-100 text-green-700",
  transportista: "bg-amber-100 text-amber-700",
}

async function fetchUsers() {
  const res = await fetch("/api/admin/users")
  if (!res.ok) throw new Error("Failed to fetch users")
  return res.json()
}

async function fetchClientes() {
  const supabase = createClient()
  const { data } = await supabase.from("clientes").select("id, name").order("name")
  return data ?? []
}

async function fetchCarriers() {
  const supabase = createClient()
  const { data } = await supabase.from("carriers").select("id, name").order("name")
  return data ?? []
}

export function UserManagement() {
  const { data: users, isLoading, mutate } = useSWR("admin-users", fetchUsers)
  const { data: clientes } = useSWR("clientes-for-users", fetchClientes)
  const { data: carriers } = useSWR("carriers-for-users", fetchCarriers)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "operador" as UserRole,
    cliente_id: "",
    carrier_id: "",
  })

  const filtered = users?.filter(
    (u: { email: string; full_name: string; role: string }) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  )

  function resetForm() {
    setForm({
      email: "",
      password: "",
      full_name: "",
      role: "operador",
      cliente_id: "",
      carrier_id: "",
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Todos los campos obligatorios son requeridos")
      return
    }
    if (form.role === "cliente" && !form.cliente_id) {
      toast.error("Selecciona un cliente para este usuario")
      return
    }
    if (form.role === "transportista" && !form.carrier_id) {
      toast.error("Selecciona un carrier para este usuario")
      return
    }

    setSaving(true)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const result = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(result.error ?? "Error al crear usuario")
      return
    }

    toast.success("Usuario creado exitosamente")
    resetForm()
    setShowCreate(false)
    mutate()
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`¿Eliminar el usuario "${email}"? Esta accion no se puede deshacer.`)) return

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    const result = await res.json()

    if (!res.ok) {
      toast.error(result.error ?? "Error al eliminar usuario")
      return
    }

    toast.success("Usuario eliminado")
    mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion de Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Crear y administrar usuarios del sistema
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowCreate(true)
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, correo o rol..."
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
              {search ? "No se encontraron usuarios" : "No hay usuarios registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered?.map((user: {
            id: string
            email: string
            full_name: string
            role: UserRole
            cliente_id: string | null
            carrier_id: string | null
            clientes: { name: string } | null
            carriers: { name: string } | null
            created_at: string
          }) => (
            <Card key={user.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{user.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      {user.clientes?.name && (
                        <span className="text-xs text-muted-foreground">
                          Cliente: {user.clientes.name}
                        </span>
                      )}
                      {user.carriers?.name && (
                        <span className="text-xs text-muted-foreground">
                          Carrier: {user.carriers.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(user.id, user.email)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                Nombre Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Nombre completo"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Correo Electronico <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Contrasena <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Minimo 6 caracteres"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.role}
                onValueChange={(val) =>
                  setForm({ ...form, role: val as UserRole, cliente_id: "", carrier_id: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="transportista">Transportista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "cliente" && (
              <div className="flex flex-col gap-2">
                <Label>
                  Cliente Asociado <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.cliente_id}
                  onValueChange={(val) => setForm({ ...form, cliente_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((c: { id: string; name: string }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === "transportista" && (
              <div className="flex flex-col gap-2">
                <Label>
                  Carrier Asociado <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.carrier_id}
                  onValueChange={(val) => setForm({ ...form, carrier_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers?.map((c: { id: string; name: string }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
