import { AppLayout } from "@/components/app-layout"
import { LandFreightList } from "@/components/land-freight-list"
import { RequireRole } from "@/components/require-role"

export default function LandFreightPage() {
  return (
    <AppLayout>
      <RequireRole allowed={["admin", "operador", "cliente", "transportista"]}>
        <LandFreightList />
      </RequireRole>
    </AppLayout>
  )
}
