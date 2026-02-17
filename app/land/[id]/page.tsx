import { AppLayout } from "@/components/app-layout"
import { LandFreightDetail } from "@/components/land-freight-detail"
import { RequireRole } from "@/components/require-role"

export default async function LandFreightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppLayout>
      <RequireRole allowed={["admin", "operador", "cliente", "transportista"]}>
        <LandFreightDetail id={id} />
      </RequireRole>
    </AppLayout>
  )
}
