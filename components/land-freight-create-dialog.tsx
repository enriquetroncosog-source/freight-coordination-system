"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { LocationInput } from "@/components/location-input"
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

async function fetchCarriers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("carriers")
    .select("id, name")
    .order("name", { ascending: true })
  if (error) throw error
  return data ?? []
}

export function LandFreightCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [selectedClienteId, setSelectedClienteId] = useState("")
  const [selectedCarrierId, setSelectedCarrierId] = useState("")
  const [form, setForm] = useState({
    freight_date: "",
    freight_time: "",
    origin: "",
    destination: "",
    description: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const { data: clientes } = useSWR(open ? "clientes" : null, fetchClientes)
  const { data: carriers } = useSWR(open ? "carriers" : null, fetchCarriers)

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setSelectedClienteId("")
    setSelectedCarrierId("")
    setForm({
      freight_date: "",
      freight_time: "",
      origin: "",
      destination: "",
      description: "",
      notes: "",
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClienteId) {
      toast.error("Selecciona un cliente")
      return
    }
    if (!form.freight_date || !form.freight_time) {
      toast.error("Fecha y hora son requeridos")
      return
    }

    const selectedCliente = clientes?.find((c) => c.id === selectedClienteId)
    const selectedCarrier = carriers?.find((c) => c.id === selectedCarrierId)

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("land_freight").insert({
      cliente_id: selectedClienteId,
      client_name: selectedCliente?.name ?? "",
      carrier_id: selectedCarrierId || null,
      carrier_name: selectedCarrier?.name ?? null,
      freight_date: form.freight_date,
      freight_time: form.freight_time,
      origin: form.origin.trim() || null,
      destination: form.destination.trim() || null,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    })
    setSaving(false)

    if (error) {
      toast.error("Error al crear entrada: " + error.message)
    } else {
      toast.success("Land freight creado")
      resetForm()
      onOpenChange(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Land Freight</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Cliente dropdown */}
          <div className="flex flex-col gap-2">
            <Label>
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Carrier dropdown */}
          <div className="flex flex-col gap-2">
            <Label>Carrier</Label>
            <Select value={selectedCarrierId} onValueChange={setSelectedCarrierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <Input id="date" type="date" value={form.freight_date} onChange={(e) => updateField("freight_date", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">
                Hora <span className="text-destructive">*</span>
              </Label>
              <Input id="time" type="time" value={form.freight_time} onChange={(e) => updateField("freight_time", e.target.value)} />
            </div>
          </div>

          {/* Origin & Destination with location autocomplete */}
          <LocationInput
            label="Origen"
            value={form.origin}
            onChange={(name) => updateField("origin", name)}
          />
          <LocationInput
            label="Destino"
            value={form.destination}
            onChange={(name) => updateField("destination", name)}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="desc">Descripción</Label>
            <Textarea id="desc" placeholder="Descripción del flete..." value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={2} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="lnotes">Notas (opcional)</Label>
            <Textarea id="lnotes" placeholder="Notas adicionales..." value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Creando..." : "Crear Flete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
