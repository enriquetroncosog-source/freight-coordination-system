import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { requireRole } from "@/lib/api-auth"

const resend = new Resend(process.env.RESEND_API_KEY)

const STATUS_LABELS: Record<string, string> = {
  enviado_tramite: "Enviado a Trámite",
  desaduanamiento_libre: "Desaduanamiento Libre",
  reconocimiento_aduanero: "Reconocimiento Aduanero",
  liberado_reconocimiento: "Liberado del Reconocimiento Aduanero",
  entregado: "Entregado",
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  enviado_tramite: "Los documentos han sido enviados a trámite de importación.",
  desaduanamiento_libre: "El contenedor ha sido liberado de aduanas sin reconocimiento.",
  reconocimiento_aduanero: "El contenedor ha sido seleccionado para reconocimiento aduanero.",
  liberado_reconocimiento: "El contenedor ha sido liberado después del reconocimiento aduanero.",
  entregado: "El embarque ha sido entregado exitosamente.",
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin", "operador"])
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { to, status, clientName, vendorName, containerNumber, invoiceNumber, vesselNumber, blNumber } =
      await req.json()

    if (!to || !status || !clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const statusLabel = STATUS_LABELS[status] ?? status
    const statusDesc = STATUS_DESCRIPTIONS[status] ?? ""

    const subject = `${statusLabel} - Contenedor ${containerNumber || "S/N"} - ${clientName}`

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
            <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px;">${statusLabel}</h2>
            <p style="margin: 0 0 20px; color: #374151; font-size: 14px;">${statusDesc}</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Cliente:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Proveedor:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${vendorName || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vessel:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${vesselNumber || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contenedor:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${containerNumber || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">BL:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${blNumber || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Factura:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${invoiceNumber || "—"}</td>
              </tr>
            </table>
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
    console.error("Notify status error:", err)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
