import { AppLayout } from "@/components/app-layout"
import { UserManagement } from "@/components/user-management"
import { RequireRole } from "@/components/require-role"

export default function AdminPage() {
  return (
    <AppLayout>
      <RequireRole allowed={["admin"]}>
        <UserManagement />
      </RequireRole>
    </AppLayout>
  )
}
