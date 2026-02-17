import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; className: string }> = {
  // Ocean Freight statuses
  pending_docs: {
    label: "Pending Docs",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  docs_complete: {
    label: "Docs Complete",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  cleared: {
    label: "Cleared",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  enviado_tramite: {
    label: "Enviado a Trámite",
    className: "bg-violet-100 text-violet-800 border-violet-200",
  },
  desaduanamiento_libre: {
    label: "Desaduanamiento Libre",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  reconocimiento_aduanero: {
    label: "Reconocimiento Aduanero",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  liberado_reconocimiento: {
    label: "Liberado del Reconocimiento",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  entregado: {
    label: "Entregado",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  // Land Freight statuses
  pending_data: {
    label: "Pending Data",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  pending_carta_porte_layout: {
    label: "Pending Carta Porte Layout",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  pending_carta_porte: {
    label: "Pending Carta Porte",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  ready: {
    label: "Ready",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  dispatched: {
    label: "Dispatched",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  green_light: {
    label: "Green Light",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  red_light: {
    label: "Red Light",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  liberado_rojo: {
    label: "Liberado de Rojo",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
