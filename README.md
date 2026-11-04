# Riera Racing · demo de gestión de taller

Prototipo comercial con datos ficticios. No usa servidor ni cuentas: los cambios se
guardan únicamente en `localStorage` del navegador, bajo una clave propia. No introducir
datos reales ni usarlo para gestionar el taller de producción.

## Recorrido de demostración

1. En **Proyectos**, abrir un vehículo o crear uno y añadir o editar partidas del presupuesto.
2. Aprobar el presupuesto, asignar tareas y registrar en **Partes de taller** horas, gastos y piezas.
3. En **Inventario**, revisar existencias y ubicación. En **Compras**, recibir un pedido y confirmar cualquier diferencia; la recepción aumenta el stock una sola vez.
4. Volver al proyecto para consultar los costes registrados y crear un borrador en **Facturación**.
5. Consultar **Equipo** para vacaciones y **Asistente IA** para ver los ejemplos simulados de voz y documentos.

## Límites

- El asistente muestra respuestas fijas: no graba voz ni lee, guarda o sube el PDF.
- Los presupuestos no se envían; la aprobación es local. Los borradores no son facturas fiscales y el cobro es simulado. El CSV es de ejemplo, no un formato validado por la asesoría.
- No hay autenticación, permisos, datos compartidos, copias de seguridad, e-commerce, integraciones ni fichaje de jornada. Los pedidos no se envían al proveedor; solo admiten una pieza y una recepción cerrada.
- El inventario no implementa reservas y los presupuestos no generan consumos automáticamente. El coste refleja únicamente los partes registrados, no un margen contable.
- La copia conserva código y documentación forestal heredados que no participan en la demo de Riera Racing. No son funcionalidades del taller.

## Desarrollo

Requiere Node.js 22.18+ y pnpm. Instalar con `pnpm install --frozen-lockfile` y arrancar con `pnpm dev`.

El punto de entrada es `src/main.tsx`; el dominio, datos ficticios y pantallas están en
`src/features/racing`. La opción **Restablecer datos de ejemplo** elimina únicamente
la clave de esta demo del navegador, previa confirmación.

Ejecutar `pnpm quality` para formato, lint, estructura, tipos y pruebas; `pnpm build`
genera la aplicación. El paso a producción requiere un diseño y validación propios:
el documento forestal heredado no describe este dominio.
