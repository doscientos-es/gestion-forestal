import type { Client, Crew, Person, Species, Zone } from '../application/model'

// Synthetic catalogue. Names, tax IDs and emails are fictitious.

export const seedClients: Client[] = [
  {
    id: 'c-valdemonte',
    name: 'Ayuntamiento de Valdemonte',
    kind: 'ayuntamiento',
    taxId: 'P0000001A',
    town: 'Valdemonte',
  },
  {
    id: 'c-diputacion',
    name: 'Diputación · Servicio de Montes',
    kind: 'diputacion',
    taxId: 'S0000002B',
    town: 'Capital',
  },
  {
    id: 'c-sanlorenzo',
    name: 'Comunidad de Montes San Lorenzo',
    kind: 'comunidad',
    taxId: 'G0000003C',
    town: 'San Lorenzo',
  },
  {
    id: 'c-maderas',
    name: 'Maderas del Norte S.L.',
    kind: 'empresa',
    taxId: 'B0000004D',
    town: 'Puerto Alto',
  },
  {
    id: 'c-robles',
    name: 'Finca Los Robles',
    kind: 'particular',
    taxId: '00000005E',
    town: 'Ribera Baja',
  },
  {
    id: 'c-asociacion',
    name: 'Asociación Forestal Comarcal',
    kind: 'comunidad',
    taxId: 'G0000006F',
    town: 'Monte Alto',
  },
  {
    id: 'c-ribera',
    name: 'Ayuntamiento de Ribera Baja',
    kind: 'ayuntamiento',
    taxId: 'P0000007G',
    town: 'Ribera Baja',
  },
  {
    id: 'c-cooperativa',
    name: 'Cooperativa Silvícola del Valle',
    kind: 'empresa',
    taxId: 'F0000008H',
    town: 'Valle Alto',
  },
  {
    id: 'c-aguas',
    name: 'Consorcio de Aguas del Norte',
    kind: 'diputacion',
    taxId: 'Q0000009I',
    town: 'Capital',
  },
  {
    id: 'c-pinares',
    name: 'Pinares del Cantábrico S.A.',
    kind: 'empresa',
    taxId: 'A0000010J',
    town: 'Puerto Alto',
  },
]

export const seedZones: Zone[] = [
  { id: 'z-norte', name: 'Valle Norte' },
  { id: 'z-este', name: 'Sierra Este' },
  { id: 'z-ribera', name: 'Ribera Sur' },
  { id: 'z-alto', name: 'Monte Alto' },
  { id: 'z-costa', name: 'Costa Oeste' },
]

export const seedSpecies: Species[] = [
  { id: 's-radiata', name: 'Pino radiata', kind: 'conifera', unitCost: 42 },
  { id: 's-laricio', name: 'Pino laricio', kind: 'conifera', unitCost: 48 },
  { id: 's-roble', name: 'Roble pedunculado', kind: 'frondosa', unitCost: 115 },
  { id: 's-haya', name: 'Haya', kind: 'frondosa', unitCost: 130 },
  { id: 's-castano', name: 'Castaño', kind: 'frondosa', unitCost: 175 },
  { id: 's-abedul', name: 'Abedul', kind: 'frondosa', unitCost: 95 },
]

export const seedCrews: Crew[] = [
  { id: 'cr-norte', name: 'Cuadrilla Norte', foremanId: 'p-iker', tone: 'green' },
  { id: 'cr-sur', name: 'Cuadrilla Sur', foremanId: 'p-javier', tone: 'blue' },
  { id: 'cr-monte', name: 'Cuadrilla Monte', foremanId: 'p-marta', tone: 'amber' },
]

const FOREMAN_COST = 19_000
const WORKER_COST = 15_500

function person(
  id: string,
  name: string,
  role: Person['role'],
  crewId: string | null,
  title: string,
): Person {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
  const handle = name.split(' ')[0]?.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  return {
    id,
    name,
    initials,
    role,
    title,
    email: `${handle}@demo.example`,
    crewId,
    dailyCost: role === 'capataz' ? FOREMAN_COST : role === 'peon' ? WORKER_COST : 0,
  }
}

export const seedPeople: Person[] = [
  person('p-nerea', 'Nerea Lasa', 'admin', null, 'Administración'),
  person('p-iker', 'Iker Arana', 'capataz', 'cr-norte', 'Capataz · Cuadrilla Norte'),
  person('p-unai', 'Unai Goñi', 'peon', 'cr-norte', 'Peón forestal'),
  person('p-ane', 'Ane Mendia', 'peon', 'cr-norte', 'Peón forestal'),
  person('p-pablo', 'Pablo Ruiz', 'peon', 'cr-norte', 'Peón forestal'),
  person('p-jon', 'Jon Ortiz', 'peon', 'cr-norte', 'Peón forestal'),
  person('p-javier', 'Javier Sola', 'capataz', 'cr-sur', 'Capataz · Cuadrilla Sur'),
  person('p-mikel', 'Mikel Sanz', 'peon', 'cr-sur', 'Peón forestal'),
  person('p-laura', 'Laura Vidal', 'peon', 'cr-sur', 'Peón forestal'),
  person('p-sergio', 'Sergio Gil', 'peon', 'cr-sur', 'Peón forestal'),
  person('p-asier', 'Asier León', 'peon', 'cr-sur', 'Peón forestal'),
  person('p-marta', 'Marta Ibáñez', 'capataz', 'cr-monte', 'Capataz · Cuadrilla Monte'),
  person('p-inigo', 'Iñigo Mora', 'peon', 'cr-monte', 'Peón forestal'),
  person('p-david', 'David Cano', 'peon', 'cr-monte', 'Peón forestal'),
  person('p-raul', 'Raúl Peña', 'peon', 'cr-monte', 'Peón forestal'),
  person('p-oier', 'Oier Bravo', 'peon', 'cr-monte', 'Peón forestal'),
]
