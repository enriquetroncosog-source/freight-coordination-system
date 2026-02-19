import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { requireRole } from "@/lib/api-auth"

const resend = new Resend(process.env.RESEND_API_KEY)

const STATUS_LABELS: Record<string, string> = {
  dispatched: "Dispatched",
  green_light: "Green Light",
  red_light: "Red Light",
  liberado_rojo: "Liberado de Rojo",
  delivered: "Entregado",
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  dispatched: "El flete ha sido despachado.",
  green_light: "El flete ha recibido luz verde.",
  red_light: "El flete ha recibido luz roja (reconocimiento).",
  liberado_rojo: "El flete ha sido liberado del reconocimiento.",
  delivered: "El flete ha sido entregado exitosamente.",
}

function infoTable(fields: { label: string; value: string | undefined | null }[]) {
  const rows = fields
    .map(
      (f) =>
        `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${f.label}:</td><td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${f.value || "—"}</td></tr>`
    )
    .join("")
  return `<table style="width: 100%; border-collapse: collapse;">${rows}</table>`
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin", "operador", "transportista"])
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const {
      to,
      type,
      folio,
      clientName,
      carrierName,
      origin,
      destination,
      freightDate,
      freightTime,
      importInvoice,
      description,
      status,
      docType,
      docName,
      fileUrl,
    } = await req.json()

    if (!to) {
      return NextResponse.json({ error: "Missing recipient" }, { status: 400 })
    }

    const folioTag = folio || "S/F"

    const shipmentFields = [
      { label: "Folio", value: folio },
      { label: "Cliente", value: clientName },
      { label: "Carrier", value: carrierName },
      { label: "Origen", value: origin },
      { label: "Destino", value: destination },
      { label: "Fecha", value: `${freightDate || "—"} ${freightTime || ""}`.trim() },
      { label: "Factura de Importación", value: importInvoice },
      { label: "Descripción", value: description },
    ]

    let subject = ""
    let body = ""

    if (type === "status") {
      const statusLabel = STATUS_LABELS[status] ?? status
      const statusDesc = STATUS_DESCRIPTIONS[status] ?? ""
      subject = `[${folioTag}] ${statusLabel} - ${clientName}`
      body = `
        <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px;">${statusLabel}</h2>
        <p style="margin: 0 0 20px; color: #374151; font-size: 14px;">${statusDesc}</p>
        ${infoTable(shipmentFields)}
      `
    } else if (type === "document") {
      subject = `[${folioTag}] ${docType} Subido - ${clientName}`
      body = `
        <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px;">Nuevo Documento Subido</h2>
        <p style="margin: 0 0 20px; color: #374151; font-size: 14px;">Se ha subido el documento <strong>${docType}</strong> para el flete.</p>
        ${infoTable([
          { label: "Documento", value: docType },
          { label: "Archivo", value: docName },
          ...shipmentFields,
        ])}
        ${fileUrl ? `<p style="margin: 16px 0 0;"><a href="${fileUrl}" style="color: #2191CB; text-decoration: underline; font-size: 14px;">Ver documento</a></p>` : ""}
      `
    }

    const { error } = await resend.emails.send({
      from: "Core Integrated Solutions <no-reply@core-logistics.com>",
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2191CB; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Core Integrated Solutions</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Freight Coordination System</p>
          </div>
          <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            ${body}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Este es un correo automático del sistema de coordinación de embarques.
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Notify land error:", err)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
