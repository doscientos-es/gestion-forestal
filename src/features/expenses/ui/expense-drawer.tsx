import {
  Button,
  DetailDrawer,
  DetailDrawerBody,
  DetailDrawerFooter,
  DetailDrawerHeader,
  DrawerDescription,
  DrawerTitle,
  Textarea,
} from '@doscientos/ui'
import { Check, Download, Pencil, Trash2, Undo2, X } from 'lucide-react'
import { useState } from 'react'

import {
  expenseCategory,
  expenseStatus,
  lookup,
  missingInvoice,
  needsReimbursement,
  useCurrentUser,
  useWorkspace,
  type Expense,
} from '@/features/workspace'
import { downloadDataUrl } from '@/shared/lib/download'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { AttachmentField } from '@/shared/ui/attachment-field'
import { TextField } from '@/shared/ui/form-controls'
import { Tag } from '@/shared/ui/surface'

import { expensesApi } from '../api'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

export function ExpenseDrawer({
  expenseId,
  onClose,
  onEdit,
}: {
  expenseId: string | null
  onClose: () => void
  onEdit: (expense: Expense) => void
}) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const find = lookup(workspace)
  const expense = workspace.expenses.find((item) => item.id === expenseId) ?? null
  const office = user?.role === 'admin'
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const actor = user?.id ?? ''

  const review = useCommand(
    (approve: boolean) =>
      expensesApi.review(
        actor,
        expense?.id ?? '',
        approve ? { approve: true } : { approve: false, reason },
      ),
    {
      success: (_output, approve) => ({
        title: approve ? 'Gasto aprobado' : 'Gasto rechazado',
      }),
      onSuccess: () => {
        setRejecting(false)
        setReason('')
      },
    },
  )
  const attach = useCommand(
    (input: { number: string; file: Expense['invoice'] }) =>
      expensesApi.attachInvoice(actor, expense?.id ?? '', input),
    { success: 'Factura guardada', onSuccess: () => setInvoiceNumber('') },
  )
  const reimburse = useCommand(() => expensesApi.markReimbursed(actor, expense?.id ?? ''), {
    success: 'Marcado como reembolsado',
  })
  const remove = useCommand(() => expensesApi.remove(actor, expense?.id ?? ''), {
    success: 'Gasto eliminado',
    onSuccess: onClose,
  })

  const own = expense?.createdBy === user?.id
  const canEdit = Boolean(expense && (office || (own && expense.status !== 'aprobado')))

  return (
    <DetailDrawer isOpen={Boolean(expense)} onOpenChange={(open) => !open && onClose()}>
      {expense ? (
        <>
          <DetailDrawerHeader>
            <DrawerTitle>{expense.description}</DrawerTitle>
            <DrawerDescription>
              {formatMoney(expense.amount, true)} · {formatDate(expense.date)}
            </DrawerDescription>
          </DetailDrawerHeader>
          <DetailDrawerBody className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={expenseStatus[expense.status].tone} dot>
                {expenseStatus[expense.status].label}
              </Tag>
              {missingInvoice(expense) ? <Tag tone="amber">Falta factura</Tag> : null}
              {needsReimbursement(expense) ? <Tag tone="blue">Por reembolsar</Tag> : null}
            </div>
            {expense.status === 'rechazado' ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {expense.rejectReason}
              </p>
            ) : null}
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Obra">
                {expense.workId ? find.work(expense.workId)?.title : 'General (sin obra)'}
              </Fact>
              <Fact label="Categoría">{expenseCategory[expense.category]}</Fact>
              <Fact label="Registrado por">{find.person(expense.createdBy)?.name}</Fact>
              <Fact label="Pagado con">
                {expense.paidWith === 'propio' ? 'Adelantado por la persona' : 'Empresa'}
              </Fact>
              {expense.reviewedOn ? (
                <Fact label="Revisado">
                  {formatDate(expense.reviewedOn)} · {find.person(expense.reviewedBy ?? '')?.name}
                </Fact>
              ) : null}
              {expense.reimbursedOn ? (
                <Fact label="Reembolsado">{formatDate(expense.reimbursedOn)}</Fact>
              ) : null}
            </dl>
            <Evidence title="Ticket" file={expense.receipt} empty="Sin foto del ticket" />
            <Evidence
              title={expense.invoiceNumber ? `Factura ${expense.invoiceNumber}` : 'Factura'}
              file={expense.invoice}
              empty={expense.invoiceNumber ? 'Número anotado, sin archivo' : 'Sin factura adjunta'}
            />
            {office && expense.status === 'aprobado' ? (
              <div className="border-border space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">Adjuntar factura</p>
                <TextField
                  label="Número de factura"
                  value={invoiceNumber}
                  onChange={setInvoiceNumber}
                />
                <AttachmentField
                  label="Archivo de la factura"
                  value={expense.invoice}
                  pickLabel="Subir PDF o foto de la factura"
                  onChange={(file) => attach.mutate({ number: expense.invoiceNumber, file })}
                />
                <Button
                  variant="outline"
                  isDisabled={!invoiceNumber.trim() || attach.isPending}
                  onPress={() => attach.mutate({ number: invoiceNumber, file: null })}
                >
                  Guardar número
                </Button>
              </div>
            ) : null}
            {rejecting ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="reject-reason">
                  Motivo del rechazo
                </label>
                <Textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. Falta el ticket o el importe no coincide"
                />
              </div>
            ) : null}
          </DetailDrawerBody>
          <DetailDrawerFooter className="flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <Button variant="outline" onPress={() => onEdit(expense)}>
                  <Pencil aria-hidden="true" className="size-4" /> Editar
                </Button>
              ) : null}
              {canEdit && (office || expense.status !== 'aprobado') ? (
                <Button variant="ghost" onPress={() => remove.mutate(undefined)}>
                  <Trash2 aria-hidden="true" className="size-4" /> Eliminar
                </Button>
              ) : null}
            </div>
            {office && expense.status !== 'aprobado' && !rejecting ? (
              <div className="flex gap-2">
                <Button variant="outline" onPress={() => setRejecting(true)}>
                  <X aria-hidden="true" className="size-4" /> Rechazar
                </Button>
                <Button onPress={() => review.mutate(true)} isDisabled={review.isPending}>
                  <Check aria-hidden="true" className="size-4" /> Aprobar
                </Button>
              </div>
            ) : null}
            {rejecting ? (
              <div className="flex gap-2">
                <Button variant="ghost" onPress={() => setRejecting(false)}>
                  <Undo2 aria-hidden="true" className="size-4" /> Cancelar
                </Button>
                <Button
                  onPress={() => review.mutate(false)}
                  isDisabled={!reason.trim() || review.isPending}
                >
                  Rechazar gasto
                </Button>
              </div>
            ) : null}
            {office && needsReimbursement(expense) ? (
              <Button onPress={() => reimburse.mutate(undefined)} isDisabled={reimburse.isPending}>
                Marcar como reembolsado
              </Button>
            ) : null}
          </DetailDrawerFooter>
        </>
      ) : null}
    </DetailDrawer>
  )
}

function Evidence({
  title,
  file,
  empty,
}: {
  title: string
  file: Expense['receipt']
  empty: string
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs">{title}</p>
      {file ? (
        <div className="border-border space-y-2 rounded-lg border p-2">
          {file.mime.startsWith('image/') ? (
            <img
              src={file.dataUrl}
              alt={title}
              className="max-h-72 w-full rounded-md object-contain"
            />
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => downloadDataUrl(file.name, file.dataUrl)}
          >
            <Download aria-hidden="true" className="size-4" /> {file.name}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm">{empty}</p>
      )}
    </div>
  )
}
