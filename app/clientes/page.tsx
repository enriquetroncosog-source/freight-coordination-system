import { AppLayout } from "@/components/app-layout"
import { ClientesList } from "@/components/clientes-list"
import { RequireRole } from "@/components/require-role"

export default function ClientesPage() {
  return (
    <AppLayout>
      <RequireRole allowed={["admin", "operador"]}>
        <ClientesList />
      </RequireRole>
    </AppLayout>
  )
}
