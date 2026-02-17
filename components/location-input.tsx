"use client"

import { useState, useRef, useEffect } from "react"
import useSWR from "swr"
import { MapPin, Plus, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

async function fetchLocations() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, google_maps_url")
    .order("name", { ascending: true })
  if (error) throw error
  return data ?? []
}

interface LocationInputProps {
  label: string
  value: string
  onChange: (name: string, locationId?: string) => void
  required?: boolean
}

export function LocationInput({ label, value, onChange, required }: LocationInputProps) {
  const { data: locations, mutate } = useSWR("locations", fetchLocations)
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newMapsUrl, setNewMapsUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = locations?.filter((l) =>
    l.name.toLowerCase().includes(inputValue.toLowerCase())
  ) ?? []

  const selectedLocation = locations?.find((l) => l.name === value)

  async function handleCreateLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("El nombre de la ubicación es requerido")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("locations")
      .insert({
        name: newName.trim(),
        google_maps_url: newMapsUrl.trim() || null,
      })
      .select("id, name")
      .single()
    setSaving(false)

    if (error) {
      toast.error("Error al crear ubicación: " + error.message)
      return
    }

    toast.success("Ubicación creada")
    setNewName("")
    setNewMapsUrl("")
    setShowCreate(false)
    mutate()
    onChange(data.name, data.id)
    setInputValue(data.name)
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar o escribir ubicación..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                onChange(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10"
            />
          </div>
          {selectedLocation?.google_maps_url && (
            <a href={selectedLocation.google_maps_url} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="icon" title="Ver en Google Maps">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              setNewName(inputValue)
              setShowCreate(true)
            }}
            title="Nueva ubicación"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showSuggestions && inputValue && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                onClick={() => {
                  setInputValue(loc.name)
                  onChange(loc.name, loc.id)
                  setShowSuggestions(false)
                }}
              >
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>{loc.name}</span>
                {loc.google_maps_url && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Ubicación</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLocation} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-name"
                placeholder="Nombre de la ubicación"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-maps">Link de Google Maps</Label>
              <Input
                id="loc-maps"
                placeholder="https://maps.google.com/..."
                value={newMapsUrl}
                onChange={(e) => setNewMapsUrl(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Creando..." : "Crear Ubicación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
