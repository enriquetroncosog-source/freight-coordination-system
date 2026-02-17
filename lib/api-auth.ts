import { createClient } from "@/lib/supabase/server"
import type { UserRole, UserProfile } from "@/lib/auth"

export async function getAuthenticatedUser(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return profile
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { error: "Unauthorized" as const, status: 401, user: null }
  }
  if (!allowedRoles.includes(user.role)) {
    return { error: "Forbidden" as const, status: 403, user: null }
  }
  return { error: null, status: 200, user }
}
