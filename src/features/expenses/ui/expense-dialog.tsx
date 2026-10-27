import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@doscientos/ui'
import { useState } from 'react'

import {
  expenseCategory,
  expenseWorks,
  useCurrentUser,
  useWorkspace,
  type Attachment,
  type Expense,
  type ExpenseCategory,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { useCommand } from '@/shared/lib/use-command'
import { AttachmentField } from '@/shared/ui/attachment-field'
import { ChoiceField, NumberField, TextField } from '@/shared/ui/form-controls'

import { expensesApi } from '../api'

const GENERAL = 'general'

/** Create or edit an expense. A foreman picks one of their works; the office may leave it general. */
export function ExpenseDialog({
  expense,
  defaultWorkId,
  onClose,
}: {
  expense?: Expense
  defaultWorkId?: string
  onClose: () => void
}) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const today = clock.today()
  const office = user?.role === 'admin'
  const works = user ? expenseWorks(workspace, user) : []
  const preferred =
    defaultWorkId ?? works.find((work) => work.status === 'en_curso')?.id ?? works[0]?.id
  const [workId, setWorkId] = useState(expense?.workId ?? (expense ? GENERAL : (preferred ?? '')))
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'combustible')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [euros, setEuros] = useState((expense?.amount ?? 0) / 100)
  const [date, setDate] = useState(expense?.date ?? today)
  const [paidWith, setPaidWith] = useState(expense?.paidWith ?? 'empresa')
  const [receipt, setReceipt] = useState<Attachment | null>(expense?.receipt ?? null)
  const valid =
    description.trim() !== '' && euros > 0 && date !== '' && date <= today && workId !== ''

  const save = useCommand(
    () => {
      if (!user) throw new Error('Sin sesión')
      const input = {
        date,
        workId: workId === GENERAL ? null : workId,
        category,
        description,
        amount: Math.round(euros * 100),
        paidWith,
        receipt,
      }
      return expense
        ? expensesApi.update(user.id, expense.id, input)
        : expensesApi.create(user.id, input).then(() => undefined)
    },
    {
      success: office
        ? 'Gasto guardado'
        : expense
          ? 'Gasto enviado de nuevo a la oficina'
          : 'Gasto enviado a la oficina para revisión',
      onSuccess: onClose,
    },
  )

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
          <DialogDescription>
            {office
              ? 'Queda aprobado directamente.'
              : 'La oficina lo revisará. Haz una foto del ticket para que lo puedan comprobar.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <AttachmentField label="Foto del ticket" value={receipt} onChange={setReceipt} />
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <NumberField
              label="Importe pagado (IVA incluido)"
              suffix="€"
              value={euros}
              invalid={euros <= 0}
              onChange={setEuros}
            />
            <TextField type="date" label="Fecha" value={date} max={today} onChange={setDate} />
          </div>
          <TextField
            className="sm:col-span-2"
            label="¿Qué se ha pagado?"
            placeholder="Ej. Gasolina de la furgoneta"
            value={description}
            onChange={setDescription}
          />
          <ChoiceField
            label="Categoría"
            value={category}
            onChange={(value) => setCategory(value as ExpenseCategory)}
            options={Object.entries(expenseCategory).map(([value, label]) => ({ value, label }))}
          />
          <ChoiceField
            label="Obra"
            value={workId}
            onChange={setWorkId}
            options={[
              ...(office ? [{ value: GENERAL, label: 'General (sin obra)' }] : []),
              ...works.map((work) => ({ value: work.id, label: `${work.code} · ${work.title}` })),
            ]}
          />
          <ChoiceField
            className="sm:col-span-2"
            label="¿Con qué se ha pagado?"
            value={paidWith}
            onChange={(value) => setPaidWith(value === 'propio' ? 'propio' : 'empresa')}
            options={[
              { value: 'empresa', label: 'Dinero o tarjeta de la empresa' },
              { value: 'propio', label: 'Lo he adelantado yo (me lo tienen que devolver)' },
            ]}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={() => save.mutate(undefined)} isDisabled={save.isPending || !valid}>
            {office ? 'Guardar gasto' : 'Enviar a la oficina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
