import { Button, ConfirmDialog, IconButton } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, CheckCheck, FileText, Receipt, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import { WorkExpensesPanel } from '@/features/expenses'
import { AssignDialog, CrewContactPanel } from '@/features/planning'
import { TaskChecklist } from '@/features/tasks'
import {
  cumulativeProgress,
  lookup,
  marginAlerts,
  proposeDraft,
  useCurrentUser,
  useWorkspace,
  workStatus,
  workProfitability,
  type Work,
} from '@/features/workspace'
import { formatPercent, formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { worksApi } from '../api'
import { ClientReportPanel } from './client-report-panel'
import { ClientWorkComparison } from './client-work-comparison'
import { CrewWorkSummary } from './crew-work-summary'
import { MarginAlerts } from './margin-alerts'
import { ProgressChart } from './progress-chart'
import { WorkEconomicsPanel } from './work-economics-panel'
import { WorkFigures } from './work-figures'
import { WorkReports } from './work-reports'

export function WorkDetailPage({ work }: { work: Work }) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [assignOpen, setAssignOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const find = lookup(workspace)
  const analysis = workProfitability(workspace, work)
  const { performance } = analysis
  const points = cumulativeProgress(work, workspace.reports)
  const proposal = proposeDraft(work, performance, workspace.invoices)
  const assignments = workspace.assignments.filter((item) => item.workId === work.id)
  const status = workStatus[work.status]
  const isAdmin = user?.role === 'admin'
  const canContact = isAdmin || user?.role === 'capataz'
  const alerts = marginAlerts(workspace).filter((alert) => alert.work.id === work.id)

  const invoice = useCommand(() => worksApi.createInvoiceDraft(work.id), {
    success: () => ({
      title: 'Borrador de factura creado',
      description: 'Revísalo y envíalo a la gestoría desde Facturas.',
    }),
    onSuccess: () => void navigate({ to: '/facturas' }),
  })
  const finish = useCommand(() => worksApi.finish(work.id), {
    success: 'Obra terminada',
    onSuccess: () => setConfirmFinish(false),
  })

  return (
    <>
      <PageTop
        back={{ to: '/obras', label: 'Volver a obras' }}
        title={work.title}
        description={[
          work.code,
          isAdmin ? find.client(work.clientId)?.name : undefined,
          find.zone(work.zoneId)?.name,
          work.speciesIds.map((id) => find.species(id)?.name).join(', '),
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          isAdmin ? (
            <>
              <IconButton
                label="Ver presupuesto de origen"
                variant="outline"
                onPress={() =>
                  void navigate({
                    to: '/presupuestos/$budgetId',
                    params: { budgetId: work.budgetId },
                  })
                }
              >
                <FileText aria-hidden="true" className="size-4" />
              </IconButton>
              {work.status === 'pendiente' ||
              work.status === 'planificada' ||
              work.status === 'en_curso' ? (
                <Button variant="outline" onPress={() => setAssignOpen(true)}>
                  <CalendarPlus aria-hidden="true" className="size-4" /> Asignar cuadrilla
                </Button>
              ) : null}
              {work.status === 'en_curso' ? (
                <Button variant="outline" onPress={() => setConfirmFinish(true)}>
                  <CheckCheck aria-hidden="true" className="size-4" /> Dar por terminada
                </Button>
              ) : null}
              {proposal ? (
                <Button isDisabled={invoice.isPending} onPress={() => invoice.mutate(undefined)}>
                  <Receipt aria-hidden="true" className="size-4" />
                  {proposal.kind === 'final'
                    ? 'Facturar liquidación'
                    : `Facturar avance ${formatPercent(proposal.progressTo)}`}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Tag tone={status.tone} dot>
          {status.label}
        </Tag>
        {assignments.map((item) => (
          <Tag key={item.id}>
            {find.crew(item.crewId)?.name} · {formatShortDate(item.start)} –{' '}
            {formatShortDate(item.end)}
          </Tag>
        ))}
      </div>
      {isAdmin ? <MarginAlerts alerts={alerts} linkToWork={false} /> : null}
      {isAdmin ? (
        <WorkFigures work={work} performance={performance} />
      ) : (
        <CrewWorkSummary work={work} performance={performance} assignment={assignments[0]} />
      )}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {user ? (
            <TaskChecklist
              work={work}
              user={user}
              canEdit={Boolean(isAdmin)}
              onAssign={() => setAssignOpen(true)}
            />
          ) : null}
          <Panel aria-labelledby="progress-title">
            <PanelHeader
              id="progress-title"
              icon={<TrendingUp className="size-5" strokeWidth={1.75} />}
              title="Avance acumulado"
              description="Plantas reales frente al ritmo presupuestado."
            />
            {points.length > 0 ? (
              <div className="p-4">
                <ProgressChart points={points} title={`Avance de ${work.title}`} />
              </div>
            ) : (
              <EmptyPanel
                icon={<TrendingUp className="size-5" />}
                title="Sin avance todavía"
                description="El gráfico aparecerá con el primer parte diario."
              />
            )}
          </Panel>
          {isAdmin ? <WorkEconomicsPanel analysis={analysis} /> : null}
          {isAdmin ? <ClientReportPanel work={work} /> : null}
          {canContact ? (
            <CrewContactPanel work={work} assignments={assignments} sender={user} />
          ) : null}
          <WorkExpensesPanel work={work} />
        </div>
        <WorkReports work={work} workspace={workspace} />
      </div>
      {isAdmin ? <ClientWorkComparison key={work.id} work={work} workspace={workspace} /> : null}
      {isAdmin ? (
        <AssignDialog
          key={String(assignOpen)}
          work={work}
          open={assignOpen}
          onOpenChange={setAssignOpen}
        />
      ) : null}
      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="¿Dar la obra por terminada?"
        description="El capataz ya no podrá añadir partes. Después podrás facturar la liquidación final."
        confirmLabel="Terminar obra"
        pending={finish.isPending}
        onConfirm={() => finish.mutate(undefined)}
      />
    </>
  )
}
