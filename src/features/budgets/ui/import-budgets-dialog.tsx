import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@doscientos/ui'
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react'
import { useId, useState } from 'react'

import {
  budgetCsvTemplate,
  estimateBudget,
  parseBudgetCsv,
  useWorkspace,
  type BudgetImportPreview,
  type BudgetLine,
} from '@/features/workspace'
import { downloadTextFile } from '@/shared/lib/download'
import { formatMoney, pluralize } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { Tag } from '@/shared/ui/surface'

import { budgetsApi } from '../api'
import { DEFAULT_PARAMS } from '../application/budget-draft'

/** Imports draft budgets from a spreadsheet: shows what will be created and what is wrong first. */
export function ImportBudgetsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const workspace = useWorkspace()
  const inputId = useId()
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<BudgetImportPreview | null>(null)
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setFileName('')
      setPreview(null)
    }
  }
  const save = useCommand(() => budgetsApi.importCsv(preview?.budgets ?? []), {
    success: (created) => ({
      title: `${pluralize(created.length, 'presupuesto importado', 'presupuestos importados')}`,
      description: 'Quedan como borrador, listos para revisar y enviar.',
    }),
    onSuccess: () => close(false),
  })

  const read = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setPreview(parseBudgetCsv(await file.text(), workspace))
  }

  return (
    <DialogRoot open={open} onOpenChange={close}>
      <DialogContent className="w-[min(40rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>Importar presupuestos desde CSV</DialogTitle>
          <DialogDescription>
            Una fila por partida; las filas con la misma obra y cliente forman un presupuesto. Los
            clientes y zonas que no existan se crean al importar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={inputId} className="sr-only">
            Archivo CSV
          </label>
          <input
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void read(event.target.files?.[0])}
            className="border-border file:bg-muted file:text-foreground focus-visible:outline-ring min-w-0 flex-1 rounded-md border text-sm file:mr-3 file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium focus-visible:outline-2"
          />
          <Button
            variant="outline"
            onPress={() =>
              downloadTextFile('plantilla-presupuestos.csv', budgetCsvTemplate(workspace))
            }
          >
            <Download aria-hidden="true" className="size-4" /> Plantilla
          </Button>
        </div>
        {preview ? (
          <div className="space-y-3">
            {preview.budgets.length > 0 ? (
              <ul className="divide-border border-border divide-y rounded-lg border">
                {preview.budgets.map((budget) => {
                  const lines = budget.lines.map(
                    (line, index) => ({ ...line, id: String(index) }) as BudgetLine,
                  )
                  const price = estimateBudget(lines, DEFAULT_PARAMS, workspace.species).price
                  return (
                    <li
                      key={`${budget.title}|${budget.clientName}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm"
                    >
                      <FileSpreadsheet
                        aria-hidden="true"
                        className="text-muted-foreground size-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{budget.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {budget.clientName} · {budget.zoneName} ·{' '}
                          {pluralize(budget.lines.length, 'partida', 'partidas')}
                        </span>
                      </span>
                      {budget.clientId ? null : <Tag tone="amber">Cliente nuevo</Tag>}
                      <span className="font-semibold tabular-nums">{formatMoney(price)}</span>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {preview.issues.length > 0 ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900" role="alert">
                <p className="mb-1 flex items-center gap-2 font-semibold">
                  <AlertTriangle aria-hidden="true" className="size-4" />
                  {pluralize(preview.issues.length, 'fila con errores', 'filas con errores')}: la
                  obra a la que pertenecen no se importa
                </p>
                <ul className="list-disc pl-6">
                  {preview.issues.slice(0, 6).map((issue) => (
                    <li key={`${issue.line}-${issue.message}`}>
                      Fila {issue.line}: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {preview.budgets.length === 0 && preview.issues.length === 0 ? (
              <p className="text-muted-foreground text-sm">«{fileName}» no tiene filas.</p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onPress={() => close(false)}>
            Cancelar
          </Button>
          <Button
            isDisabled={!preview || preview.budgets.length === 0 || save.isPending}
            onPress={() => save.mutate(undefined)}
          >
            {preview && preview.budgets.length > 0
              ? `Importar ${pluralize(preview.budgets.length, 'presupuesto', 'presupuestos')}`
              : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
