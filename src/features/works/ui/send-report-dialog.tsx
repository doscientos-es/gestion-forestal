import {
  clientWorkReport,
  lookup,
  useWorkspace,
  workReportEmailDraft,
  type Work,
} from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { SendEmailDialog } from '@/shared/ui/send-email-dialog'

import { worksApi } from '../api'

export function workReportLink(workId: string) {
  return `${window.location.origin}/informe/${workId}`
}

/** Same page for the office to check: it is not recorded as a visit. */
export function workReportPreviewLink(workId: string) {
  return `${workReportLink(workId)}?previa=1`
}

/** Email the client their progress report (simulated: it is logged, nothing leaves the app). */
export function SendReportDialog({
  work,
  open,
  onOpenChange,
}: {
  work: Work
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const workspace = useWorkspace()
  const report = clientWorkReport(work, workspace)
  const send = useCommand(
    (email: { to: string; subject: string; message: string }) =>
      worksApi.sendReportEmail(work.id, email),
    {
      success: (_output, email) => ({
        title: 'Informe enviado',
        description: `Anotado en el historial · ${email.to}`,
      }),
      onSuccess: () => onOpenChange(false),
    },
  )

  return (
    <SendEmailDialog
      key={String(open)}
      open={open}
      onOpenChange={onOpenChange}
      title="Enviar informe de obra"
      description={`${work.code} · ${work.title}`}
      initial={workReportEmailDraft(
        work.title,
        lookup(workspace).client(work.clientId),
        report.progress,
        workReportLink(work.id),
      )}
      attachment={`Informe ${work.code}.pdf · enlace de consulta`}
      pending={send.isPending}
      confirmLabel="Enviar informe"
      onSend={(email) => send.mutate(email)}
    />
  )
}
