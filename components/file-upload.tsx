"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileText, Loader2, Eye, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ExistingFile {
  id?: string
  file_name: string
  file_url: string
}

function isPreviewable(fileName: string): "image" | "pdf" | false {
  const lower = fileName.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return "image"
  if (/\.pdf$/.test(lower)) return "pdf"
  return false
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  label: string
  /** @deprecated Use existingFiles instead */
  existingFile?: { file_name: string; file_url: string } | null
  existingFiles?: ExistingFile[]
  /** @deprecated Use onRemoveFile instead */
  onRemove?: () => Promise<void>
  onRemoveFile?: (fileId: string) => Promise<void>
}

export function FileUpload({
  onUpload,
  accept = ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.xml",
  label,
  existingFile,
  existingFiles,
  onRemove,
  onRemoveFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<ExistingFile | null>(null)

  // Normalize to array
  const files: ExistingFile[] = existingFiles ?? (existingFile ? [existingFile] : [])

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true)
      try {
        await onUpload(file)
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const previewType = previewFile ? isPreviewable(previewFile.file_name) : false

  return (
    <div className="flex flex-col gap-2">
      {/* Existing files list */}
      {files.map((f, idx) => {
        const canPreview = isPreviewable(f.file_name)
        return (
          <div
            key={f.id ?? idx}
            className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 truncate">
                {f.file_name}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewFile(f)}
                  className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
                  title="Vista previa"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <a href={f.file_url} download={f.file_name} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </a>
              {(onRemoveFile && f.id) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(f.id!)}
                  className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-100 hover:text-red-600"
                  title="Eliminar"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : onRemove && files.length === 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-100 hover:text-red-600"
                  title="Eliminar"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}

      {/* Upload zone - always shown */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors",
          isDragging
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Subiendo...</p>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              Arrastra o haz clic para seleccionar
            </p>
            <input
              type="file"
              accept={accept}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ""
              }}
            />
          </>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null) }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewFile?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {previewFile && previewType === "image" && (
              <img
                src={previewFile.file_url}
                alt={previewFile.file_name}
                className="w-full h-auto rounded-lg"
              />
            )}
            {previewFile && previewType === "pdf" && (
              <iframe
                src={previewFile.file_url}
                className="w-full h-[70vh] rounded-lg border"
                title={previewFile.file_name}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <a href={previewFile?.file_url} download={previewFile?.file_name} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
