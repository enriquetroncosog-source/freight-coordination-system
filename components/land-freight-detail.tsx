"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Send,
  CircleDot,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { StatusBadge } from "@/components/status-badge"
import { FileUpload } from "@/components/file-upload"
import { LocationInput } from "@/components/location-input"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { CAN_EDIT_FREIGHT, CAN_DELETE_FREIGHT, CAN_UPLOAD_DOCS } from "@/lib/auth"

const LAND_DOC_TYPES = [
  { key: "freight_data", label: "Freight Data" },
  { key: "carta_porte_layout", label: "Carta Porte Layout" },
  { key: "carta_porte", label: "Carta Porte" },
  { key: "load_order", label: "Load Order" },
] as const

const DOC_PROGRESS_STEPS = [
  { key: "freight_data", label: "Transport Data" },
  { key: "carta_porte_layout", label: "Carta Porte Layout" },
  { key: "carta_porte", label: "Carta Porte" },
] as const

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

async function fetchLandDetail(id: string) {
  const sb = createClient()
  const [entryRes, docsRes] = await Promise.all([
    sb.from("land_freight").select("*, clientes(email), carriers(email)").eq("id", id).single(),
    sb
      .from("land_freight_documents")
      .select("*")
      .eq("land_freight_id", id)
      .order("uploaded_at", { ascending: false }),
  ])

  if (entryRes.error) throw entryRes.error
  return {
    entry: entryRes.data,
    clientEmail: entryRes.data?.clientes?.email ?? null,
    carrierEmail: entryRes.data?.carriers?.email ?? null,
    documents: docsRes.data ?? [],
  }
}

async function computeAutoStatus(landFreightId: string) {
  const sb = createClient()
  const { data: docs } = await sb
    .from("land_freight_documents")
    .select("doc_type")
    .eq("land_freight_id", landFreightId)

  const uploadedTypes = new Set(docs?.map((d) => d.doc_type) ?? [])

  if (!uploadedTypes.has("freight_data")) return "pending_data"
  if (!uploadedTypes.has("carta_porte_layout")) return "pending_carta_porte_layout"
  if (!uploadedTypes.has("carta_porte")) return "pending_carta_porte"
  return "ready"
}

interface EditForm {
  cliente_id: string
  client_name: string
  carrier_id: string
  carrier_name: string
  freight_date: string
  freight_time: string
  origin: string
  destination: string
  import_invoice: string
  description: string
  notes: string
}

export function LandFreightDetail({ id }: { id: string }) {
  const { data, isLoading, mutate } = useSWR(`land-freight-${id}`, () =>
    fetchLandDetail(id)
  )
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const { user } = useAuth()
  const canEdit = user && CAN_EDIT_FREIGHT.includes(user.role)
  const canDelete = user && CAN_DELETE_FREIGHT.includes(user.role)
  const canUpload = user && CAN_UPLOAD_DOCS.includes(user.role)
  const isTransportista = user?.role === "transportista"

  const { data: clientes } = useSWR(showEdit ? "clientes" : null, fetchClientes)
  const { data: carriers } = useSWR(showEdit ? "carriers" : null, fetchCarriers)

  function openEditDialog() {
    if (!data?.entry) return
    const e = data.entry
    setEditForm({
      cliente_id: e.cliente_id ?? "",
      client_name: e.client_name ?? "",
      carrier_id: e.carrier_id ?? "",
      carrier_name: e.carrier_name ?? "",
      freight_date: e.freight_date ?? "",
      freight_time: e.freight_time ?? "",
      origin: e.origin ?? "",
      destination: e.destination ?? "",
      import_invoice: e.import_invoice ?? "",
      description: e.description ?? "",
      notes: e.notes ?? "",
    })
    setShowEdit(true)
  }

  const handleSaveEdit = useCallback(async () => {
    if (!editForm) return
    if (!editForm.cliente_id) {
      toast.error("Selecciona un cliente")
      return
    }
    if (!editForm.freight_date || !editForm.freight_time) {
      toast.error("Fecha y hora son requeridos")
      return
    }

    setEditSaving(true)
    const sb = createClient()
    const { error } = await sb
      .from("land_freight")
      .update({
        cliente_id: editForm.cliente_id,
        client_name: editForm.client_name,
        carrier_id: editForm.carrier_id || null,
        carrier_name: editForm.carrier_name || null,
        freight_date: editForm.freight_date,
        freight_time: editForm.freight_time,
        origin: editForm.origin.trim() || null,
        destination: editForm.destination.trim() || null,
        import_invoice: editForm.import_invoice.trim() || null,
        description: editForm.description.trim() || null,
        notes: editForm.notes.trim() || null,
      })
      .eq("id", id)
    setEditSaving(false)

    if (error) {
      toast.error("Error al actualizar: " + error.message)
      return
    }

    toast.success("Flete actualizado")
    setShowEdit(false)
    mutate()
  }, [editForm, id, mutate])

  const sendLandNotification = useCallback(
    (recipients: string[], payload: Record<string, string | undefined>) => {
      if (!data?.entry) return
      const { entry } = data
      const base = {
        folio: entry.folio,
        clientName: entry.client_name,
        carrierName: entry.carrier_name,
        origin: entry.origin,
        destination: entry.destination,
        freightDate: entry.freight_date,
        freightTime: entry.freight_time,
        importInvoice: entry.import_invoice,
        description: entry.description,
      }
      for (const to of recipients) {
        if (!to) continue
        fetch("/api/notify-land", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, ...base, ...payload }),
        }).catch(() => {})
      }
    },
    [data]
  )

  const handleUpload = useCallback(
    async (docType: string, file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", `land/${id}/${docType}`)

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error ?? "Upload failed")
        return
      }

      const sb = createClient()
      const { error } = await sb.from("land_freight_documents").insert({
        land_freight_id: id,
        doc_type: docType,
        file_name: result.file_name,
        file_url: result.file_url,
      })

      if (error) {
        toast.error("Failed to save document record")
        return
      }

      // Auto-compute status based on uploaded docs
      const currentEntry = data?.entry
      if (
        currentEntry &&
        ["pending_data", "pending_carta_porte_layout", "pending_carta_porte"].includes(
          currentEntry.status
        )
      ) {
        const autoStatus = await computeAutoStatus(id)
        const sb2 = createClient()
        await sb2
          .from("land_freight")
          .update({ status: autoStatus })
          .eq("id", id)
      }

      toast.success("Documento subido exitosamente")

      // Send email notification based on doc type
      const docLabel = LAND_DOC_TYPES.find((d) => d.key === docType)?.label ?? docType
      const emailPayload = { type: "document", docType: docLabel, docName: file.name, fileUrl: result.file_url }

      if (docType === "freight_data" && data?.clientEmail) {
        // Transport Data → email to client
        sendLandNotification([data.clientEmail], emailPayload)
      } else if (docType === "carta_porte_layout" && data?.carrierEmail) {
        // Carta Porte Layout → email to carrier
        sendLandNotification([data.carrierEmail], emailPayload)
      } else if (docType === "carta_porte" && data?.clientEmail) {
        // Carta Porte → email to client
        sendLandNotification([data.clientEmail], emailPayload)
      } else if (docType === "load_order" && data?.carrierEmail) {
        // Load Order → email to carrier
        sendLandNotification([data.carrierEmail], emailPayload)
      }

      mutate()
    },
    [id, mutate, data, sendLandNotification]
  )

  const handleRemoveDoc = useCallback(
    async (docId: string) => {
      const sb = createClient()
      const { error } = await sb
        .from("land_freight_documents")
        .delete()
        .eq("id", docId)

      if (error) {
        toast.error("Failed to remove document")
        return
      }

      // Recompute status
      const autoStatus = await computeAutoStatus(id)
      const currentEntry = data?.entry
      if (
        currentEntry &&
        !["dispatched", "green_light", "red_light", "delivered"].includes(
          currentEntry.status
        )
      ) {
        const sb2 = createClient()
        await sb2
          .from("land_freight")
          .update({ status: autoStatus })
          .eq("id", id)
      }

      toast.success("Document removed")
      mutate()
    },
    [id, mutate, data]
  )

  const handleUpdateStatus = useCallback(
    async (newStatus: string, successMessage: string) => {
      setUpdatingStatus(newStatus)
      const sb = createClient()
      const { error } = await sb
        .from("land_freight")
        .update({ status: newStatus })
        .eq("id", id)

      setUpdatingStatus(null)
      if (error) {
        toast.error("Error al actualizar status")
        return
      }

      toast.success(successMessage)
      // Send email to both client and carrier
      const recipients = [data?.clientEmail, data?.carrierEmail].filter(Boolean) as string[]
      sendLandNotification(recipients, { type: "status", status: newStatus })
      mutate()
    },
    [id, mutate, data, sendLandNotification]
  )

  const handleDelete = useCallback(async () => {
    const sb = createClient()
    const { error } = await sb.from("land_freight").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete entry")
      return
    }
    toast.success("Entry deleted")
    window.location.href = "/land"
  }, [id])

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const { entry, documents } = data
  const docsByType = new Map(documents.map((d) => [d.doc_type, d]))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/land">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {entry.folio && (
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-base font-bold text-primary">
                  {entry.folio}
                </span>
              )}
              {entry.origin && entry.destination
                ? `${entry.origin} → ${entry.destination}`
                : entry.carrier_name ?? "Land Freight"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {entry.client_name} | {new Date(entry.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={entry.status} />
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium text-foreground">{entry.freight_date}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-sm font-medium text-foreground">{entry.freight_time}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Carrier</p>
              <p className="text-sm font-medium text-foreground">{entry.carrier_name ?? "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {entry.import_invoice && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Factura de Importación</p>
              <p className="text-sm font-medium text-foreground">{entry.import_invoice}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(entry.description || entry.notes) && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            {entry.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm text-foreground">{entry.description}</p>
              </div>
            )}
            {entry.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground">{entry.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Progress Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Documentos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estado de los documentos requeridos para el flete
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {DOC_PROGRESS_STEPS.map((step, idx) => {
              const uploaded = docsByType.has(step.key)
              const allPreviousUploaded = DOC_PROGRESS_STEPS.slice(0, idx).every((s) => docsByType.has(s.key))
              const isCurrent = !uploaded && allPreviousUploaded
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    uploaded
                      ? "border-emerald-200 bg-emerald-50"
                      : isCurrent
                        ? "border-amber-200 bg-amber-50"
                        : "border-muted bg-muted/30"
                  }`}
                >
                  {uploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <CircleDot className="h-5 w-5 text-amber-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${uploaded ? "text-emerald-700" : isCurrent ? "text-amber-700" : "text-muted-foreground"}`}>
                    {uploaded ? `${step.label} ✓` : isCurrent ? `Pendiente: ${step.label}` : step.label}
                  </span>
                </div>
              )
            })}
            {/* Ready indicator */}
            {(() => {
              const allUploaded = DOC_PROGRESS_STEPS.every((s) => docsByType.has(s.key))
              return (
                <div
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    allUploaded
                      ? "border-blue-200 bg-blue-50"
                      : "border-muted bg-muted/30"
                  }`}
                >
                  {allUploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${allUploaded ? "text-blue-700" : "text-muted-foreground"}`}>
                    {allUploaded ? "Ready ✓" : "Ready"}
                  </span>
                </div>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canEdit && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Button
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => handleUpdateStatus("dispatched", "Marcado como Dispatched")}
              disabled={updatingStatus === "dispatched"}
            >
              <Send className="mr-2 h-4 w-4" />
              Dispatched
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => handleUpdateStatus("green_light", "Marcado como Green Light")}
              disabled={updatingStatus === "green_light"}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Green Light
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => handleUpdateStatus("red_light", "Marcado como Red Light")}
              disabled={updatingStatus === "red_light"}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Red Light
            </Button>
            {entry.status === "red_light" && (
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleUpdateStatus("liberado_rojo", "Liberado del Red Light")}
                disabled={updatingStatus === "liberado_rojo"}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Liberado de Rojo
              </Button>
            )}
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => handleUpdateStatus("delivered", "Marcado como Entregado")}
              disabled={updatingStatus === "delivered"}
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Entregado
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Document Uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sube los documentos requeridos para el flete
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {LAND_DOC_TYPES.map((docType) => {
              const existing = docsByType.get(docType.key)
              // Transportista can only upload carta_porte
              const canUploadThis = canUpload && (!isTransportista || docType.key === "carta_porte")
              return (
                <div key={docType.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {existing ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {docType.label}
                    </span>
                  </div>
                  {canUploadThis ? (
                    <FileUpload
                      label={`Subir ${docType.label}`}
                      onUpload={(file) => handleUpload(docType.key, file)}
                      existingFile={
                        existing
                          ? { file_name: existing.file_name, file_url: existing.file_url }
                          : null
                      }
                      onRemove={
                        existing ? () => handleRemoveDoc(existing.id) : undefined
                      }
                    />
                  ) : existing ? (
                    <a
                      href={existing.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    >
                      {existing.file_name}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin documento</span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Land Freight</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="flex flex-col gap-4">
              {/* Cliente */}
              <div className="flex flex-col gap-2">
                <Label>
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={editForm.cliente_id}
                  onValueChange={(val) => {
                    const c = clientes?.find((c) => c.id === val)
                    setEditForm((prev) => prev ? { ...prev, cliente_id: val, client_name: c?.name ?? "" } : null)
                  }}
                >
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

              {/* Carrier */}
              <div className="flex flex-col gap-2">
                <Label>Carrier</Label>
                <Select
                  value={editForm.carrier_id}
                  onValueChange={(val) => {
                    const c = carriers?.find((c) => c.id === val)
                    setEditForm((prev) => prev ? { ...prev, carrier_id: val, carrier_name: c?.name ?? "" } : null)
                  }}
                >
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
                  <Label>
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={editForm.freight_date}
                    onChange={(e) => setEditForm((prev) => prev ? { ...prev, freight_date: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    Hora <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={editForm.freight_time}
                    onChange={(e) => setEditForm((prev) => prev ? { ...prev, freight_time: e.target.value } : null)}
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <LocationInput
                label="Origen"
                value={editForm.origin}
                onChange={(name) => setEditForm((prev) => prev ? { ...prev, origin: name } : null)}
              />
              <LocationInput
                label="Destino"
                value={editForm.destination}
                onChange={(name) => setEditForm((prev) => prev ? { ...prev, destination: name } : null)}
              />

              {/* Factura de Importación */}
              <div className="flex flex-col gap-2">
                <Label>Factura de Importación</Label>
                <Input
                  placeholder="No. de factura de importación"
                  value={editForm.import_invoice}
                  onChange={(e) => setEditForm((prev) => prev ? { ...prev, import_invoice: e.target.value } : null)}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Descripción del flete..."
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={editSaving} className="bg-primary text-primary-foreground">
                  {editSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
