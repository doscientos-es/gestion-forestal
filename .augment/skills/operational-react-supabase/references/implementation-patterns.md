# Recetas de implementación: Router / Start / Query / Supabase

Leer después de [elegir stack](./stack-decision.md). Son contratos para implementar,
no un starter Start ya compilado. Revisar exports, tipos y documentación de la versión
instalada antes de escribir imports; no resolver incompatibilidades con `any` o casts.

## 1. Un vertical, no un framework propio

Usar nombres del dominio acordado. Esta distribución es una receta, no archivos existentes:

| Archivo o carpeta                                               | Responsabilidad                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/routes/`                                                   | Params/search, contexto, loader, estados y composición de pantalla  |
| `src/app/`                                                      | Creación de router/QueryClient, providers, shell y wiring           |
| `features/invoices/application/invoice-schema.ts`               | Entrada validada y tipos client-safe                                |
| `features/invoices/application/invoice-queries.ts`              | Factories de keys/queryOptions; no secretos                         |
| `features/invoices/application/use-update-invoice.ts`           | Mutación y feedback/invalidation                                    |
| `features/invoices/application/invoice.functions.ts`            | Solo Start: wrappers RPC con `createServerFn`                       |
| `features/invoices/application/issue-invoice.server.ts`         | Caso de uso autorizado y coordinación server-only                   |
| `features/invoices/infrastructure/invoice-repository.server.ts` | Adaptador de persistencia server-only                               |
| `features/invoices/ui/`                                         | Pantalla/contenedores y componentes de presentación                 |
| `features/invoices/index.ts`                                    | API pública client-safe pequeña; no reexportar servidor             |
| `src/shared/lib/`                                               | Infraestructura transversal mínima: Supabase, auth, reloj si aplica |

Crear solo archivos necesarios, con pruebas colocadas junto a su responsabilidad.
El CRUD sencillo no requiere clases, contenedor DI ni repositorio genérico. Extraer puertos
cuando exista una frontera real (persistencia, PDF, proveedor o test), no por cada función.
Reglas puras del negocio fuera de React; si crecen, usar `domain/` dentro del vertical.
No promover reglas específicas del cliente a UI/billing sin un contrato reutilizable.

Conservar los entrypoints que exige la versión de Start (`router`, `start`, cliente/servidor)
y ajustar el checker mediante una excepción concreta y probada si hace falta, no desactivarlo.
`src/demos` está admitido para fixtures deterministas. El checker inspeccionado todavía
no admite sufijos `.server.ts`/`.functions.ts`: los nombres
de la tabla son la convención propuesta para Start, pendiente de soporte y regresiones en
`@doscientos/configs`. No renombrarlos a archivos client-safe para ocultar el fallo.
Ubicar nuevas fixtures junto al vertical cuando el perfil aprobado lo permita.

## 2. Ruta → Query → datos

1. Validar params y search; definir defaults y límites para página, tamaño y orden.
   URL para filtros/orden/vista enlazable; estado local para menú abierto o texto aún no aplicado.
2. `loaderDeps` devuelve solo los search params que cambian los datos. El loader obtiene
   además params/contexto; no leer filtros arbitrarios de `window.location`.
3. Una factory `queryOptions` define key y queryFn. Key incluye recurso, usuario/tenant
   cuando afecta al resultado, filtros normalizados, orden y página. Nunca tokens ni secretos.
4. El loader usa esas opciones con `context.queryClient.ensureQueryData`; el contenedor
   consume las mismas opciones mediante `useQuery` o `useSuspenseQuery`. UI recibe props.
5. Definir frescura explícita: `ensureQueryData` puede devolver caché existente obsoleta.
   Para esperar datos frescos, evaluar `fetchQuery`; para revalidar en segundo plano,
   comprobar `revalidateIfStale`. No asumir que navegar vuelve a consultar siempre.
6. Coordinar precarga del Router con Query (evaluar `defaultPreloadStaleTime: 0` cuando
   Query decide frescura). No duplicar respuestas en loaderData + store + estado local.
7. Propagar `AbortSignal` donde el transporte lo soporte; limitar/paginar en backend y
   usar orden estable. No descargar la tabla completa para filtrar desde el navegador.

Lectura simple: Supabase con identidad del usuario y RLS, desde infraestructura.
Lectura privada con integración/secretos: server function de Start o backend aprobado.
No crear un proxy servidor para cada SELECT si no añade una responsabilidad necesaria.

## 3. Caché y SSR sin fugas

- En servidor, crear QueryClient y cliente Supabase con sesión **por petición**; no un
  singleton con estado de usuario. Un pool de conexiones no equivale a una sesión global.
- Usar el mismo QueryClient en contexto del Router y provider React. En navegador mantener
  una instancia estable, no reconstruirla en cada render.
- Si hay SSR, configurar hidratación con la integración oficial de la versión elegida;
  no mezclar dos mecanismos. Serializar solo DTOs que ese usuario puede recibir, no
  sesiones completas, clientes de base de datos ni resultados internos.
- Respuestas privadas: sin caché pública/CDN; preferir `Cache-Control: no-store` para
  datos sensibles. Comprobar también HTML y respuestas que renuevan cookies.
- Logout/cambio de tenant: bloquear UI anterior, cancelar lecturas, retirar caché privada,
  actualizar contexto y recargar rutas pertinentes. Evitar que una petición antigua
  repueble la caché. Aislar también caché persistida/PWA si existe; no solo Query en memoria.

## 4. Server functions: frontera de seguridad

Un loader puede ejecutarse en navegador. Un `beforeLoad` mejora navegación, pero no protege
endpoints. **Cada lectura y escritura privada debe autorizarse al invocarla directamente.**

Orden de una operación sensible:

1. Método correcto: GET sin efectos de negocio; POST para mutaciones. No emitir desde
   loader, render ni efecto: precargas/reintentos pueden ejecutarlos varias veces.
2. Input validado en runtime; allowlist de campos, tamaños y rangos. Un tipo TypeScript
   o `(data) => data` no valida nada. La documentación consultada muestra `.validator`;
   otras versiones usan `.inputValidator`: comprobar la firma instalada, no mezclarlas.
3. Verificar identidad desde el request con el SDK de auth; no confiar en `userId`, rol,
   cookies decodificadas sin verificar ni contexto suministrado por el navegador.
4. Resolver membresía y permiso sobre tenant/recurso actuales. Un tenant seleccionado
   por la UI es un selector que debe autorizarse, nunca prueba de pertenencia.
5. Ejecutar caso de uso con repositorio acotado. Validar estado/versión bajo transacción
   cuando exista concurrencia; no hacer SELECT + UPDATE incondicional.
6. Devolver DTO mínimo o errores públicos tipados (validación, no autorizado, conflicto).
   No enviar errores SQL, stacks ni mensajes crudos de proveedores. Logs con identificador
   de operación, sin cuerpos privados, cookies, tokens o certificados.

Middleware puede compartir autenticación, pero el caso de uso comprueba permisos específicos.
Importar estáticamente wrappers `.functions.ts`; el compilador crea stubs RPC. Mantener
adaptadores y fiscalidad en `.server.ts` con protección de imports soportada por Start.
El sufijo no sustituye comprobar el bundle cliente ni autoriza reexports desde un barrel común.
No usar import dinámico de wrappers como parche del bundler.

Verificar CSRF/origen para mutaciones con cookies. La documentación consultada requiere
añadir `createCsrfMiddleware` explícitamente si se personaliza `src/start.ts`; confirmar
el comportamiento de la versión usada. No desactivar checks de origen para arreglar hosting.
Server routes para webhooks/APIs externas, con autenticación/firma propias e idempotencia;
no exponer una server function como API pública estable.

## 5. Supabase y RLS

- Separar navegador y servidor; cliente SSR ligado al request y propagación de cookies
  renovadas según SDK oficial. `getSession` por sí solo no prueba una identidad fiable.
  Elegir verificación de claims/usuario y comprobar revocación/expiración según requisitos.
- Operaciones ordinarias con JWT del usuario para que RLS actúe. Service role omite RLS:
  solo tareas privilegiadas justificadas, server-only y con autorización explícita.
- Políticas por SELECT/INSERT/UPDATE/DELETE; comprobar tanto filas visibles como nuevas
  filas/valores mediante `USING`/`WITH CHECK` según operación. Probar tenant falsificado.
- Storage privado y policies; descargas autorizadas con ruta canónica. Revisar grants de
  funciones SQL. `SECURITY DEFINER` requiere justificar permisos y fijar search_path seguro.
- Migraciones versionadas y constraints; DTOs del dominio separados de filas SQL.
  Un repositorio mock no prueba políticas, constraints ni transacciones de Postgres.

## 6. Mutación y errores recuperables

- Una mutación usa la API validada; mantiene pendiente/error y no borra el formulario al
  fallar. Campos deshabilitados no son autorización ni protección contra duplicados.
- Tras éxito, actualizar detalle con respuesta canónica o invalidarlo; invalidar listas,
  contadores y resúmenes afectados dentro del mismo tenant. Esperar invalidaciones críticas.
  `router.invalidate()` no reemplaza invalidar Query; usarlo si cambió contexto/loader.
- Optimismo solo en cambios reversibles con cancelación/snapshot/rollback correctos.
  Emisión fiscal, numeración y cobros esperan confirmación del servidor e idempotencia.
- `pendingComponent` para carga inicial de ruta; `errorComponent` para loader/render;
  `notFoundComponent` para recurso ausente según política de visibilidad. Diferenciar
  vacío real, filtros sin resultados y denegación de permiso.
- Reintento con Query/Suspense: restablecer su error boundary y recargar loader/ruta
  según integración oficial. Probar fallo → reintento → éxito, también salir y volver.
  Error de evento/promesa no lo captura automáticamente un ErrorBoundary de React.

## 7. Pruebas mínimas del vertical

Search inválido/defaults; keys aisladas por identidad; loader y UI comparten opciones;
mutación invalida solo recursos pertinentes; error y reintento; inputs manipulados;
endpoint directo anónimo/tenant ajeno; logout y respuesta tardía; ruta profunda/refresh.
Añadir integración de RLS y concurrencia en base de datos de prueba cuando hay persistencia.
Para facturas seguir además [reutilización y adaptadores](./reusable-modules.md).

Fuentes: [carga externa y errores](https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading),
[server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions),
[import protection](https://tanstack.com/start/latest/docs/framework/react/guide/import-protection),
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
