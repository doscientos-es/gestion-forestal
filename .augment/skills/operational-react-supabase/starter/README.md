# Starter operativo React + Supabase

Plantilla de referencia para que un agente inicie un CRM, portal autenticado,
aplicación de facturación o demo operativa. No es un producto listo para
producción ni un CRM genérico: demuestra una única feature de clientes con
fixtures y los límites de arquitectura que deben conservarse al adaptar el
dominio.

## Uso

Genera un **repositorio nuevo**, no una carpeta dentro de `@doscientos/ui` ni
de un cliente existente:

```bash
pnpm dlx @doscientos/create-operational-app mi-crm --title "CRM Acme"
```

La CLI asigna el nombre del paquete desde el directorio y el título desde
`--title`; usa `--name @acme/mi-crm` si necesitas un nombre de paquete distinto.
No sobrescribe directorios no vacíos. Ejecuta `pnpm install` explícitamente con
`--install`, o hazlo tras revisar el proyecto generado.

Después:

1. Ejecuta `pnpm quality`. Antes de `pnpm build`, inicializa el repositorio Git
   y crea un primer commit revisando qué archivos incluyes. El changelog necesita
   al menos un commit; `--soft` no sustituye ese requisito.
   Tras la primera instalación, revisa y versiona `pnpm-lock.yaml`: el workflow incluido
   exige instalación congelada y ejecuta esos mismos comandos, sin credenciales reales.
2. Sustituye la feature `customers` por el primer vertical aprobado.
3. Mantén las fixtures mientras se valida el flujo. Cambia únicamente el
   adaptador en `src/features/customers/infrastructure/list-customers.ts` al
   conectar Supabase.
4. Añade una migración y políticas RLS antes de leer datos reales, en un entorno
   autorizado. Las mutaciones privilegiadas viven en un backend compatible;
   `supabase/functions/` solo si Edge soporta esa operación y sus dependencias.

No instales TanStack Start, Next.js, un servidor Node ni una librería de estado
global por defecto. No reutilices las entidades, nombres, datos ni textos de
este ejemplo como requisitos de un cliente.

Esta plantilla es Vite/Router, no Start. Para servidor integrado, consultar la
[decisión canónica](https://github.com/doscientos-es/skills/blob/main/skills/operational-react-supabase/references/stack-decision.md)
y validar un piloto aprobado. El transporte fiscal actual no debe suponerse compatible
con Edge. Instalar el preset operativo dentro del repositorio para conservar estas guías.

## Contrato de la plantilla

| Área                                                         | Propósito                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `src/app`                                                    | Inicialización de Query, router y shell; compone las features.                |
| `src/routes`                                                 | Rutas de TanStack Router y validación de URL; `routeTree.gen.ts` es generado. |
| `src/features/customers`                                     | UI, aplicación e infraestructura del vertical de ejemplo.                     |
| `src/shared/lib/supabase`                                    | Constructor del cliente de navegador; no lo invoques desde componentes.       |
| `src/features/customers/infrastructure/customer-fixtures.ts` | Fixtures sintéticas del vertical, reutilizables por el adaptador y tests.     |
| `supabase/migrations`                                        | Migraciones pequeñas y versionadas, tras aprobar el modelo de datos.          |
| `supabase/functions`                                         | Operaciones Edge cuando el runtime y el alcance lo permitan.                  |

La URL pertenece a TanStack Router, la caché remota a TanStack Query y las
primitivas visuales a `@doscientos/ui`. La feature conserva la lógica de
filtrado y su adaptador; las rutas no conocen Supabase.

## Base visual y pantallas de referencia

El shell toma como referencia la sobriedad de Scandice, Ábaco y SobreTaula:
canvas cálido, superficies planas, bordes suaves, navegación compacta y un solo
acento. No copia entidades, marcas, datos ni permisos de esas aplicaciones.

- `src/styles.css` centraliza la marca y la geometría. Usa una fuente de sistema
  sin depender de Google Fonts ni fingir que Inter está instalada. Si cambias
  la fuente, cárgala explícitamente; si cambias colores, vuelve a comprobar contraste.
- Navegación de escritorio y móvil con destinos reales, página actual, foco
  visible, enlace «Saltar al contenido» y título del documento por pantalla.
  Cambiar de ruta enfoca el contenido; cambiar filtros no roba el foco.
- El listado combina métricas calculadas del resultado, búsqueda etiquetada,
  selección de estado accesible, tabla adaptable y ficha en drawer.
- «Nuevo cliente» demuestra validación, envío pendiente, errores y confirmación
  accesible. Solo crea fichas en memoria; no utiliza red, localStorage ni Supabase.
  Se pierden al recargar. No uses esa memoria como almacenamiento de producción.
- `/guia` enlaza a los escenarios `default`, `loading`, `empty`, `error` y `long`.
  El parámetro `scenario` es exclusivo de la demo: retíralo al adaptar el producto.

Se usan las primitivas de la versión fijada en el lockfile. No se copian las
implementaciones del paquete UI ni se añade una dependencia para iconos o tests.
Cuando se adopte una versión publicada con `FormDialog`, sustituye la composición
del formulario por esa abstracción; no construyas otro wrapper genérico local.

### Revisión de accesibilidad antes de entregar

Los tests comprueban validación, datos sintéticos, estados, nombres accesibles de
tabla/acciones, encabezados de columna y contraste de los pares de tokens base.
No sustituyen una auditoría de navegador ni comprueban todos los colores mezclados:

1. Recorre navegación, filtros, alta y detalle con Tab/Shift+Tab; prueba Enter y Escape.
2. Comprueba foco inicial, cierre y retorno al botón que abrió cada overlay.
3. Revisa escritorio, 375px, zoom al 200% y contenido largo sin scroll horizontal de página.
4. Comprueba que la barra móvil no tapa acciones y respeta el área segura del dispositivo.
5. Activa movimiento reducido y verifica estados de carga, error, vacío y reintento.
6. Verifica contraste AA con los tokens de marca finales y una revisión con lector de pantalla.

## Variables de entorno

`.env.example` sólo contiene nombres de variables públicas. En una SPA de Vite,
`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` son visibles en el
navegador; es correcto porque RLS sigue siendo obligatoria. Nunca añadas service
role, certificados, claves de firma ni secretos de proveedores a una variable
`VITE_*`.

El modo de fixtures no necesita variables de entorno. `createBrowserSupabaseClient`
falla explícitamente si alguien intenta conectar datos reales sin configurarlas.

## Validación

El contrato completo es `pnpm quality`, también para agentes y CI. No sustituirlo por
un lint aislado. El starter incluye un pre-commit nativo que ejecuta `pnpm quality:quick`
(formato + lint, sin fixes). No añade dependencias, tests/build en cada commit ni pre-push.

Tras generar e inicializar el repositorio propio, revisar `.githooks/` y ejecutar
`pnpm hooks:install` una vez por clon. No se activa con `pnpm install` ni desde el repo
de skills. Rehúsa reemplazar hooks existentes. Necesita Node/pnpm en PATH y comprueba
el árbol de trabajo completo, sin tocar el staging parcial ni crear stash. CI verifica
el contenido del commit; configurar required checks en GitHub requiere un paso aparte.

Los tests de generación solo verifican la copia/personalización, no garantizan que estos
comandos pasen. No eliminar un check para ocultar una incompatibilidad: aislarla, añadir
una regresión en `@doscientos/configs` y corregir la regla o la plantilla deliberadamente.

- `pnpm format:check`: formato compartido.
- `pnpm lint`: reglas de React/Vite y capas de features.
- `pnpm structure:check`: estructura y nombres.
- `pnpm typecheck`: contrato TypeScript estricto.
- `pnpm test`: pruebas de lógica de URL y dominio.
- `pnpm quality`: todos los checks anteriores.
- `pnpm build`: sincroniza el changelog, compila con Vite y genera el árbol de rutas.

## Changelog automático

Viene configurado de serie: no hay que montarlo a mano. Los mensajes de commit siguen
Conventional Commits (`feat:`, `fix:`, `perf:` aparecen; el resto no) y el hook
`commit-msg` (instalado con `pnpm hooks:install`) rechaza los que no cumplan.

- `pnpm changelog:sync` genera `CHANGELOG.md` y `public/changelog.json` desde Git
  (`--soft` tolera clones superficiales, pero exige al menos un commit). Se ejecuta en `pnpm build`.
- `pnpm changelog:check` falla si los archivos generados están obsoletos (útil en CI
  con historial completo; no forma parte de `quality` porque siempre va un commit por detrás).
- Los archivos generados no se editan a mano. CI usa `fetch-depth: 0` para ver el historial.
- La app puede mostrar `/changelog.json` (servido desde `public/`) en su pantalla de novedades.

Antes de añadir una nueva feature, replica los escenarios `default`, `loading`,
`empty`, `error` y contenido largo usando fixtures; conecta backend real sólo
cuando modelo, tenant, permisos y políticas estén aprobados.
