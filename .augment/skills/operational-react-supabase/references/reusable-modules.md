# Reutilizar sin duplicar ni prometer garantías inexistentes

Esta guía explica responsabilidades de la aplicación, no sustituye contratos de paquetes.
Primero leer README, exports y tipos de la **versión instalada**. Si no contiene una API
mencionada aquí, no inventar un import ni copiar su implementación: evaluar actualización
autorizada. Un cambio local del paquete no significa que exista en npm ni en todos los clientes.

## Qué va dónde

| Necesidad                                               | Lugar                                       | No hacer                                                  |
| ------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| Primitiva visual genérica/accesible                     | `@doscientos/ui`                            | Copiarla al cliente o introducir otro sistema de overlays |
| Composición propia de un producto                       | `shared/ui` tras dos usos, o UI de feature  | Crear un framework de componentes de negocio              |
| Cálculos y ciclo de vida de factura                     | `@doscientos/billing`                       | Fórmulas duplicadas en formularios, PDF y servidor        |
| Tablas, autorización, transacción, numeración y Storage | Adaptador de la app + base de datos         | Atribuir atomicidad o RLS al paquete puro                 |
| Protocolo de emisión fiscal                             | `@doscientos/verifactu` en servidor         | Importarlo desde UI o tratar cobro como emisión           |
| Reglas de estilo/tipos/estructura                       | `@doscientos/configs`                       | Desactivar controles para ocultar una incompatibilidad    |
| Instalación/offline                                     | `@doscientos/pwa` si hay alcance confirmado | Cachear sesiones o datos privados por defecto             |

## UI: trampas que deben comprobarse

- `AppShell`, navegación y permisos: la app compone; el paquete no decide rutas ni roles.
- Tokens y `.dark` en raíz para que overlays portaled hereden tema. Importar CSS una vez.
  Verificar teclado, foco, Escape, móvil y overlays anidados en navegador autorizado.
- Preservar las firmas `className(state)` en slots React Aria que las admiten; no pasar
  funciones a una utilidad que solo compone strings. Consultar tipos del componente concreto.
- `useAutosave`: instancia por entidad, datos inmutables y estado de error visible.
  Cambiar de documento remonta con `key`; no reutilizar la cola para otro ID.
  Serializar en una pestaña no resuelve conflictos entre usuarios: versionar en servidor.
  Desmontar o abortar HTTP no demuestra que el servidor no haya confirmado la escritura.
- Acciones async: evitar doble envío y resultados antiguos visibles tras un fallo.
  Un botón disabled no sustituye idempotencia. `reset` no debe fingir cancelación remota.
- ErrorBoundary de React: errores de render. Error de loader: router; error de evento o
  mutación: acción/Query y feedback de formulario. Un fallback vacío no es un reintento.
- Pagination: normalizar páginas ante filtros y datos vacíos, manteniendo URL/estado/aria
  coherentes. No atribuir al componente la normalización del backend.
- Añadir regresión al paquete y comprobar un consumidor afectado antes de publicar.

## Billing: recorrido de integración

1. UI recoge y valida entrada; dominio compartido calcula la previsualización.
2. Servidor verifica identidad, membresía, permisos, input y estado actual del recurso.
3. Adaptador aporta el repositorio autorizado y reloj; el paquete crea/actualiza/revalida.
4. Base de datos confirma el cambio atómico y rechaza versiones o estados incompatibles.
5. Trabajos externos consumen outbox/idempotencia sin repetir la operación de negocio.

Funciones de referencia: `calculateInvoiceLine`, `calculateInvoiceTotals`, `toMinorUnits`,
`formatMoney`, `createInvoiceDraft`, `updateInvoiceDraft`, `issueInvoice`,
`createBillingClient` y `calculatePaymentSummary`. Verificar exports antes de usarlas.

- Importes y redondeo siguen el contrato de billing; nunca `parseFloat(valor) * 100`
  ni `Math.round` independiente para reproducir fiscalidad. Confirmar unidades y divisa
  al mapear columnas SQL; no mezclar euros de almacenamiento con céntimos del dominio.
- Edición solo de borradores; recalcular y validar de nuevo al emitir. No aceptar totales,
  tenant, número ni estado fiscal procedentes del navegador como autoridad.
- El snapshot emitido no se edita. La app impone inmutabilidad persistida y el flujo de
  rectificación correcto; copiar un objeto no impide un UPDATE posterior en base de datos.
- `BillingRepository.updateDraft` debe detectar conflictos atómicamente. `issueDraft` carga
  el borrador actual y reserva número/persiste snapshot, ledger y outbox en una transacción.
  Tres llamadas separadas al SDK no equivalen a una transacción. No diseñar un RPC fiscal
  sin requisitos y revisión de permisos; nunca usar `max(numero) + 1` desde el cliente.
- PDF: renderer y Storage son adaptadores. `createDocument` reutiliza el documento existente;
  Storage debe guardar una sola versión canónica ante concurrencia. Firmar solo su ruta
  privada tras autorizar la factura; no una ruta arbitraria recibida por parámetro.
- El estado de cobro es una proyección distinta al estado de emisión. El ledger aporta
  cobros netos confirmados de la misma moneda; `asOf` es fecha de negocio explícita.

## Casos que bloquean una emisión real

No asumir soporte completo de IRPF, recargo de equivalencia, rectificativas, recurrencia,
conversión monetaria, numeración o fiscalidad por existir un paquete de billing.
Consultar sus límites actuales y los requisitos legales con responsable competente.
El tipo `credit_note` por sí solo no resuelve motivo, signo ni mapeo fiscal.

Pruebas obligatorias del adaptador cuando aplique: dos tenants; rol sin permiso; ID ajeno;
doble emisión simultánea; repetición tras timeout; fallo antes del commit; edición de emitida;
importes alterados; documento duplicado; firma de ruta ajena; proveedor externo caído.
Un test unitario del paquete no demuestra ninguno de los permisos de una aplicación real.

## Fuentes canónicas

- [UI](https://github.com/doscientos-es/ui#readme) y [Storybook](https://ui.doscientos.es)
- [Billing](https://github.com/doscientos-es/billing#readme)
- [VERI*FACTU](https://github.com/doscientos-es/verifactu/blob/main/docs/INTEGRATION.es.md)
- [Configs](https://github.com/doscientos-es/configs#readme)
- [PWA](https://github.com/doscientos-es/pwa#readme)

Si no hay acceso a una fuente, usar la documentación/tipos de la versión local y registrar
la limitación. No publicar, instalar ni emitir para intentar resolver una falta de información.
