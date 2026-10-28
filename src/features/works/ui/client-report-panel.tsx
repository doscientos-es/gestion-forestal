import { useState } from 'react'

import {
  activityFor,
  clientWorkReport,
  lookup,
  useWorkspace,
  whatsappLink,
  type Work,
} from '@/features/workspace'
import { ShareLinkCard } from '@/shared/ui/share-link-card'

import { SendReportDialog, workReportLink, workReportPreviewLink } from './send-report-dialog'

/** Share the progress report with the client: preview, copy the link, email or WhatsApp it. */
export function ClientReportPanel({ work }: { work: Work }) {
  const workspace = useWorkspace()
  const [sending, setSending] = useState(false)
  const link = workReportLink(work.id)
  const report = clientWorkReport(work, workspace)
  const client = lookup(workspace).client(work.clientId)
  const events = activityFor(workspace.activity, 'work', work.id)
  const views = events.filter((event) => event.kind === 'informe_visto')
  const sent = events.find((event) => event.kind === 'informe_enviado')

  return (
    <>
      <ShareLinkCard
        description={`Avance, diario y ${report.photos.length} fotos. Sin costes ni márgenes.`}
        state={{
          sent: sent ? { at: sent.at, to: sent.summary } : null,
          views: views.length,
          lastViewAt: views[0]?.at ?? null,
        }}
        link={link}
        previewLink={workReportPreviewLink(work.id)}
        sendLabel={sent ? 'Reenviar informe' : 'Enviar informe'}
        onSend={() => setSending(true)}
        whatsapp={
          client
            ? whatsappLink(
              client.phone,
              `Hola, le enviamos el informe de la obra «${work.title}»: ${link}`,
            )
            : null
        }
      />
      <SendReportDialog work={work} open={sending} onOpenChange={setSending} />
    </>
  )
}
