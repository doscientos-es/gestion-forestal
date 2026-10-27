import {
  addDays,
  addWorkingDays,
  isWorkingDay,
  monthOf,
  nextWorkingDay,
  startOfWeek,
  yearOf,
  type IsoDate,
} from '@/shared/lib/dates'

import { estimateBudget, toPlannedFigures } from '../application/budget-calculation'
import { DEFAULT_VAT_RATE } from '../application/invoice-draft'
import type {
  Assignment,
  Attachment,
  Budget,
  DailyReport,
  Expense,
  Incident,
  InvoiceDraft,
  Work,
  Workspace,
} from '../application/model'
import { availableMembers } from '../application/planning'
import { seedActivity } from './seed-activity'
import { seedClients, seedCrews, seedPeople, seedSpecies, seedZones } from './seed-catalog'
import {
  defaultParams,
  planting,
  seedAbsences,
  seedWorks,
  treatment,
  withLineIds,
  type SeedWork,
} from './seed-scenario'

/** Deterministic noise in [-1, 1] so every reset produces the same data. */
function noise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43_758.5453
  return (value - Math.floor(value)) * 2 - 1
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** Builds the demo scenario around `today`; reports exist up to the previous working day. */
export function buildSeed(today: IsoDate): Workspace {
  const anchor = startOfWeek(today)
  const year = monthOf(anchor) >= 5 ? yearOf(anchor) : yearOf(anchor) - 1
  const absences = seedAbsences(year, anchor)
  const workspace: Workspace = {
    version: 1,
    anchor,
    clients: seedClients,
    zones: seedZones,
    species: seedSpecies,
    people: seedPeople,
    crews: seedCrews,
    budgets: [],
    works: [],
    assignments: [],
    reports: [],
    absences,
    invoices: [],
    tasks: [],
    notifications: [],
    expenses: [],
    activity: [],
  }
  const codeCount = new Map<number, number>()
  const budgetCount = new Map<number, number>()
  let invoiceSeq = 0

  seedWorks(year, anchor).forEach((item, index) => {
    const workYear = yearOf(item.start)
    const budgetDate = addDays(item.start, -24)
    const budgetYear = yearOf(budgetDate)
    budgetCount.set(budgetYear, (budgetCount.get(budgetYear) ?? 0) + 1)
    codeCount.set(workYear, (codeCount.get(workYear) ?? 0) + 1)
    const params = { ...defaultParams, targetMargin: item.margin ?? defaultParams.targetMargin }
    const estimate = estimateBudget(item.lines, params, seedSpecies)
    const id = `w-${pad(index + 1)}`
    const budgetId = `b-${pad(index + 1)}`
    const budget: Budget = {
      id: budgetId,
      number: `P-${budgetYear}-${String(budgetCount.get(budgetYear)).padStart(3, '0')}`,
      title: item.title,
      clientId: item.clientId,
      zoneId: item.zoneId,
      date: budgetDate,
      status: 'aceptado',
      lines: withLineIds(budgetId, item.lines),
      params,
      notes: '',
      workId: id,
    }
    const hasReports = item.state !== 'pendiente' && item.state !== 'planificada'
    const reports = hasReports ? simulateReports(id, item, estimate, today, workspace) : []
    const lastDate = reports.at(-1)?.date ?? null
    const work: Work = {
      id,
      code: `OB-${String(workYear).slice(2)}-${pad(codeCount.get(workYear) ?? 1)}`,
      title: item.title,
      budgetId: budget.id,
      clientId: item.clientId,
      zoneId: item.zoneId,
      speciesIds: [
        ...new Set(
          item.lines.flatMap((line) => (line.kind === 'plantacion' ? [line.speciesId] : [])),
        ),
      ],
      year: workYear,
      status: item.state,
      planned: toPlannedFigures(estimate),
      finishedOn: item.state === 'terminada' || item.state === 'facturada' ? lastDate : null,
    }
    workspace.budgets.push(budget)
    workspace.works.push(work)
    workspace.reports.push(...reports)
    if (item.state !== 'pendiente') {
      const assignment: Assignment = {
        id: `as-${pad(index + 1)}`,
        workId: id,
        crewId: item.crewId,
        start: item.start,
        end: addWorkingDays(item.start, Math.max(0, estimate.crewDays - 1)),
      }
      workspace.assignments.push(assignment)
    }
    if (item.invoice && work.finishedOn) {
      invoiceSeq += 1
      workspace.invoices.push(finalInvoice(work, item.invoice, invoiceSeq))
    }
  })

  addOpenBudgets(workspace, anchor)
  addTasksAndNotices(workspace, today)
  addExpenses(workspace, today)
  addProgressInvoice(workspace, anchor)
  workspace.invoices.sort((a, b) => b.date.localeCompare(a.date))
  workspace.budgets.sort((a, b) => b.date.localeCompare(a.date))
  addReportPhotos(workspace)
  workspace.activity = seedActivity(workspace, today)
  return workspace
}

function simulateReports(
  workId: string,
  item: SeedWork,
  estimate: Pick<Work['planned'], 'plants' | 'hectares' | 'workerDays'>,
  anchor: IsoDate,
  workspace: Workspace,
): DailyReport[] {
  const {
    plants: plannedPlants,
    hectares: plannedHectares,
    workerDays: plannedWorkerDays,
  } = estimate
  const crew = workspace.crews.find((entry) => entry.id === item.crewId)
  if (!crew || plannedWorkerDays <= 0) return []
  const perWorker = (plannedPlants / plannedWorkerDays) * item.yieldFactor
  const perWorkerHa = (plannedHectares / plannedWorkerDays) * item.yieldFactor
  const ongoing = item.state === 'en_curso'
  const reports: DailyReport[] = []
  let plants = 0
  let hectares = 0
  let date = isWorkingDay(item.start) ? item.start : nextWorkingDay(item.start)
  for (let day = 0; day < 60; day += 1, date = nextWorkingDay(date)) {
    if (ongoing && date >= anchor) break
    const done = plannedPlants > 0 ? plants >= plannedPlants : hectares >= plannedHectares
    if (done || (ongoing && plants >= plannedPlants * 0.85)) break
    const members = availableMembers(crew.id, date, workspace.people, workspace.absences)
    const seed = Number(workId.slice(2)) * 100 + day
    const rain = noise(seed + 7) > 0.82
    const factor = (1 + noise(seed) * 0.12) * (rain ? 0.45 : 1)
    let dayPlants = Math.round(perWorker * members.length * factor)
    let dayHectares = Math.round(perWorkerHa * members.length * factor * 100) / 100
    if (plannedPlants > 0) dayPlants = Math.min(dayPlants, plannedPlants - plants)
    else dayHectares = Math.min(dayHectares, Math.round((plannedHectares - hectares) * 100) / 100)
    plants += dayPlants
    hectares += dayHectares
    const incident: Incident = rain ? 'lluvia' : noise(seed + 3) > 0.93 ? 'terreno' : 'ninguna'
    reports.push({
      id: `r-${workId}-${pad(day + 1)}`,
      workId,
      crewId: crew.id,
      date,
      workerIds: members.map((member) => member.id),
      plants: dayPlants,
      hectares: dayHectares,
      incident,
      notes: rain ? 'Parada parcial por lluvia.' : '',
      authorId: crew.foremanId,
      photos: [],
    })
  }
  return reports
}

/** Illustration standing in for a phone photo: a hillside with rows of planted trees. */
function demoPhoto(label: string, hue: number): Attachment {
  const trees = Array.from({ length: 14 }, (_, index) => {
    const x = 30 + (index % 7) * 85 + (index > 6 ? 40 : 0)
    const y = index > 6 ? 250 : 200
    return `<path d="M${x} ${y - 28}l11 26h-22z" fill="hsl(${hue} 45% 28%)"/><rect x="${x - 1.5}" y="${y - 2}" width="3" height="8" fill="#6b4f2a"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="hsl(${hue} 55% 82%)"/><path d="M0 170Q180 110 340 160T640 140V360H0z" fill="hsl(${hue} 35% 55%)"/><path d="M0 240Q220 190 400 230T640 215V360H0z" fill="hsl(${hue} 40% 42%)"/>${trees}<text x="16" y="344" font-family="sans-serif" font-size="16" fill="#fff">${label}</text></svg>`
  return {
    name: `${label}.svg`,
    mime: 'image/svg+xml',
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  }
}

/** The foreman's latest reports of works in progress or finished carry an example photo. */
function addReportPhotos(workspace: Workspace) {
  workspace.works.forEach((work, index) => {
    if (work.status === 'pendiente' || work.status === 'planificada') return
    const own = workspace.reports.filter((report) => report.workId === work.id)
    const sorted = [...own].sort((a, b) => b.date.localeCompare(a.date))
    const photos = [demoPhoto('Frente de plantación', 135 + (index % 4) * 10)]
    if (sorted[0]) sorted[0].photos = photos
    if (sorted[3]) sorted[3].photos = [demoPhoto('Planta acopiada en pista', 95 + (index % 3) * 12)]
  })
}

function finalInvoice(work: Work, status: 'cobrada' | 'enviada', sequence: number): InvoiceDraft {
  const date = addWorkingDays(work.finishedOn ?? `${work.year}-12-01`, 3)
  return {
    id: `i-${pad(sequence)}`,
    reference: '',
    workId: work.id,
    clientId: work.clientId,
    kind: 'final',
    date,
    progressTo: 1,
    lines: [
      {
        description: `Liquidación final · ${work.title}`,
        quantity: 1,
        unit: 'ud',
        unitPrice: work.planned.price,
      },
    ],
    vatRate: DEFAULT_VAT_RATE,
    status,
    sentOn: date,
    paidOn: status === 'cobrada' ? addDays(date, 38) : null,
  }
}

function addProgressInvoice(workspace: Workspace, anchor: IsoDate) {
  const work = workspace.works.find((item) => item.title === 'Maderas del Norte · parcela 14')
  if (work) {
    const date = addWorkingDays(anchor, -3)
    const progressTo = 0.3
    workspace.invoices.push({
      id: 'i-avance-1',
      reference: '',
      workId: work.id,
      clientId: work.clientId,
      kind: 'avance',
      date,
      progressTo,
      lines: [
        {
          description: `Certificación de avance 0 % → 30 % · ${work.title}`,
          quantity: 1,
          unit: 'ud',
          unitPrice: Math.round(work.planned.price * progressTo),
        },
      ],
      vatRate: DEFAULT_VAT_RATE,
      status: 'enviada',
      sentOn: date,
      paidOn: null,
    })
  }
  const counters = new Map<number, number>()
  for (const invoice of [...workspace.invoices].sort((a, b) => a.date.localeCompare(b.date))) {
    const invoiceYear = yearOf(invoice.date)
    const next = (counters.get(invoiceYear) ?? 0) + 1
    counters.set(invoiceYear, next)
    invoice.reference = `BOR-${invoiceYear}-${String(next).padStart(3, '0')}`
  }
}

const taskTemplates: Record<string, string[]> = {
  'Maderas del Norte · parcela 14': [
    'Revisar marras de la franja alta antes de seguir',
    'Fotografiar el estado del perímetro vallado',
    'Avisar si falta protector en la parcela 14',
  ],
  'Castañar Finca Los Robles · ampliación': [
    'Marcar con estaca el borde de la zona nueva',
    'Confirmar con la propiedad el acceso por la pista',
  ],
  'Franja cortafuegos Costa Oeste · fase 2': [
    'Recoger la planta en el vivero el primer día',
    'Llevar herramienta de ahoyado',
    'Comprobar el estado del acceso tras la lluvia',
  ],
}

/** Checklists for the crews and the notices they would have received. */
function addTasksAndNotices(workspace: Workspace, today: IsoDate) {
  for (const [title, texts] of Object.entries(taskTemplates)) {
    const work = workspace.works.find((item) => item.title === title)
    if (!work) continue
    const crewId = workspace.assignments.find((item) => item.workId === work.id)?.crewId
    const members = workspace.people.filter((person) => person.crewId === crewId)
    const started = work.status === 'en_curso'
    texts.forEach((text, index) => {
      const done = started && index === 0
      workspace.tasks.push({
        id: `t-${work.id}-${index + 1}`,
        workId: work.id,
        text,
        createdOn: addDays(today, -3),
        doneBy: done ? (members.find((person) => person.role === 'capataz')?.id ?? null) : null,
        doneOn: done ? addDays(today, -1) : null,
      })
    })
    for (const member of members) {
      workspace.notifications.push({
        id: `n-${work.id}-${member.id}`,
        personId: member.id,
        kind: 'obra_asignada',
        title: `Nueva obra: ${work.title}`,
        body: `Tienes ${texts.length} tareas por completar.`,
        workId: work.id,
        createdOn: addDays(today, -3),
        read: started,
      })
    }
  }
  const request = workspace.absences.find((item) => item.status === 'solicitada')
  const admin = workspace.people.find((person) => person.role === 'admin')
  if (request && admin) {
    workspace.notifications.push({
      id: 'n-absence-1',
      personId: admin.id,
      kind: 'ausencia_solicitada',
      title: `${workspace.people.find((person) => person.id === request.personId)?.name} pide ${request.type}`,
      body: `Del ${request.start} al ${request.end}.`,
      workId: null,
      createdOn: addDays(today, -1),
      read: false,
    })
  }
}

const expenseTemplates: Pick<Expense, 'category' | 'description'>[] = [
  { category: 'combustible', description: 'Gasolina de la furgoneta' },
  { category: 'herramienta', description: 'Cadena y limas para la motosierra' },
  { category: 'comida', description: 'Comida de la cuadrilla' },
  { category: 'combustible', description: 'Gasóleo para el desbrozador' },
  { category: 'material', description: 'Protectores y tutores de reposición' },
  { category: 'peaje', description: 'Peaje de acceso a la finca' },
]

/** Receipts the foremen would have registered: old ones reviewed, the latest ones still pending. */
function addExpenses(workspace: Workspace, today: IsoDate) {
  const admin = workspace.people.find((person) => person.role === 'admin')
  for (const assignment of workspace.assignments) {
    const work = workspace.works.find((item) => item.id === assignment.workId)
    const crew = workspace.crews.find((item) => item.id === assignment.crewId)
    if (!work || !crew || work.status === 'pendiente' || work.status === 'planificada') continue
    const ongoing = work.status === 'en_curso'
    const last = ongoing ? addDays(today, -1) : (work.finishedOn ?? assignment.end)
    let date = isWorkingDay(assignment.start) ? assignment.start : nextWorkingDay(assignment.start)
    const seedBase = Number(work.id.slice(2)) * 31
    for (let index = 0; index < expenseTemplates.length; index += 1) {
      date = addWorkingDays(date, 2 + (index % 3))
      if (date > last) break
      const template = expenseTemplates[index]
      if (!template) break
      const cents = Math.round((28 + (noise(seedBase + index) + 1) * 40) * 100)
      const recent = ongoing && date >= addDays(today, -4)
      const own = noise(seedBase + index + 50) > 0.5
      const rejected = ongoing && index === 3 && work.id.endsWith('1')
      workspace.expenses.push({
        id: `e-${work.id}-${index + 1}`,
        date,
        workId: work.id,
        category: template.category,
        description: template.description,
        amount: template.category === 'herramienta' ? cents * 2 : cents,
        createdBy: crew.foremanId,
        paidWith: own ? 'propio' : 'empresa',
        status: rejected ? 'rechazado' : recent ? 'pendiente' : 'aprobado',
        reviewedBy: recent ? null : (admin?.id ?? null),
        reviewedOn: recent ? null : addDays(date, 2),
        rejectReason: rejected ? 'Falta el ticket: vuelve a registrarlo con la foto.' : '',
        receipt: null,
        invoice: null,
        invoiceNumber: '',
        reimbursedOn: !recent && own && !ongoing ? addDays(date, 9) : null,
      })
    }
  }
  const pending = workspace.expenses.filter((expense) => expense.status === 'pendiente')
  for (const expense of pending.slice(0, 1)) {
    if (!admin) break
    workspace.notifications.push({
      id: `n-${expense.id}`,
      personId: admin.id,
      kind: 'gasto_pendiente',
      title: `Gasto por revisar: ${expense.description}`,
      body: `${(expense.amount / 100).toFixed(2).replace('.', ',')} € · ${expense.date}.`,
      workId: expense.workId,
      createdOn: expense.date,
      read: false,
    })
  }
}

type OpenBudget = Pick<Budget, 'title' | 'clientId' | 'zoneId' | 'status' | 'lines' | 'notes'> & {
  daysAgo: number
}

function addOpenBudgets(workspace: Workspace, anchor: IsoDate) {
  const open: OpenBudget[] = [
    {
      title: 'Restauración post-incendio Sierra Este',
      clientId: 'c-diputacion',
      zoneId: 'z-este',
      status: 'enviado',
      daysAgo: 6,
      notes: 'Pendiente de resolución de la subvención.',
      lines: [
        planting('s-laricio', 25, 1500, 430),
        treatment('Desbroce y saca de restos', 25, 0.4),
      ],
    },
    {
      title: 'Bosquete de frondosas · Finca Los Robles',
      clientId: 'c-robles',
      zoneId: 'z-ribera',
      status: 'borrador',
      daysAgo: 1,
      notes: '',
      lines: [planting('s-roble', 3, 1100, 300), planting('s-castano', 2, 800, 260)],
    },
    {
      title: 'Plantación en vega · Maderas del Norte',
      clientId: 'c-maderas',
      zoneId: 'z-ribera',
      status: 'rechazado',
      daysAgo: 40,
      notes: 'El cliente lo ejecuta con medios propios.',
      lines: [planting('s-abedul', 9, 900, 350)],
    },
  ]
  open.forEach((item, index) => {
    const date = addDays(anchor, -item.daysAgo)
    const budgetYear = yearOf(date)
    const prefix = `P-${budgetYear}-`
    const count = workspace.budgets.filter((budget) => budget.number.startsWith(prefix)).length
    const id = `b-open-${index + 1}`
    workspace.budgets.push({
      id,
      number: `${prefix}${String(count + 1).padStart(3, '0')}`,
      title: item.title,
      clientId: item.clientId,
      zoneId: item.zoneId,
      date,
      status: item.status,
      lines: withLineIds(id, item.lines),
      params: defaultParams,
      notes: item.notes,
      workId: null,
    })
  })
}
