---
name: operational-react-supabase
description: 'Guía operativa Doscientos para CRM, billing, portales y demos: decidir Vite/Router frente a piloto TanStack Start/Node, implementar loaders/Query/server functions/Supabase/RLS, reutilizar UI/billing y entregar con pruebas. Leer antes de crear estructura, rutas, datos o dependencias.'
---

# Aplicaciones operativas React + Supabase

## Cuándo aplicar esta skill

Úsala para un CRM, ERP ligero, portal de cliente, gestión operativa, facturación o demo con usuarios autenticados y Supabase. No la uses para una landing SEO: usa Astro. No migres un proyecto existente desde Next, React Router u otro stack salvo una decisión explícita.

## Lectura obligatoria según tarea

1. Inicio o cambio de arquitectura: [decisión de stack](./references/stack-decision.md).
2. Nueva fase/entrega: [pipeline con puertas de salida](./references/delivery-pipeline.md).
3. Rutas, datos, auth o servidor: [recetas de implementación](./references/implementation-patterns.md).
4. UI, billing o integraciones: [reutilización y límites](./references/reusable-modules.md).
5. Scripts, hooks o CI: [contrato quality y pre-commit](./references/quality-gates.md).

6. Diseño de pantallas, estados y feedback: skill `product-ui-design`.

Las referencias viven dentro de esta skill para viajar con `--copy`. Léelas antes de
implementar el área afectada. Son la fuente canónica; los documentos de `docs/` solo enlazan.

## Decisión de arquitectura

Base común: **React + TypeScript + TanStack Router + TanStack Query + Tailwind v4 +
`@doscientos/ui` + Supabase**. Elegir por operaciones, no solo por SEO:

- Servidor integrado necesario: recomendar **TanStack Start sobre Node**, como piloto
  aprobado y validado antes de estandarizar. No se ha incorporado al generador.
- SPA con backend resuelto por Supabase: **Vite/Router**, base que sí genera la CLI actual.
- Conservar Next u otro stack existente salvo migración expresamente aprobada.
- TanStack Router posee rutas y search params tipados.
- TanStack Query posee datos remotos, caché e invalidación.
- Supabase posee auth, PostgreSQL, Storage y RLS. Operaciones privadas en un runtime
  compatible; no imponer Edge al transporte fiscal Node/mTLS/dependencias nativas.
- `@doscientos/ui` posee primitives accesibles; no copies sus componentes ni mezcles otro sistema de overlays.
- Hosting estático solo para SPA; Start con server functions necesita runtime servidor.
  Confirmar proveedor/cuenta y obtener autorización antes de desplegar.

Lee también `technical-details` y `doscientos-ecosystem`. Antes de instalar paquetes, confirma que no hay un stack o plantilla aprobada ya en el repositorio.

Esta skill también publica el generador
[`@doscientos/create-operational-app`](./README.md). Para un repositorio nuevo,
Vite/Router usa `pnpm dlx @doscientos/create-operational-app <directorio> --title "<título>"`.
La plantilla única vive en [`starter`](./starter/README.md): demuestra el primer
vertical con fixtures, rutas y pruebas. Sustituye su dominio sólo después de
confirmar el alcance y nunca ejecutes la CLI sobre una aplicación existente.
No existe flag Start. Los fixtures no implementan login ni prueban RLS. El starter
necesita pasar su propio quality/build antes de adoptarse; tests de copia no lo certifican.

## Límites de seguridad obligatorios

1. Activa RLS en toda tabla expuesta y escribe políticas mínimas por operación y rol.
2. El navegador solo puede recibir URL Supabase y clave publishable/anon mediante configuración pública del framework. Nunca service role, certificados, claves de proveedores ni secretos de firma.
3. Cada endpoint/server function privado valida input, identidad, organización/tenant y permiso, también en lecturas. Un `beforeLoad` o botón oculto no autoriza llamadas directas.
4. Emisión de facturas, numeración, VERI*FACTU, webhooks, pagos, email y WhatsApp son server-side. Evalúa `@doscientos/billing` y `@doscientos/verifactu` con `doscientos-ecosystem`; no reimplementes reglas fiscales en React.
5. Usa migraciones pequeñas y versionadas. No ejecutes migraciones ni escribas datos reales sin autorización.

## Estructura inicial

Mantén capas explícitas y verticales. Adapta los nombres al dominio, pero no conviertas la aplicación en una carpeta global de `components` o `services`.

| Ubicación                          | Contenido                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `src/app`                          | Wiring, providers y shell; respetar entrypoints exigidos por el framework |
| `src/routes`                       | Definiciones finas de TanStack Router                                     |
| `src/features/<dominio>`           | `application`, `infrastructure`, `ui` y tests; `domain` si hace falta     |
| `src/shared/lib` y `src/shared/ui` | Utilidades transversales y composición del producto                       |
| Fixtures del vertical              | Escenarios sintéticos separados del adaptador de producción               |
| `supabase/migrations`              | Persistencia versionada; `functions` solo si se elige ese runtime         |

La [receta de archivos](./references/implementation-patterns.md) separa wrappers RPC
client-safe y módulos server-only. Ejecutar el checker real; no crear carpetas globales
que rechace ni desactivarlo. La incompatibilidad actual de `src/demos` está documentada allí.

- Los componentes de presentación reciben datos y callbacks; no hacen consultas directas.
- Cada feature exporta una API pequeña. No importes sus detalles internos desde otra feature.
- El cliente Supabase de navegador vive en `shared/lib`; la autorización no depende de ocultar botones.
- No edites `routeTree.gen.ts` a mano.
- No mezcles reexports de servidor y cliente en el `index.ts` público de una feature.

## Patrones de interfaz

Antes de crear un componente, consulta `@doscientos/ui` y Storybook.

- Shell: usa `AppShell` como foundation y conserva navegación, branding y permisos en la app.
- Listados: combina `PageHeader`, `FilterBar`, `SelectionToolbar`, tabla, paginación y `DataViewState`.
- Detalle: usa `DescriptionList`, secciones y `DetailDrawer` cuando una ficha rápida sea adecuada.
- Cada pantalla con datos define `loading`, `empty`, `error`, permisos y reintento.
- Añade un patrón compartido solo después de dos usos reales; colócalo en `shared/ui` primero, no en `@doscientos/ui` ni en un paquete nuevo.

## Datos, rutas y formularios

- Valida search params con TanStack Router. La URL contiene filtros, orden, página y vista enlazable; usa los codecs de `@doscientos/ui` si la app necesita normalizarlos.
- Loader y UI comparten queryOptions con keys aisladas por usuario/tenant y filtros. Invalidar recursos afectados tras mutar; no duplicar la caché de Query en un store.
- En SSR, QueryClient y cliente Supabase de sesión por request. Limpiar datos privados al cambiar identidad; no cachear respuestas autenticadas en CDN.
- Usa estado local para UI efímera. No dupliques respuestas de Query en stores globales.
- Para formularios complejos, valida en cliente y en servidor con esquemas compartidos o equivalentes. Muestra errores accesibles junto al campo; no aceptar totales/tenant/roles de UI como autoridad.

## Demos reproducibles

Toda demo debe poder mostrar los mismos escenarios sin depender de datos de producción:

- `default`: flujo representativo con datos sintéticos.
- `loading`: skeleton o estado de carga.
- `empty`: sin registros y CTA apropiada.
- `error`: mensaje recuperable, sin stack traces.
- `long-content`: nombres, descripciones y tablas extensas.

Usa las mismas fixtures para Storybook y tests cuando sea posible. Etiqueta claramente el modo demo y no dejes integraciones externas activas por defecto.

## Calidad mínima

El proyecto expone `dev`, `build`, `lint`, `format:check`, `typecheck`, `test` y `quality`
mediante pnpm. Usa `pnpm quality` como contrato completo de cierre y CI. El pre-commit
solo ejecuta `pnpm quality:quick` (formato y lint sin modificar archivos); no sustituye
tests ni build. Instalar hooks explícitamente por clon con `pnpm hooks:install`, sin
sobrescribir hooks existentes ni instalar herramientas nuevas por defecto.

El starter ya incluye el changelog automático desde Git: `@doscientos/changelog`,
scripts `changelog:sync`/`changelog:check`, hook `commit-msg` (Conventional Commits),
`CHANGELOG.md`, `public/changelog.json` y `fetch-depth: 0` en CI. No lo configures
a mano al generar una app; usa commits `feat:`/`fix:`/`perf:` y `pnpm changelog:sync`.

Documenta propósito, arranque, scripts, variables por nombre, arquitectura, modo demo,
modelo de despliegue y operaciones de servidor. Añade `.env.example` sin valores sensibles.
Mantén `docs/demo-to-production.md` y `docs/implementation-status.md` según el pipeline.
Un check pendiente/fallido no es aprobado. No publicar, desplegar ni tocar datos reales
por el mero hecho de seguir esta skill.
