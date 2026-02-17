"use client"

import { useCallback } from "react"
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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/status-badge"
import { FileUpload } from "@/components/file-upload"
import { createClient } from "@/lib/supabase/client"

const LAND_DOC_TYPES = [
  { key: "freight_data", label: "Freight Data" },
  { key: "carta_porte_layout", label: "Carta Porte Layout" },
  { key: "carta_porte", label: "Carta Porte" },
] as const

const STATUS_OPTIONS = [
  { value: "pending_data", label: "Pending Data" },
  { value: "pending_carta_porte_layout", label: "Pending Carta Porte Layout" },
  { value: "pending_carta_porte", label: "Pending Carta Porte" },
  { value: "ready", label: "Ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "green_light", label: "Green Light" },
  { value: "red_light", label: "Red Light" },
  { value: "delivered", label: "Delivered" },
]

async function fetchLandDetail(id: string) {
  const sb = createClient()
  const [entryRes, docsRes] = await Promise.all([
    sb.from("land_freight").select("*").eq("id", id).single(),
    sb
      .from("land_freight_documents")
      .select("*")
      .eq("land_freight_id", id)
      .order("uploaded_at", { ascending: false }),
  ])

  if (entryRes.error) throw entryRes.error
  return {
    entry: entryRes.data,
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

export function LandFreightDetail({ id }: { id: string }) {
  const { data, isLoading, mutate } = useSWR(`land-freight-${id}`, () =>
    fetchLandDetail(id)
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

      toast.success("Document uploaded successfully")
      mutate()
    },
    [id, mutate, data]
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

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      const sb = createClient()
      const { error } = await sb
        .from("land_freight")
        .update({ status: newStatus })
        .eq("id", id)

      if (error) {
        toast.error("Failed to update status")
        return
      }

      toast.success("Status updated")
      mutate()
    },
    [id, mutate]
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
            <h1 className="text-2xl font-bold text-foreground">
              {entry.origin && entry.destination
                ? `${entry.origin} → ${entry.destination}`
                : entry.carrier_name ?? "Land Freight"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(entry.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={entry.status} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete entry</span>
          </Button>
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

      {/* Status Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Control</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manually update the shipment status
          </p>
        </CardHeader>
        <CardContent>
          <Select value={entry.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Document Uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload freight data, carta porte layout, and carta porte
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {LAND_DOC_TYPES.map((docType) => {
              const existing = docsByType.get(docType.key)
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
                  <FileUpload
                    label={`Upload ${docType.label}`}
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
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
