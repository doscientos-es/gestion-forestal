# Rodal · gestión forestal

Demo de una aplicación de gestión para una empresa forestal que planta árboles y arbustos por zonas con cuadrillas de unos cinco trabajadores. Centraliza presupuestos, obras, planificación, partes diarios, vacaciones y borradores de factura, y compara cada obra y cada campaña con lo presupuestado.

**Es una demo con datos ficticios.** No hay servidor, cuentas ni integraciones: todo se guarda en el navegador (`localStorage`).

## Qué se puede probar

Al entrar se elige un usuario de ejemplo; cada rol ve algo distinto.

| Rol            | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administración | Crea o importa (CSV) presupuestos con peonadas, coste y precio calculados al escribir; los envía al cliente (correo simulado con enlace) y ve cuántas veces los abre; los acepta (nace la obra); asigna cuadrillas avisando de vacaciones; aprueba ausencias; genera borradores de factura, los revisa con vista de factura y los envía a la gestoría en CSV; consulta la actividad y los informes por campaña. |
| Capataz        | Rellena el parte diario de su cuadrilla desde el móvil: quién ha trabajado, plantas, hectáreas e incidencias.                                                                                                                                                                                                                                                                                                   |
| Peón           | Ve sus próximos días y pide vacaciones.                                                                                                                                                                                                                                                                                                                                                                         |

El cálculo del presupuesto es: `plantas = hectáreas × densidad`, `peonadas = plantas ÷ rendimiento`, jornadas de cuadrilla completas, precio = coste ÷ (1 − margen). Cada obra aceptada conserva esas cifras para compararlas con los partes reales.

## Arranque

Requiere Node.js 22.18+ y pnpm.

```sh
pnpm install
pnpm dev
```

`Restablecer datos de ejemplo` (menú lateral) vuelve al escenario inicial. Los datos de ejemplo se generan en `src/features/workspace/infrastructure/` de forma determinista a partir de la fecha actual.

## Calidad

```sh
pnpm quality   # formato, lint, estructura, tipos y tests
pnpm build
```

## Arquitectura

Vite + React + TanStack Router y Query + Tailwind v4 + `@doscientos/ui`; gráficos con Recharts.

```
src/
  app/                 shell, navegación y guardas de ruta
  routes/              rutas finas de TanStack Router
  shared/
    data/              puerto Repository<T> y adaptador localStorage
    lib/               fechas, formato, reloj, errores, useCommand
    ui/                composición común (paneles, filtros, formularios, gráficos)
  features/
    workspace/         núcleo: modelo, reglas puras, puertos y backend local
    budgets/ works/ planning/ daily-report/ absences/ invoices/ activity/ reports/ home/ session/
      api.ts           operaciones reales (async) sobre los repositorios
      application/     lógica de pantalla sin React Query ni UI
      ui/              componentes
```

- La **UI** nunca toca el almacenamiento: llama a `api.ts` mediante `useCommand` y lee con las consultas del núcleo.
- Cada `api.ts` se construye con `createXApi(deps)`; los tests inyectan repositorios en memoria.
- Para pasar a Supabase se implementa un `Backend` (repositorios + sesión) y se cambia solo `workspace/infrastructure/backend.ts`. Ver `docs/demo-to-production.md`.

## Límites

Sin login real, sin facturación fiscal (los borradores no son facturas). Los correos no salen: el envío solo queda anotado en el historial (`activity`), y el enlace de la propuesta (`/propuesta/:id`) solo funciona en el mismo navegador. La importación CSV usa una plantilla propia, no el formato del programa de presupuestos del cliente. El selector de usuario no es seguridad.
