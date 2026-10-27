import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Field,
  FieldLabel,
  Textarea,
} from '@doscientos/ui'
import { FlaskConical, Paperclip, Send } from 'lucide-react'
import { useId, useState } from 'react'

import { TextField } from './form-controls'

export type EmailFields = { to: string; subject: string; message: string }

const LOOKS_LIKE_EMAIL = /^\S+@\S+\.\S+$/

function EmailForm({
  initial,
  attachment,
  pending,
  confirmLabel,
  onCancel,
  onSend,
}: {
  initial: EmailFields
  attachment: string
  pending: boolean
  confirmLabel: string
  onCancel: () => void
  onSend: (email: EmailFields) => void
}) {
  const messageId = useId()
  const [to, setTo] = useState(initial.to)
  const [subject, setSubject] = useState(initial.subject)
  const [message, setMessage] = useState(initial.message)
  const valid = LOOKS_LIKE_EMAIL.test(to.trim()) && subject.trim() !== ''

  return (
    <>
      <div className="grid gap-3">
        <TextField
          label="Para"
          value={to}
          onChange={setTo}
          placeholder="correo@cliente.es"
          invalid={to !== '' && !LOOKS_LIKE_EMAIL.test(to.trim())}
        />
        <TextField label="Asunto" value={subject} onChange={setSubject} />
        <Field className="min-w-0 gap-1.5">
          <FieldLabel htmlFor={messageId} className="text-muted-foreground text-xs font-medium">
            Mensaje
          </FieldLabel>
          <Textarea
            id={messageId}
            rows={8}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-40 w-full text-sm"
          />
        </Field>
        <p className="text-muted-foreground bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-xs">
          <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{attachment}</span>
        </p>
        <Alert variant="info">
          <FlaskConical aria-hidden="true" className="size-4" />
          <AlertTitle>Modo demostración</AlertTitle>
          <AlertDescription>
            No sale ningún correo. El envío queda anotado en el historial como si se hubiera hecho.
          </AlertDescription>
        </Alert>
      </div>
      <DialogFooter>
        <Button variant="ghost" onPress={onCancel}>
          Cancelar
        </Button>
        <Button
          isDisabled={!valid || pending}
          onPress={() => onSend({ to: to.trim(), subject: subject.trim(), message })}
        >
          <Send aria-hidden="true" className="size-4" /> {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

/** Compose-and-send dialog. The caller decides what «send» does (here: record it, never deliver). */
export function SendEmailDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  attachment,
  pending,
  confirmLabel = 'Enviar correo',
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  initial: EmailFields
  attachment: string
  pending: boolean
  confirmLabel?: string
  onSend: (email: EmailFields) => void
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(34rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <EmailForm
          initial={initial}
          attachment={attachment}
          pending={pending}
          confirmLabel={confirmLabel}
          onCancel={() => onOpenChange(false)}
          onSend={onSend}
        />
      </DialogContent>
    </DialogRoot>
  )
}
