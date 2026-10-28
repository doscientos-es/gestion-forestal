import { Button, CopyButton } from '@doscientos/ui'
import { Eye, Link2, MessageCircle, Send } from 'lucide-react'

import { formatDateTime, pluralize } from '@/shared/lib/format'

import { Panel, PanelHeader } from './surface'

export type ShareState = {
  /** Last time it was emailed: when and to whom; null when never sent. */
  sent: { at: string; to: string } | null
  views: number
  lastViewAt: string | null
}

/** One sentence on where the document stands: not sent, sent, opened. */
export function shareSummary({ sent, views, lastViewAt }: ShareState) {
  const sentText = sent ? `Enviado el ${formatDateTime(sent.at)} a ${sent.to}` : 'Sin enviar todavía'
  const viewText =
    views === 0
      ? 'el cliente no lo ha abierto'
      : `abierto ${pluralize(views, 'vez', 'veces')}, la última el ${formatDateTime(lastViewAt ?? '')}`
  return `${sentText} · ${viewText}`
}

const linkClass =
  'focus-visible:outline-ring border-border hover:bg-muted inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-2'

/**
 * The same four actions for every document the client receives by link: preview it, copy the
 * link, email it or send it by WhatsApp. The preview never counts as a visit.
 */
export function ShareLinkCard({
  title = 'Enlace para el cliente',
  description,
  state,
  link,
  previewLink,
  sendLabel,
  onSend,
  whatsapp,
}: {
  title?: string
  description: string
  state: ShareState
  link: string
  previewLink: string
  sendLabel: string
  onSend: () => void
  /** `wa.me` link with the message ready, or null when the client has no phone. */
  whatsapp: string | null
}) {
  return (
    <Panel aria-labelledby="share-link-title">
      <PanelHeader
        id="share-link-title"
        icon={<Link2 className="size-5" strokeWidth={1.75} />}
        title={title}
        description={description}
      />
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm">{shareSummary(state)}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onPress={onSend}>
            <Send aria-hidden="true" className="size-4" /> {sendLabel}
          </Button>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <MessageCircle aria-hidden="true" className="size-4" /> WhatsApp
            </a>
          ) : null}
          <CopyButton value={link} variant="outline" size="sm" copiedLabel="Enlace copiado">
            Copiar enlace
          </CopyButton>
          <Button
            variant="outline"
            size="sm"
            onPress={() => window.open(previewLink, '_blank', 'noopener')}
          >
            <Eye aria-hidden="true" className="size-4" /> Previsualizar
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Previsualizar enseña lo mismo que verá el cliente, sin costes ni margen, y no cuenta como
          visita.
        </p>
      </div>
    </Panel>
  )
}
