"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Plus } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

async function fetchClientes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("clientes")
    .select("id, name")
    .order("name", { ascending: true })
  if (error) throw error
  return data ?? []
}

async function fetchProveedores(clienteId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, name, tax_id")
    .eq("cliente_id", clienteId)
    .order("name", { ascending: true })
  if (error) throw error
  return data ?? []
}

export function OceanFreightCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [selectedClienteId, setSelectedClienteId] = useState("")
  const [selectedProveedorId, setSelectedProveedorId] = useState("")
  const [showNewProveedor, setShowNewProveedor] = useState(false)
  const [newProveedorName, setNewProveedorName] = useState("")
  const [newProveedorTaxId, setNewProveedorTaxId] = useState("")
  const [form, setForm] = useState({
    container_number: "",
    vessel_number: "",
    invoice_number: "",
    pedimento_number: "",
    bl_number: "",
  })
  const [saving, setSaving] = useState(false)

  const { data: clientes } = useSWR(open ? "clientes" : null, fetchClientes)
  const { data: proveedores, mutate: mutateProveedores } = useSWR(
    open && selectedClienteId ? `proveedores-${selectedClienteId}` : null,
    () => fetchProveedores(selectedClienteId)
  )

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setSelectedClienteId("")
    setSelectedProveedorId("")
    setShowNewProveedor(false)
    setNewProveedorName("")
    setNewProveedorTaxId("")
    setForm({
      container_number: "",
      vessel_number: "",
      invoice_number: "",
      pedimento_number: "",
      bl_number: "",
    })
  }

  async function handleCreateProveedor() {
    if (!newProveedorName.trim()) {
      toast.error("El nombre del proveedor es requerido")
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from("proveedores")
      .insert({
        name: newProveedorName.trim(),
        tax_id: newProveedorTaxId.trim() || null,
        cliente_id: selectedClienteId,
      })
      .select("id")
      .single()

    if (error) {
      toast.error("Error al crear proveedor: " + error.message)
      return
    }

    toast.success("Proveedor creado")
    setSelectedProveedorId(data.id)
    setShowNewProveedor(false)
    setNewProveedorName("")
    setNewProveedorTaxId("")
    mutateProveedores()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClienteId) {
      toast.error("Selecciona un cliente")
      return
    }
    if (!selectedProveedorId) {
      toast.error("Selecciona o crea un proveedor")
      return
    }

    const selectedCliente = clientes?.find((c) => c.id === selectedClienteId)
    const selectedProveedor = proveedores?.find((p) => p.id === selectedProveedorId)

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("ocean_freight").insert({
      client_name: selectedCliente?.name ?? "",
      cliente_id: selectedClienteId,
      vendor_name: selectedProveedor?.name ?? "",
      proveedor_id: selectedProveedorId,
      vendor_tax_id: selectedProveedor?.tax_id ?? null,
      container_number: form.container_number.trim() || null,
      vessel_number: form.vessel_number.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      pedimento_number: form.pedimento_number.trim() || null,
      bl_number: form.bl_number.trim() || null,
    })
    setSaving(false)

    if (error) {
      toast.error("Error al crear entrada: " + error.message)
    } else {
      toast.success("Entrada de Ocean Freight creada")
      resetForm()
      onOpenChange(false)
      onCreated()
    }
  }

  const extraFields = [
    { key: "container_number", label: "No. Contenedor", placeholder: "Número de contenedor" },
    { key: "vessel_number", label: "No. Vessel", placeholder: "Número de vessel" },
    { key: "invoice_number", label: "No. Invoice", placeholder: "Número de invoice" },
    { key: "pedimento_number", label: "No. Pedimento", placeholder: "Número de pedimento" },
    { key: "bl_number", label: "No. BL", placeholder: "Número de Bill of Lading" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Ocean Freight Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Cliente dropdown */}
          <div className="flex flex-col gap-2">
            <Label>
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedClienteId}
              onValueChange={(val) => {
                setSelectedClienteId(val)
                setSelectedProveedorId("")
                setShowNewProveedor(false)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proveedor dropdown + crear nuevo */}
          {selectedClienteId && (
            <div className="flex flex-col gap-2">
              <Label>
                Proveedor <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={selectedProveedorId}
                  onValueChange={setSelectedProveedorId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.tax_id ? `(${p.tax_id})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewProveedor(!showNewProveedor)}
                  title="Nuevo proveedor"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Inline new proveedor form */}
              {showNewProveedor && (
                <div className="rounded-lg border p-3 flex flex-col gap-3 bg-muted/30">
                  <p className="text-sm font-medium">Nuevo Proveedor</p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-prov-name">Nombre</Label>
                    <Input
                      id="new-prov-name"
                      placeholder="Nombre del proveedor"
                      value={newProveedorName}
                      onChange={(e) => setNewProveedorName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-prov-tax">Tax ID (opcional)</Label>
                    <Input
                      id="new-prov-tax"
                      placeholder="Tax ID del proveedor"
                      value={newProveedorTaxId}
                      onChange={(e) => setNewProveedorTaxId(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProveedor(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={handleCreateProveedor}>
                      Crear Proveedor
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extra fields */}
          {extraFields.map((f) => (
            <div key={f.key} className="flex flex-col gap-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => updateField(f.key, e.target.value)}
              />
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Creando..." : "Crear Entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
