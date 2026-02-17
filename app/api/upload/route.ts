import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const supabase = await createClient()

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `${folder}/${timestamp}_${safeName}`

    const { data, error } = await supabase.storage
      .from("freight-docs")
      .upload(filePath, file)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("freight-docs")
      .getPublicUrl(data.path)

    return NextResponse.json({
      file_name: file.name,
      file_url: urlData.publicUrl,
      path: data.path,
    })
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}
