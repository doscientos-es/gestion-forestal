import { CopyButton, Field, FieldLabel, Textarea } from '@doscientos/ui'
import { MessageCircle, Phone, Users } from 'lucide-react'
import { useId, useState } from 'react'

import {
  callLink,
  messageFor,
  messageTemplates,
  roleLabels,
  useWorkspace,
  whatsappLink,
  type Assignment,
  type Person,
  type Work,
} from '@/features/workspace'
import { ChoiceField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader } from '@/shared/ui/surface'

const linkClass =
  'focus-visible:outline-ring inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-2'

/**
 * Quick contact for the crews working on a work: one WhatsApp chat per person with the message
 * ready (WhatsApp links cannot open a group), or copy the text to paste in the crew's group.
 */
export function CrewContactPanel({
  work,
  assignments,
  sender,
}: {
  work: Work
  assignments: Assignment[]
  sender: Person | null
}) {
  const workspace = useWorkspace()
  const messageId = useId()
  const [templateId, setTemplateId] = useState('convocatoria')
  const first = assignments[0]
  const [edited, setEdited] = useState<string | null>(null)
  const message = edited ?? messageFor(templateId, work, first, sender)
  const crewIds = new Set(assignments.map((item) => item.crewId))
  const members = workspace.people.filter((person) => person.crewId && crewIds.has(person.crewId))

  return (
    <Panel aria-labelledby="contact-title">
      <PanelHeader
        id="contact-title"
        icon={<Users className="size-5" strokeWidth={1.75} />}
        title="Avisar a la cuadrilla"
        description="Abre WhatsApp con el mensaje preparado."
        meta={members.length}
      />
      {members.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">
          Asigna la obra a una cuadrilla para poder avisarla desde aquí.
        </p>
      ) : (
        <>
          <div className="grid gap-3 border-b px-5 py-4">
            <ChoiceField
              label="Plantilla"
              value={templateId}
              onChange={(value) => {
                setTemplateId(value)
                setEdited(null)
              }}
              options={messageTemplates.map((item) => ({ value: item.id, label: item.label }))}
            />
            <Field className="min-w-0 gap-1.5">
              <FieldLabel htmlFor={messageId} className="text-muted-foreground text-xs font-medium">
                Mensaje
              </FieldLabel>
              <Textarea
                id={messageId}
                rows={4}
                value={message}
                onChange={(event) => setEdited(event.target.value)}
                className="w-full text-sm"
              />
            </Field>
            <CopyButton
              value={message}
              variant="outline"
              size="sm"
              className="self-start"
              copiedLabel="Mensaje copiado"
            >
              Copiar para el grupo
            </CopyButton>
          </div>
          <ul className="divide-border divide-y">
            {members.map((person) => {
              const chat = whatsappLink(person.phone, message)
              const call = callLink(person.phone)
              return (
                <li key={person.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{person.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {roleLabels[person.role]} · {person.phone || 'Sin teléfono'}
                    </span>
                  </span>
                  {call ? (
                    <a href={call} aria-label={`Llamar a ${person.name}`} className={linkClass}>
                      <Phone aria-hidden="true" className="size-4" />
                    </a>
                  ) : null}
                  {chat ? (
                    <a
                      href={chat}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Enviar WhatsApp a ${person.name}`}
                      className={linkClass}
                    >
                      <MessageCircle aria-hidden="true" className="size-4" /> WhatsApp
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Panel>
  )
}
