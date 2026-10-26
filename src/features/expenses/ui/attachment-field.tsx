import { Button, IconButton, toast } from '@doscientos/ui'
import { Camera, FileText, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import type { Attachment } from '@/features/workspace'
import { readAttachment } from '@/shared/lib/attachment'
import { DomainError } from '@/shared/lib/errors'

/** Photo or PDF picker. On a phone the system offers the camera first, which is the common case. */
export function AttachmentField({
  label,
  value,
  onChange,
  pickLabel = 'Hacer foto o elegir archivo',
}: {
  label: string
  value: Attachment | null
  onChange: (value: Attachment | null) => void
  pickLabel?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      onChange(await readAttachment(file))
    } catch (error) {
      toast.error(error instanceof DomainError ? error.message : 'No se ha podido adjuntar.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-muted-foreground mb-1.5 text-xs font-medium">{label}</p>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-label={label}
        tabIndex={-1}
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      {value ? (
        <div className="border-border flex items-center gap-3 rounded-lg border p-2">
          {value.mime.startsWith('image/') ? (
            <img src={value.dataUrl} alt={label} className="size-14 rounded-md object-cover" />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-md">
              <FileText aria-hidden="true" className="size-6" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{value.name}</span>
          <Button variant="ghost" size="sm" onPress={() => input.current?.click()}>
            Cambiar
          </Button>
          <IconButton
            label={`Quitar ${label.toLowerCase()}`}
            variant="ghost"
            onPress={() => onChange(null)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      ) : (
        <Button
          variant="outline"
          className="h-12 w-full justify-center border-dashed"
          isDisabled={busy}
          onPress={() => input.current?.click()}
        >
          <Camera aria-hidden="true" className="size-4" />
          {busy ? 'Procesando…' : pickLabel}
        </Button>
      )}
    </div>
  )
}
