import { AppLayout } from "@/components/app-layout"
import { OceanFreightList } from "@/components/ocean-freight-list"
import { RequireRole } from "@/components/require-role"

export default function OceanFreightPage() {
  return (
    <AppLayout>
      <RequireRole allowed={["admin", "operador", "cliente"]}>
        <OceanFreightList />
      </RequireRole>
    </AppLayout>
  )
}
