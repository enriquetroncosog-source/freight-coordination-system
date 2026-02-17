import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface DocAttachment {
  docType: string
  fileName: string
  fileUrl: string
}

export async function POST(req: NextRequest) {
  try {
    const { to, clientName, vendorName, containerNumber, invoiceNumber, vesselNumber, blNumber, documents } =
      (await req.json()) as {
        to: string
        clientName: string
        vendorName: string
        containerNumber: string
        invoiceNumber: string
        vesselNumber: string
        blNumber: string
        documents: DocAttachment[]
      }

    if (!to || !clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Download all documents and prepare attachments
    const attachments: { filename: string; content: Buffer }[] = []
    for (const doc of documents) {
      try {
        const response = await fetch(doc.fileUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const ext = doc.fileName.split(".").pop() || "pdf"
          attachments.push({
            filename: `${doc.docType}.${ext}`,
            content: Buffer.from(arrayBuffer),
          })
        }
      } catch {
        // Skip documents that fail to download
      }
    }

    const subject = `Trámite de Importación - Contenedor ${containerNumber || "S/N"} - Factura ${invoiceNumber || "S/N"} - ${clientName}`

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
            <p style="margin: 0 0 16px; color: #111827; font-size: 14px;">
              Buen día, se anexan documentos para trámite de importación del contenedor
              <strong>${containerNumber || "S/N"}</strong> con factura
              <strong>${invoiceNumber || "S/N"}</strong> del cliente
              <strong>${clientName}</strong>.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
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
            </table>
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
              <strong>Documentos adjuntos (${attachments.length}):</strong>
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px;">
              ${attachments.map((a) => `<li>${a.filename}</li>`).join("")}
            </ul>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Este es un correo automático del sistema de coordinación de embarques.
            </p>
          </div>
        </div>
      `,
      attachments,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Send tramite error:", err)
    return NextResponse.json({ error: "Failed to send tramite email" }, { status: 500 })
  }
}
