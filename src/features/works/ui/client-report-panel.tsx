import { Button, CopyButton } from '@doscientos/ui'
import { Copy, ExternalLink, FileText, Mail } from 'lucide-react'
import { useState } from 'react'

import {
  activityFor,
  clientWorkReport,
  lookup,
  workReportEmailDraft,
  useWorkspace,
  type Work,
} from '@/features/workspace'
import { formatDateTime, pluralize } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { SendEmailDialog } from '@/shared/ui/send-email-dialog'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { worksApi } from '../api'

export function workReportLink(workId: string) {
  return `${window.location.origin}/informe/${workId}`
}

/** Share the progress report with the client: open it, copy the link or email it (simulated). */
export function ClientReportPanel({ work }: { work: Work }) {
  const workspace = useWorkspace()
  const [sending, setSending] = useState(false)
  const link = workReportLink(work.id)
  const report = clientWorkReport(work, workspace)
  const events = activityFor(workspace.activity, 'work', work.id)
  const views = events.filter((event) => event.kind === 'informe_visto')
  const sent = events.find((event) => event.kind === 'informe_enviado')
  const send = useCommand(
    (email: { to: string; subject: string; message: string }) =>
      worksApi.sendReportEmail(work.id, email),
    {
      success: (_output, email) => ({
        title: 'Informe enviado (simulado)',
        description: `Anotado en el historial · ${email.to}`,
      }),
      onSuccess: () => setSending(false),
    },
  )

  return (
    <Panel aria-labelledby="client-report-title">
      <PanelHeader
        id="client-report-title"
        icon={<FileText className="size-5" strokeWidth={1.75} />}
        title="Informe para el cliente"
        description="Avance, diario y fotos. Sin costes ni márgenes."
      />
      <div className="space-y-3 px-5 py-4">
        <p className="text-muted-foreground text-sm">
          {pluralize(report.photos.length, 'foto', 'fotos')} ·{' '}
          {sent ? `enviado el ${formatDateTime(sent.at)} a ${sent.summary}` : 'sin enviar'} ·{' '}
          {views.length === 0
            ? 'sin aperturas'
            : `${pluralize(views.length, 'apertura', 'aperturas')}, la última el ${formatDateTime(views[0]?.at ?? '')}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onPress={() => setSending(true)}>
            <Mail aria-hidden="true" className="size-4" />
            {sent ? 'Reenviar informe' : 'Enviar al cliente'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={() => window.open(link, '_blank', 'noopener')}
          >
            <ExternalLink aria-hidden="true" className="size-4" /> Ver como cliente
          </Button>
          <CopyButton value={link} variant="outline" size="sm" copiedLabel="Enlace copiado">
            <Copy aria-hidden="true" className="size-4" /> Copiar enlace
          </CopyButton>
        </div>
      </div>
      <SendEmailDialog
        key={String(sending)}
        open={sending}
        onOpenChange={setSending}
        title="Enviar informe de obra"
        description={`${work.code} · ${work.title}`}
        initial={workReportEmailDraft(
          work.title,
          lookup(workspace).client(work.clientId),
          report.progress,
          link,
        )}
        attachment={`Informe ${work.code}.pdf · enlace de consulta`}
        pending={send.isPending}
        confirmLabel="Enviar informe"
        onSend={(email) => send.mutate(email)}
      />
    </Panel>
  )
}
