# De demo a producción

## Qué se conserva

Dominio puro (`features/workspace/application`), pantallas, rutas, contratos `Repository<T>` y `api.ts`, y los tests. Cambian los adaptadores.

## Matriz pantalla / acción

| Pantalla / acción        | api.ts                         | Persistencia demo        | Producción                               | Permiso (RLS)           | Prueba              | Estado |
| ------------------------ | ------------------------------ | ------------------------ | ---------------------------------------- | ----------------------- | ------------------- | ------ |
| Entrar                   | `workspaceApi.signIn`          | selector, `localStorage` | Supabase Auth                            | sesión → rol            | `api.test.ts`       | Mock   |
| Crear/editar presupuesto | `budgetsApi.save`              | colección `budgets`      | tabla `budgets` + líneas                 | admin                   | cálculo y api       | Demo   |
| Aceptar presupuesto      | `budgetsApi.accept`            | `budgets` + `works`      | RPC transaccional                        | admin                   | `api.test.ts`       | Demo   |
| Asignar cuadrilla        | `planningApi.assign`           | `assignments`            | tabla `assignments`                      | admin                   | `work-flow.test.ts` | Demo   |
| Parte diario             | `dailyReportApi.submit`        | `reports`                | tabla `reports`                          | capataz de su cuadrilla | `work-flow.test.ts` | Demo   |
| Ausencias                | `absencesApi.request/decide`   | `absences`               | tabla `absences`                         | propio / admin          | —                   | Demo   |
| Borrador de factura      | `worksApi.createInvoiceDraft`  | `invoices`               | tabla `invoice_drafts`                   | admin                   | `work-flow.test.ts` | Demo   |
| Enviar a gestoría        | `invoicesApi.sendToAccounting` | CSV descargado           | correo o portal de la gestoría           | admin                   | `api.test.ts`       | Mock   |
| Enviar propuesta         | `budgetsApi.sendEmail`         | evento en `activity`     | servidor de correo (Resend, SMTP)        | admin                   | `api.test.ts`       | Mock   |
| Enlace público propuesta | `budgetsApi.recordView`        | evento en `activity`     | ruta pública con token firmado           | anónimo, solo lectura   | `work-flow.test.ts` | Mock   |
| Importar presupuestos    | `budgetsApi.importCsv`         | colección `budgets`      | RPC transaccional                        | admin                   | `work-flow.test.ts` | Demo   |
| Copia de factura         | `invoicesApi.sendEmail`        | evento en `activity`     | servidor de correo                       | admin                   | `work-flow.test.ts` | Mock   |
| Actividad                | lectura de `activity`          | colección `activity`     | tabla `activity_events` (solo inserción) | admin                   | `work-flow.test.ts` | Demo   |
| Informes                 | cálculo en cliente             | lectura de todo          | vistas SQL                               | admin                   | `work-flow.test.ts` | Demo   |

## Pasos

1. Validar con el cliente las preguntas abiertas de `DEMO_BRIEF.md`.
2. Modelar tablas y políticas RLS; migraciones pequeñas y versionadas.
3. Implementar un `Backend` de Supabase (repositorios, sesión) y sustituir `infrastructure/backend.ts`. Quitar el selector de usuarios y el seed.
4. Mover a transacción en servidor la aceptación de presupuestos y la numeración de facturas.
5. Facturación fiscal: decidir sistema (TicketBAI, VERI*FACTU u otro) con la gestoría antes de emitir; la demo solo genera borradores.
6. Importador del programa de presupuestos cuando se conozca su formato (hoy hay una plantilla CSV propia).
7. Correo real: enviar desde servidor (nunca desde el navegador), con enlace de propuesta firmado y de un solo uso por destinatario; las aperturas se registran en servidor y no se pueden falsear desde el cliente.

## Estado del pipeline

Demo ejecutable sin red. Sin login real, sin RLS probada, sin servidor.
