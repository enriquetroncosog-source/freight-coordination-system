"use client"

import { useAuth } from "@/components/auth-provider"
import type { UserRole } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface RequireRoleProps {
  allowed: UserRole[]
  children: React.ReactNode
}

export function RequireRole({ allowed, children }: RequireRoleProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !allowed.includes(user.role)) {
      router.push("/")
    }
  }, [user, loading, allowed, router])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user || !allowed.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
