import { AppLayout } from "@/components/app-layout"
import { OceanFreightDetail } from "@/components/ocean-freight-detail"

export default async function OceanFreightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppLayout>
      <OceanFreightDetail id={id} />
    </AppLayout>
  )
}
