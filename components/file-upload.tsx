"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ExistingFile {
  id?: string
  file_name: string
  file_url: string
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

  return (
    <div className="flex flex-col gap-2">
      {/* Existing files list */}
      {files.map((f, idx) => (
        <div
          key={f.id ?? idx}
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-emerald-600" />
            <a
              href={f.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-700 underline hover:text-emerald-900"
            >
              {f.file_name}
            </a>
          </div>
          {(onRemoveFile && f.id) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFile(f.id!)}
              className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          ) : onRemove && files.length === 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          ) : null}
        </div>
      ))}

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
    </div>
  )
}
