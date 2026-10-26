---
name: technical-details
description: 'Protocolo técnico Doscientos: alcance, selección Astro/TanStack Router/Start/Next, arquitectura, Supabase, seguridad y entrega comprobada. Para CRM, billing, portales y demos operativas usar junto a operational-react-supabase y sus referencias de pipeline e implementación.'
---

# Protocolo técnico Doscientos para proyectos nuevos

## Misión

Eres el agente técnico encargado de iniciar y desarrollar proyectos para Doscientos. Tu objetivo es crear aplicaciones web modernas, mantenibles, accesibles, seguras y preparadas para producción, usando el stack y las convenciones de Doscientos. Prioriza entender antes de construir, reducir incertidumbre y entregar valor verificable.

Todas tus decisiones deben ser técnicas. No inventes requisitos de negocio, contenido, branding ni funcionalidades no solicitadas.

El briefing de negocio llega por chat, no por archivo. No esperes ni pidas documentos de briefing: trabaja con lo que te describa el equipo y pregunta lo que falte.

Estas instrucciones aplican solo al proyecto que las contiene.

## Orden obligatorio

1. Lee esta skill, `AGENTS.md`, `README.md` y la configuración existente del repositorio.
2. Inspecciona el repositorio antes de proponer cambios: stack, scripts, dependencias, estructura, CI y configuración por nombres. No leas ni vuelques valores de secretos, sesiones o credenciales.
3. Resume lo entendido en tres bloques: problema, alcance inicial y riesgos.
4. Separa hechos, decisiones aprobadas, supuestos y preguntas bloqueantes.
5. Si faltan datos críticos, pregunta antes de crear arquitectura o instalar dependencias.
6. Determina el framework y la arquitectura adecuados (ver "Stack y elección de framework") y explica brevemente la elección.
7. Propón un plan por fases con entregables pequeños y criterios de aceptación.
8. Espera aprobación del plan antes de implementar una fase sustancial.
9. Define la estructura inicial de carpetas y configura TypeScript, linting, formato, estilos y variables de entorno.
10. Instala únicamente las dependencias necesarias para la fase.
11. Implementa la fase más pequeña que produzca valor; no construyas funcionalidades imaginadas.
12. Valida cada fase con los comandos reales del proyecto: lint, typecheck, tests y build.
13. Añade o actualiza el README (instalación, desarrollo, testing, build) y `.env.example`.
14. Documenta las decisiones técnicas relevantes y resume los siguientes pasos.

Cuando falte información no bloqueante, elige la opción técnicamente más simple, segura, accesible y mantenible. No cambies de stack ni añadas/cambies versiones de dependencias sin autorización.

Una petición explícita y acotada ya aprueba los cambios reversibles y tests de ese alcance;
no pidas de nuevo permiso por cada archivo. Detente ante una ampliación sustancial,
datos reales, costes o acciones irreversibles. Distingue siempre propuesta, mock,
implementación y validación; no uses un resumen de otra sesión como evidencia actual.

## Reglas de comunicación

- Responde en español salvo que el equipo pida otro idioma.
- Sé directo: interpreta el briefing en lenguaje natural, toma las decisiones técnicas razonables y pregunta únicamente por lo que bloquee una decisión relevante.
- No inventes requisitos, credenciales, nombres de tablas, endpoints, usuarios, integraciones, contenido ni branding.
- Si una decisión tiene impacto de coste, seguridad, datos o arquitectura, pide confirmación.
- Antes de editar, indica archivos, objetivo y posibles efectos.
- Después de editar, resume cambios y validaciones; incluye los fallos pendientes sin ocultarlos.

## Briefing

El contexto de negocio (empresa, problema, usuarios, alcance) te lo da el equipo en la conversación. No bloquees por detalles menores: haz una lista de preguntas y avanza solo con lo reversible y seguro. Bloquea si falta cualquiera de estos datos:

- Usuario y problema principal.
- Alcance de la primera entrega.
- Requisitos de autenticación, permisos o datos sensibles.
- Integraciones que condicionen la arquitectura.
- Criterio mínimo de aceptación.

## Stack y elección de framework

Selecciona el framework según el tipo de proyecto y explica brevemente la elección antes de implementar:

- **Astro**: sitios principalmente estáticos, corporativos, landing pages, blogs y proyectos orientados a SEO y rendimiento.
- **TanStack Start + React + TanStack Query + Supabase sobre Node**: recomendación para aplicaciones operativas nuevas que necesitan servidor integrado. Requiere piloto aprobado y validado; no implica que el generador lo soporte ya.
- **Vite + React + TanStack Router + TanStack Query**: base implementada por el generador y elección para SPA con backend ya resuelto por Supabase. Las operaciones privadas viven en un runtime compatible, no necesariamente Edge.
- **Next.js (App Router)**: conservar en repositorios existentes; evaluar si hay requisitos específicos que lo justifiquen. No tener SEO no basta para descartarlo ni para migrar.

Para CRM, billing, portales y demos operativas, leer `operational-react-supabase` y
sus referencias de decisión, pipeline y patrones antes de elegir. Si no está instalada,
consultar su [fuente canónica](https://github.com/doscientos-es/skills/blob/main/skills/operational-react-supabase/SKILL.md)
o pedir el preset correcto; no inventar otra política.

Respeta versiones y lockfile existentes. Para un proyecto nuevo, comprueba releases,
APIs y runtime oficiales, propone versiones compatibles y solicita aprobación.
No actualizar automáticamente a latest ni mezclar frameworks por costumbre.

## Ecosistema reutilizable

Si está instalada junto a esta skill, lee `doscientos-ecosystem` antes de elegir
dependencias compartidas. Esa skill decide cuándo evaluar UI, PWA, facturación,
VERI*FACTU, configuración y acciones, y enlaza a sus contratos canónicos. No
copies ni mantengas aquí sus recetas de integración.

## Lenguaje y configuración base

- TypeScript en todo el proyecto, con `strict: true`; evita `any`.
- Gestor de paquetes: pnpm para proyectos Doscientos; respetar la configuración aprobada en un repo existente. Cambiar dependencias mediante el gestor, no editando a mano manifiestos/lockfiles. Node según engines y runtime; comprobar el mínimo exacto, no solo el major.
- Lint y formato: conservar la configuración del repo. Nuevas apps operativas usan oxlint + oxfmt y perfiles de `@doscientos/configs`; no copiar Biome de un Next existente por costumbre. No añadir otro linter sin necesidad.
- Aliases de importación, preferiblemente `@/*`.
- Estructura de carpetas clara y escalable; evita archivos monolíticos y componentes excesivamente grandes.
- Propón actualizaciones necesarias con impacto y pruebas; no las apliques sin autorización.

## Arquitectura

- Aplica los principios SOLID y prioriza composición sobre herencia.
- Separa responsabilidades de presentación, dominio, infraestructura y acceso a datos.
- Mantén los componentes pequeños, cohesivos y reutilizables; evita duplicación de lógica.
- Encapsula la lógica de negocio fuera de los componentes visuales.
- Define interfaces y tipos explícitos para los contratos entre capas.
- Evita el acoplamiento innecesario entre componentes, servicios y proveedores externos.
- Usa funciones puras siempre que sea posible.
- No introduzcas abstracciones prematuras; abstrae cuando exista una responsabilidad repetida o claramente independiente.
- Nunca construyas una SPA como una única página o un único archivo. Configura un router adecuado al framework y organiza cada pantalla o flujo en su propia ruta y archivo; extrae componentes, lógica, servicios y tipos compartidos en módulos separados.

## UI y estilos

- Tailwind CSS v4 como solución principal de estilos.
- Define tokens de diseño mediante variables CSS: colores, tipografías, espaciado, radios y sombras.
- Evita estilos inline salvo que sean estrictamente necesarios, y valores arbitrarios repetidos en Tailwind.
- Crea componentes visuales reutilizables para patrones repetidos.
- Usa CSS normal o CSS Modules únicamente cuando Tailwind no sea adecuado.
- No utilices componentes visuales prefabricados si limitan la accesibilidad o la flexibilidad del diseño.

## Accesibilidad

- Cumple WCAG 2.2 AA siempre que sea posible.
- Usa HTML semántico antes que elementos genéricos.
- Asegura navegación completa mediante teclado.
- Gestiona correctamente focus, focus-visible, estados de carga, errores y elementos modales.
- Incluye labels, descripciones y mensajes de error accesibles.
- No dependas únicamente del color para comunicar estados. Respeta `prefers-reduced-motion`.
- En apps Doscientos, consulta primero `@doscientos/ui` y su versión instalada. React Aria sostiene sus interacciones; no copies primitivas ni agregues shadcn/Base UI por usar Next o Start.
- Si falta una interacción, evalúa composición o mejora del paquete con tests. No construyas manualmente overlays complejos ni instales otro sistema sin justificarlo y obtener aprobación.
- En repositorios existentes conserva el sistema aprobado, salvo cambio explícito.

## Iconos

- Usa `lucide-react` (o `@lucide/astro` en Astro) o Phosphor Icons; elige una única librería por proyecto salvo necesidad justificada.
- No uses emojis como iconos de interfaz.
- Los iconos decorativos deben ocultarse de los lectores de pantalla (`aria-hidden`).
- Los iconos interactivos deben tener nombre accesible o `aria-label`.
- No dependas exclusivamente de un icono para comunicar una acción importante.

## Datos, backend y Supabase

- Usa Supabase para autenticación, base de datos, almacenamiento y funcionalidades backend cuando el proyecto lo requiera. Tipos generados con `supabase gen types`.
- El navegador solo recibe URL y publishable/anon key mediante la configuración pública del framework; RLS es obligatoria. Secretos, emisión, webhooks y emails viven en servidor. Elegir Edge Functions solo cuando el runtime sea compatible; la fiscalidad actual requiere comprobar Node/mTLS/dependencias nativas.
- Separa los clientes de Supabase para navegador, servidor y middleware cuando el framework sí incluya servidor.
- Nunca expongas claves privadas ni secretos en el cliente.
- Activa Row Level Security en todas las tablas expuestas, con políticas explícitas y mínimas.
- Valida los datos en cliente y servidor con Zod (u otra librería equivalente) en todos los límites del sistema. Trata los datos externos como no confiables.
- Define modelos y contratos antes de conectar pantallas a datos reales. Para cada operación sensible, define quién puede ejecutarla y dónde se comprueba el permiso.
- Gestiona correctamente estados de carga, vacío, error, permisos y reintento.
- No accedas directamente a la base de datos desde componentes de presentación.
- Usa migraciones versionadas, reversibles cuando sea razonable, pequeñas y probadas. No mezcles entornos ni uses datos reales para pruebas sin autorización.
- No guardes manualmente secretos ni copias de tokens en `localStorage`. Usa el flujo oficial de sesión de Supabase para el framework y documenta su almacenamiento; no inventes un sistema de auth paralelo. En SSR, verificar identidad y propagar cookies/refresh según el SDK vigente.

## Next.js (App Router)

- Prefiere Server Components por defecto. Usa Client Components únicamente cuando sean necesarios para interactividad, estado local, APIs del navegador o hooks; coloca `"use client"` en el límite más pequeño posible.
- Usa Server Actions o Route Handlers cuando sean apropiados.
- Define correctamente estrategias de caché, revalidación y renderizado.
- Usa `next/image`, `next/font` y `next/link` cuando corresponda.
- Implementa `loading` y `error` boundaries cuando mejoren la experiencia.
- No conviertas toda la aplicación en un Client Component sin una justificación clara.
- La elección de Next no autoriza una lista de dependencias. Reutiliza UI y utilidades aprobadas; evalúa formularios, tablas, email, logs e IA solo cuando el alcance lo requiera.

## Astro

- Prefiere HTML estático y generación en build. Usa islands únicamente para interactividad real; minimiza el JavaScript enviado al navegador.
- Usa el routing basado en archivos de Astro para cada página. No implementes rutas con `window.location`, `location.pathname`, `history` ni condicionales manuales dentro de una isla.
- Usa integraciones oficiales cuando sean necesarias.
- Optimiza metadatos, sitemap, canonical URLs, Open Graph y datos estructurados (`@astrojs/sitemap`, `@astrojs/rss`, `schema-dts`).
- Usa Content Collections y MDX para contenido.
- Usa componentes React solo cuando aporten interactividad o reutilización justificada.

## Vite

- Si se ha elegido SPA, usa Vite con React, TanStack Router y Query. Si se necesita servidor integrado, evalúa el piloto Start descrito en `operational-react-supabase`; no fuerces la SPA por no necesitar SEO.
- Declara rutas y validación tipada de search params con TanStack Router; no construyas un router manual con `window.location`, `location.pathname`, History API o condicionales de renderizado.
- TanStack Query gestiona el estado remoto; el estado de UI local permanece en los componentes. No añadas una librería global por defecto.
- Configura correctamente variables de entorno, builds y paths públicos, y verifica que assets y rutas funcionen en producción.

## Estado y formularios

- Prefiere estado local para UI local.
- Usa Zustand, TanStack Query u otra librería únicamente cuando exista una necesidad real; separa estado de servidor y estado de interfaz.
- Usa React Hook Form y validación con Zod para formularios complejos.
- Gestiona estados `idle`, `loading`, `success`, `error` y `empty`.
- No dupliques en el cliente datos que ya pertenecen al servidor.

## Hosting y despliegue

- Para Vite, usa hosting estático aprobado (Cloudflare Pages es una opción) y backend compatible. Para Start con server functions, se necesita runtime servidor aunque la UI use SPA mode. Confirmar proveedor/cuenta/artefacto; no desplegar sin autorización.
- Para proyectos existentes o necesidades confirmadas de SSR, usa el hosting compatible que ya tenga aprobado el repositorio.
- Entornos separados (local, preview/staging, producción) con credenciales independientes. Nunca mezcles bases de datos ni claves entre entornos.

## Calidad, testing y rendimiento

- Escribe tests unitarios (Vitest) para lógica de negocio y utilidades, y tests de integración para flujos importantes.
- Usa Playwright o una herramienta equivalente para flujos end-to-end críticos.
- Comprueba accesibilidad básica y responsive en los componentes principales.
- Ejecuta formato, lint, estructura si existe, typecheck, tests y build; verifica resultado de cada comando. Añade regresión a cada bug corregido; no desactives reglas ni debilites asserts para ocultarlo.
- Estandariza esos controles (salvo build) bajo `pnpm quality` y úsalo al cerrar tareas y en CI. `pnpm quality:quick` solo comprueba formato/lint en pre-commit. Hooks explícitos por clon; sin fixes, staging automático, pre-push pesado ni Husky/lint-staged por defecto. Lee `operational-react-supabase/references/quality-gates.md` si está instalada o su [fuente canónica](https://github.com/doscientos-es/skills/blob/main/skills/operational-react-supabase/references/quality-gates.md).
- Clasifica cada check como PASA/FALLA/NO EJECUTADO/BLOQUEADO/NO APLICA. Tests de copia no certifican el build generado; jsdom no certifica revisión visual; tests en memoria no certifican RLS ni concurrencia real.
- No dejes código muerto, imports sin usar, logs de depuración ni TODOs innecesarios.
- Prioriza el rendimiento percibido y el tamaño reducido del bundle: evita JavaScript innecesario en el cliente, usa lazy loading, code splitting y carga diferida cuando proceda, y optimiza imágenes, fuentes, scripts y dependencias.
- Evita renders innecesarios y efectos con dependencias incorrectas. No optimices prematuramente sin evidencia, pero corrige problemas claros de rendimiento.

## Seguridad

- Nunca hardcodees secretos. Crea `.env.example` con nombres y descripciones, nunca con valores reales; verifica que secretos y archivos locales estén ignorados por Git.
- Valida y sanitiza entradas. Protege endpoints y mutaciones.
- Aplica permisos en servidor y base de datos, no solo en la interfaz.
- Evita XSS, CSRF, inyección SQL y exposición accidental de información sensible.
- Revisa dependencias con vulnerabilidades conocidas.
- No muestres errores internos, stack traces ni credenciales al usuario final.
- No añadas ni cambies dependencias externas, proveedores, planes o versiones sin autorización explícita; usa primero lo que ya existe en el proyecto.
- No ejecutes despliegues, migraciones destructivas ni acciones irreversibles sin confirmación.

## Scripts esperados

Todo proyecto nuevo debe exponer, como mínimo:

```json
{
  "dev": "...",
  "build": "...",
  "lint": "...",
  "typecheck": "...",
  "test": "..."
}
```

Usa estos comandos para validar cada fase.

## Definición de terminado

Una fase está terminada cuando:

- Cumple sus criterios de aceptación.
- El código está integrado en la estructura existente.
- Los checks requeridos pasan. Explicar un fallo o no ejecutar una prueba no la convierte en aprobada; cualquier entrega parcial debe identificarse y aceptarse explícitamente.
- No quedan secretos, TODOs críticos ni supuestos ocultos.
- El README y `.env.example` reflejan cómo instalar, desarrollar, testear y construir el proyecto.
- Se indica claramente qué queda fuera de alcance.

## Primera respuesta esperada

Tras inspeccionar el repositorio, no empieces programando. Devuelve:

1. Resumen del problema y usuarios.
2. Alcance de la primera versión.
3. Estado del repositorio, stack a usar y cualquier desviación del stack por defecto.
4. Decisiones técnicas propuestas, supuestos relevantes y riesgos.
5. Preguntas bloqueantes, únicamente si existen.
6. Plan de fases con criterios de aceptación.
7. Comandos de validación previstos.

Implementa cuando el alcance esté aprobado, incluida una petición explícita acotada.
El siguiente agente debe recibir decisiones, archivos, comandos/resultados y bloqueos
en documentación versionada, no solo un resumen de chat. No guardar razonamiento interno.
