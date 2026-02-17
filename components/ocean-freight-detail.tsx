"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Ship, CheckCircle2, Circle, Trash2, Send, ShieldCheck, Search, PackageCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { FileUpload } from "@/components/file-upload"
import { createClient } from "@/lib/supabase/client"

const DOC_TYPES = [
  { key: "bl", label: "BL" },
  { key: "invoice", label: "Invoice" },
  { key: "packing_list", label: "Packing List" },
  { key: "uva", label: "UVA" },
  { key: "traduccion", label: "Traducción" },
  { key: "factura_maritima", label: "Factura Marítima" },
] as const

const INFO_FIELDS = [
  { key: "client_name", label: "Cliente" },
  { key: "vendor_name", label: "Proveedor" },
  { key: "vendor_tax_id", label: "Tax ID Proveedor" },
  { key: "container_number", label: "No. Contenedor" },
  { key: "vessel_number", label: "No. Vessel" },
  { key: "invoice_number", label: "No. Invoice" },
  { key: "pedimento_number", label: "No. Pedimento" },
  { key: "bl_number", label: "No. BL" },
] as const

async function fetchOceanDetail(id: string) {
  const supabase = createClient()
  const [entryRes, docsRes] = await Promise.all([
    supabase.from("ocean_freight").select("*, clientes(email)").eq("id", id).single(),
    supabase
      .from("ocean_freight_documents")
      .select("*")
      .eq("ocean_freight_id", id)
      .order("uploaded_at", { ascending: false }),
  ])

  if (entryRes.error) throw entryRes.error
  return {
    entry: entryRes.data,
    clientEmail: entryRes.data?.clientes?.email ?? null,
    documents: docsRes.data ?? [],
  }
}

async function computeStatus(oceanFreightId: string) {
  const supabase = createClient()
  const { data: docs } = await supabase
    .from("ocean_freight_documents")
    .select("doc_type")
    .eq("ocean_freight_id", oceanFreightId)

  const uploadedTypes = new Set(docs?.map((d) => d.doc_type) ?? [])
  const allUploaded = DOC_TYPES.every((dt) => uploadedTypes.has(dt.key))

  if (allUploaded) return "docs_complete"
  return "pending_docs"
}

async function updateStatus(oceanFreightId: string) {
  const supabase = createClient()
  const newStatus = await computeStatus(oceanFreightId)
  await supabase
    .from("ocean_freight")
    .update({ status: newStatus })
    .eq("id", oceanFreightId)
}

export function OceanFreightDetail({ id }: { id: string }) {
  const { data, isLoading, mutate } = useSWR(`ocean-freight-${id}`, () =>
    fetchOceanDetail(id)
  )
  const [sendingTramite, setSendingTramite] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const handleUpload = useCallback(
    async (docType: string, file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", `ocean/${id}/${docType}`)

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error ?? "Error al subir archivo")
        return
      }

      const sb = createClient()
      const { error } = await sb.from("ocean_freight_documents").insert({
        ocean_freight_id: id,
        doc_type: docType,
        file_name: result.file_name,
        file_url: result.file_url,
      })

      if (error) {
        toast.error("Error al guardar registro del documento")
        return
      }

      await updateStatus(id)
      toast.success("Documento subido exitosamente")

      // Send email notification to client
      if (data?.clientEmail) {
        const docLabel = DOC_TYPES.find((d) => d.key === docType)?.label ?? docType
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: data.clientEmail,
            clientName: data.entry.client_name,
            vendorName: data.entry.vendor_name,
            docType: docLabel,
            docName: file.name,
          }),
        }).catch(() => {
          // Notification is best-effort, don't block the UI
        })
      }

      mutate()
    },
    [id, mutate, data]
  )

  const handleRemoveDoc = useCallback(
    async (docId: string) => {
      const sb = createClient()
      const { error } = await sb
        .from("ocean_freight_documents")
        .delete()
        .eq("id", docId)

      if (error) {
        toast.error("Error al eliminar documento")
        return
      }

      await updateStatus(id)
      toast.success("Documento eliminado")
      mutate()
    },
    [id, mutate]
  )

  const sendStatusEmail = useCallback(async (status: string) => {
    if (!data?.clientEmail || !data?.entry) return
    const { entry } = data
    fetch("/api/notify-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: data.clientEmail,
        status,
        clientName: entry.client_name,
        vendorName: entry.vendor_name,
        containerNumber: entry.container_number,
        invoiceNumber: entry.invoice_number,
        vesselNumber: entry.vessel_number,
        blNumber: entry.bl_number,
      }),
    }).catch(() => {})
  }, [data])

  const handleUpdateStatus = useCallback(async (newStatus: string, successMessage: string) => {
    setUpdatingStatus(newStatus)
    const sb = createClient()
    const { error } = await sb
      .from("ocean_freight")
      .update({ status: newStatus })
      .eq("id", id)

    setUpdatingStatus(null)
    if (error) {
      toast.error("Error al actualizar status")
      return
    }

    toast.success(successMessage)
    sendStatusEmail(newStatus)
    mutate()
  }, [id, mutate, sendStatusEmail])

  const handleSendTramite = useCallback(async () => {
    if (!data) return
    if (!data.clientEmail) {
      toast.error("El cliente no tiene correo registrado")
      return
    }

    const { entry, documents } = data
    if (documents.length === 0) {
      toast.error("No hay documentos para enviar")
      return
    }

    setSendingTramite(true)
    try {
      const docAttachments = documents.map((doc) => ({
        docType: DOC_TYPES.find((d) => d.key === doc.doc_type)?.label ?? doc.doc_type,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
      }))

      const res = await fetch("/api/send-tramite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.clientEmail,
          clientName: entry.client_name,
          vendorName: entry.vendor_name,
          containerNumber: entry.container_number,
          invoiceNumber: entry.invoice_number,
          vesselNumber: entry.vessel_number,
          blNumber: entry.bl_number,
          documents: docAttachments,
        }),
      })

      if (!res.ok) {
        const result = await res.json()
        toast.error(result.error ?? "Error al enviar correo")
        return
      }

      toast.success("Correo de trámite enviado exitosamente")

      // Also update status
      const sb = createClient()
      await sb.from("ocean_freight").update({ status: "enviado_tramite" }).eq("id", id)
      mutate()
    } catch {
      toast.error("Error al enviar correo de trámite")
    } finally {
      setSendingTramite(false)
    }
  }, [data, id, mutate])

  const handleDelete = useCallback(async () => {
    const sb = createClient()
    const { error } = await sb.from("ocean_freight").delete().eq("id", id)
    if (error) {
      toast.error("Error al eliminar entrada")
      return
    }
    toast.success("Entrada eliminada")
    window.location.href = "/ocean"
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
        <Link href="/ocean">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Ship className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{entry.client_name}</h1>
            <p className="text-sm text-muted-foreground">
              Proveedor: {entry.vendor_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={entry.status} />
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Button
            size="sm"
            className="bg-violet-600 text-white hover:bg-violet-700"
            onClick={handleSendTramite}
            disabled={sendingTramite}
          >
            <Send className="mr-2 h-4 w-4" />
            {sendingTramite ? "Enviando..." : "Enviar a Trámite"}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => handleUpdateStatus("desaduanamiento_libre", "Marcado como Desaduanamiento Libre")}
            disabled={updatingStatus === "desaduanamiento_libre"}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Desaduanamiento Libre
          </Button>
          <Button
            size="sm"
            className="bg-orange-600 text-white hover:bg-orange-700"
            onClick={() => handleUpdateStatus("reconocimiento_aduanero", "Marcado como Reconocimiento Aduanero")}
            disabled={updatingStatus === "reconocimiento_aduanero"}
          >
            <Search className="mr-2 h-4 w-4" />
            Reconocimiento Aduanero
          </Button>
          {entry.status === "reconocimiento_aduanero" && (
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => handleUpdateStatus("liberado_reconocimiento", "Liberado del Reconocimiento Aduanero")}
              disabled={updatingStatus === "liberado_reconocimiento"}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Liberado del Reconocimiento
            </Button>
          )}
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => handleUpdateStatus("entregado", "Marcado como Entregado")}
            disabled={updatingStatus === "entregado"}
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Entregado
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Embarque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {INFO_FIELDS.map((field) => {
              const value = entry[field.key]
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                  <span className="text-sm text-foreground">{value || "—"}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Document Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sube todos los documentos requeridos para la liberación aduanal
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {DOC_TYPES.map((docType) => {
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
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Enviar a Trámite Dialog */}
      <Dialog open={showTramiteDialog} onOpenChange={setShowTramiteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar a Trámite</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Se enviarán {documents.length} documento(s) adjuntos al correo indicado con la información del embarque.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tramite-email">
                Correo del destinatario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tramite-email"
                type="email"
                placeholder="agente@ejemplo.com"
                value={tramiteEmail}
                onChange={(e) => setTramiteEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Vista previa del correo:</p>
              <p>
                Buen día, se anexan documentos para trámite de importación del contenedor{" "}
                <strong>{entry.container_number || "S/N"}</strong> con factura{" "}
                <strong>{entry.invoice_number || "S/N"}</strong> del cliente{" "}
                <strong>{entry.client_name}</strong>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowTramiteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendTramite}
              disabled={sendingTramite}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {sendingTramite ? "Enviando..." : "Enviar Correo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
