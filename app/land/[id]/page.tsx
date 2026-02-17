import { AppLayout } from "@/components/app-layout"
import { LandFreightDetail } from "@/components/land-freight-detail"

export default async function LandFreightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppLayout>
      <LandFreightDetail id={id} />
    </AppLayout>
  )
}
