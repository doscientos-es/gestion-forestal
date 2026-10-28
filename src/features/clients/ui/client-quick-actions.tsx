import { Button, DropdownMenu, DropdownMenuItem } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { FilePlus2, MessageCircle, Phone, Send } from 'lucide-react'
import { useState } from 'react'

import { SendReportDialog } from '@/features/works'
import { callLink, whatsappLink, type Client, type Work } from '@/features/workspace'

const linkClass =
  'focus-visible:outline-ring border-border hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-2'

/** The three things the office does most with a client, one click each. */
export function ClientQuickActions({ client, works }: { client: Client; works: Work[] }) {
  const navigate = useNavigate()
  const [reportFor, setReportFor] = useState<Work | null>(null)
  const call = callLink(client.phone)
  const chat = whatsappLink(client.phone, `Hola, te escribimos de la empresa sobre ${client.name}.`)

  return (
    <>
      <Button
        onPress={() => void navigate({ to: '/presupuestos/nuevo', search: { cliente: client.id } })}
      >
        <FilePlus2 aria-hidden="true" className="size-4" /> Nuevo presupuesto
      </Button>
      {works.length === 1 && works[0] ? (
        <Button variant="outline" onPress={() => setReportFor(works[0] ?? null)}>
          <Send aria-hidden="true" className="size-4" /> Enviar informe
        </Button>
      ) : (
        <DropdownMenu
          placement="bottom end"
          trigger={
            <Button variant="outline" isDisabled={works.length === 0}>
              <Send aria-hidden="true" className="size-4" /> Enviar informe
            </Button>
          }
        >
          {works.map((work) => (
            <DropdownMenuItem key={work.id} onAction={() => setReportFor(work)}>
              {work.code} · {work.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      )}
      {call ? (
        <a href={call} className={linkClass}>
          <Phone aria-hidden="true" className="size-4" /> Llamar
        </a>
      ) : null}
      {chat ? (
        <a
          href={chat}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp a ${client.name}`}
          className={linkClass}
        >
          <MessageCircle aria-hidden="true" className="size-4" /> WhatsApp
        </a>
      ) : null}
      {reportFor ? (
        <SendReportDialog
          work={reportFor}
          open
          onOpenChange={(open) => !open && setReportFor(null)}
        />
      ) : null}
    </>
  )
}
