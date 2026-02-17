import { AppLayout } from "@/components/app-layout"
import { OceanFreightDetail } from "@/components/ocean-freight-detail"
import { RequireRole } from "@/components/require-role"

export default async function OceanFreightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppLayout>
      <RequireRole allowed={["admin", "operador", "cliente"]}>
        <OceanFreightDetail id={id} />
      </RequireRole>
    </AppLayout>
  )
}
