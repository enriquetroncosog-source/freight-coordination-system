import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireRole } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const auth = await requireRole(["admin"])
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*, clientes(name), carriers(name)")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin"])
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { email, password, full_name, role, cliente_id, carrier_id } = await req.json()

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Update the profile with the correct role and links
    // The trigger creates the profile with default 'operador' role
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .update({
        full_name,
        role,
        cliente_id: cliente_id || null,
        carrier_id: carrier_id || null,
      })
      .eq("id", authData.user.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch {
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(["admin"])
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (userId === auth.user!.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const { error } = await adminClient.auth.admin.deleteUser(userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 })
  }
}
