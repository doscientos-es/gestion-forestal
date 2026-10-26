# Elegir stack sin improvisar

Estado revisado: 2026-09-06. Esta guía orienta decisiones; no autoriza migraciones,
instalaciones, proveedores ni despliegues. No convierte una propuesta en código probado.

## Decisión en orden

| Si se cumple                                                                              | Decisión                                                        | Condición para avanzar                                            |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Existe una app para la misma iniciativa                                                   | Conservar su stack y contratos                                  | Migrar solo con aprobación y beneficio verificable                |
| Predomina contenido público, landing o blog                                               | Astro                                                           | Confirmar requisitos de contenido/interactividad                  |
| App nueva con servidor integrado necesario para facturación, PDF o integraciones privadas | Recomendar TanStack Start + React + Query + Supabase sobre Node | Aprobar y validar piloto antes de estandarizar                    |
| SPA cuyo backend ya está resuelto por Supabase                                            | Vite + React + TanStack Router + Query + Supabase               | Verificar que las operaciones privadas tienen un runtime adecuado |
| Next existente o requisito específico que lo justifica                                    | Mantener/evaluar Next                                           | No asumir que no tener SEO obliga a migrar                        |

No elijas por el nombre del cliente. Enumera operaciones concretas y quién las ejecuta.
Tener una factura en pantalla no obliga a añadir Start si ya existe un backend válido.

## Diferencias que el agente debe entender

- Vite es una herramienta de desarrollo/build. Router ya proporciona rutas anidadas,
  search params tipados, loaders, precarga y estados pending/error/not-found.
- Start utiliza Router y añade server functions, server routes, middleware y build
  cliente/servidor. No requiere adoptar React Server Components para este patrón.
- No necesitar SEO no elimina las operaciones de servidor. Tampoco obliga a SSR completo.
- SPA mode/SSR selectivo no eliminan el servidor que ejecuta server functions.
  Una ruta raíz prerenderizada no debe incorporar sesión ni datos privados en build.
- Supabase sigue aportando Postgres, Auth, Storage y RLS; no crear un backend paralelo
  para duplicar cada lectura ni repartir el mismo caso de uso entre tres runtimes.

## Estado implementado frente a propuesta

**Implementado en este repositorio:** el generador `@doscientos/create-operational-app`
usa un único starter Vite/Router. Sus opciones incluyen `--name`, `--title`, `--dry-run`
y `--install`. **No existe un modo Start en el generador actual.** Consultar su `--help`
antes de documentar opciones; nunca inventar `--stack start`.

**Propuesto:** piloto Start/Node para aplicaciones con servidor integrado. Escribir
estas guías no significa que el piloto exista, que compile o que su seguridad esté validada.
No sustituir el starter ni migrar clientes para materializar una recomendación sin permiso.

Al revisar las fuentes el 2026-09-06 se observó la etiqueta Release Candidate de Start.
Es un dato histórico, no un estado permanente: comprobar versión, changelog y documentación
oficial al adoptar. Context7 y recuerdos de sesiones pueden estar desactualizados.
Conservar versiones/lockfile existentes; cualquier alta o cambio de versión requiere aprobación.

## Runtime, hosting y fiscalidad

- SPA: hosting estático aprobado; comprobar fallback de rutas profundas. Cloudflare Pages
  es una opción, no una cuenta ni un despliegue autorizados por esta guía.
- Start: proveedor con runtime Node compatible y soporte del artefacto servidor generado.
  No publicar solo los assets estáticos si se necesitan server functions.
- El transporte actual de `@doscientos/verifactu` usa HTTPS con PFX/mTLS y dependencias
  nativas como libxmljs2. No asumir que Workers/Edge o compatibilidad parcial Node bastan.
- Confirmar versión Node, arquitectura, módulos nativos, acceso al certificado y límites
  de duración en el runtime real de prueba. No emitir facturas reales para un smoke test.
- Trabajos largos o con reintentos van a un worker/outbox si el flujo lo requiere;
  no introducir colas/proveedores sin necesidad ni intentar mantenerlos en memoria del request.

## Puerta de adopción de Start

Antes de convertirlo en plantilla o recomendarlo como base comprobada, adjuntar evidencia de:

1. Generación/instalación limpia, tipos, lint, tests y build del artefacto Node elegido.
2. Login/logout/expiración y refresh de sesión, sin caché compartida entre usuarios.
3. Autorización directa de endpoints; negar acceso entre dos tenants y usuario anónimo.
4. Listado con URL, loader, pending/error, reintento y mutación con invalidación correcta.
5. Borrador/emisión con dos intentos concurrentes e idempotencia, sin números duplicados.
6. PDF privado reutilizable; descargas cruzadas denegadas; código fiscal fuera del cliente.
7. Integración fiscal en mock/test y compatibilidad del runtime, si está en alcance.

Un punto fuera de alcance se marca como tal con motivo. Un punto sin ejecutar es pendiente,
no aprobado. Seguir el [pipeline](./delivery-pipeline.md) y las [recetas](./implementation-patterns.md).

## Fuentes para comprobar al adoptar

- [Overview](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [SSR selectivo](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)
- [SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [Hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [Generador existente](../README.md)
- [Guía fiscal](https://github.com/doscientos-es/verifactu/blob/main/docs/INTEGRATION.es.md)
