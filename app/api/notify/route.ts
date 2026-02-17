import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { to, clientName, vendorName, docType, docName } = await req.json()

    if (!to || !clientName || !docType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: "Core Integrated Solutions <no-reply@core-logistics.com>",
      to,
      subject: `Documento subido: ${docType} - ${vendorName || ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2191CB; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Core Integrated Solutions</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Freight Coordination System</p>
          </div>
          <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2 style="margin: 0 0 16px; color: #111827;">Nuevo Documento Subido</h2>
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
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tipo de Documento:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${docType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Archivo:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${docName || "—"}</td>
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
    console.error("Notify error:", err)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
