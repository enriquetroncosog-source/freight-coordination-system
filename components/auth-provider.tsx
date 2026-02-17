"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/auth"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      setUser(profile)
      setLoading(false)
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }

  // Don't show loading state on login page
  if (pathname === "/login") {
    return (
      <AuthContext.Provider value={{ user, loading: false, signOut }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
