---
name: product-ui-design
description: 'Criterios de diseño UI/UX senior para aplicaciones de producto y demos (CRM, paneles, gestión operativa): densidad, jerarquía, tablas, pestañas, estados, feedback y asistentes. Usar al crear o revisar cualquier pantalla de producto, antes de añadir tarjetas o componentes nuevos.'
---

# Diseño de producto SaaS senior

## Objetivo

Que cada aplicación de Doscientos parezca diseñada por un equipo de producto
experimentado (referencias: Linear, Vercel, Cloudflare), no por una plantilla.
Esta skill define **cómo se ve y se comporta** la interfaz. No define marca: los
colores, logos y fuentes vienen de `brand-implementation` o
`doscientos-internal-brand`. Si existe `@doscientos/ui`, úsalo para los
primitivos; no los recrees.

## Principios

1. **Sobriedad:** superficies neutras, bordes finos, un único color de acento.
2. **Densidad útil:** controles compactos, poco relleno, más información visible.
3. **Jerarquía por tipografía y espacio**, no por cajas ni sombras.
4. **Una acción principal por pantalla**, visible en la cabecera.
5. **Todo estado se diseña:** vacío, carga, error, éxito y sin resultados.
6. **Lo clicable lo parece:** cursor, hover y foco visibles.

## Tokens y escala

- Usa tokens semánticos (superficie, borde, texto, texto atenuado, acento). Nunca hex repetidos en componentes.
- Fondo de página ligeramente distinto de la superficie de contenido; borde de 1 px.
- Radios pequeños y consistentes (`rounded-md` en controles, `rounded-lg` en contenedores). Evita `rounded-2xl` y mayores.
- Títulos de página `text-xl`; títulos de sección `text-sm font-semibold`; cuerpo `text-sm`; metadatos `text-xs` atenuado.
- Sombras solo en capas flotantes (menús, modales, avisos). Las tarjetas no llevan sombra.
- Números con `tabular-nums` en tablas, métricas y cantidades.

## Estructura de pantalla

- **Cabecera de página:** título, descripción corta y acciones a la derecha (botón principal + secundarios). No pongas una fila entera de botones grandes bajo el título.
- **Navegación lateral** agrupada, con el elemento activo claro y selector de contexto/rol arriba. En móvil, barra inferior con iconos finos.
- **Migas de pan** cuando haya más de un nivel.
- **Contenedores:** una sola superficie con filas separadas por líneas (`divide-y`) en lugar de una tarjeta por elemento. Usa `overflow-hidden` para que el hover respete las esquinas.
- Evita anidar tarjetas dentro de tarjetas.

## Componentes

- **Listas y tablas:** fila de cabecera (solo en pantallas anchas), filas con hover, columnas alineadas, acción de fila discreta. Una lista de cuadrícula de tarjetas solo si el contenido es visual (imágenes).
- **Pestañas:** subrayado o segmentado sutil, con contador (`Todos 12`). Sustituyen a grupos de botones de filtro.
- **Badges de estado:** punto de color + texto. Nunca solo color (accesibilidad).
- **Barras de nivel** (stock, progreso) finas, con valor numérico al lado.
- **Formularios:** etiqueta encima, controles compactos, ayuda en `text-xs`, error en texto con icono junto al campo.
- **Selector de cantidad** `− n +` en la fila, con límites y mensaje de por qué no se puede pasar.
- **Buscador** con icono; en listas largas, atajo `/` para enfocarlo cuando aporte.

## Asistentes (wizards) de varios pasos

- Indicador de pasos pequeño: actual en acento, completados en tono fuerte, futuros atenuados.
- Los pasos ya alcanzados son clicables y **lo parecen**: cursor de mano, fondo suave y etiqueta subrayada al pasar el ratón. Los no alcanzados, atenuados y con cursor de no permitido.
- Vista previa en vivo al lado (o debajo en móvil) con el resultado de lo que se está capturando.
- Destaca lo dudoso para revisión (fondo ámbar suave), no lo ocultes.
- Selección de opciones con borde de acento en la elegida.

## Estados y feedback

- **Estado vacío:** icono, título, una frase útil y un botón con la acción que lo resuelve. Nunca solo «No hay datos».
- **Sin resultados de búsqueda:** icono y pista de qué probar.
- **Avisos (toast):** abajo a la derecha, máximo tres, se cierran solos (~4 s), con icono y texto. Úsalos tras guardar, crear, ajustar o eliminar. Eliminar usa tono de advertencia.
- **Acciones destructivas:** confirmación explícita, texto claro de la consecuencia.
- **Carga:** esqueletos con la forma del contenido; no spinners a pantalla completa.

## Interacción y accesibilidad

- `focus-visible` visible en todo elemento interactivo; contraste AA con los valores finales.
- Objetivos táctiles de al menos 40 px en móvil, aunque el control se vea compacto.
- Respeta `prefers-reduced-motion`. Animaciones de entrada breves (≤200 ms) y sin desplazamiento grande.
- Hover no puede ser la única forma de descubrir una acción.
- Revisa en 375 px y en escritorio antes de dar la pantalla por terminada.

## Contenido

- Español neutro, frases cortas, verbos de acción en botones («Guardar albarán», no «Aceptar»).
- Números, moneda y fechas con `Intl` en la configuración regional del usuario.
- Datos semilla de demo realistas y coherentes; sin KPIs inventados que no apoyen el flujo.

## Lista de revisión antes de entregar

- [ ] Cabecera con título, descripción y acción principal.
- [ ] Sin tarjetas por elemento ni tarjetas anidadas; sin sombras en contenedores.
- [ ] Listas como filas con hover; pestañas con contador.
- [ ] Estados vacío, sin resultados, carga y error diseñados, con acción.
- [ ] Badges con punto y texto; nada comunicado solo por color.
- [ ] Toast tras cada acción que cambia datos.
- [ ] Asistentes con pasos clicables que lo parecen y vista previa en vivo.
- [ ] Foco visible, contraste AA y revisión móvil/escritorio.
- [ ] `typecheck`, lint, tests y build del proyecto ejecutados.

## Primera respuesta esperada

Antes de rediseñar, indica qué pantallas se revisarán, qué patrones de esta guía
ya se cumplen y cuáles no, y qué primitivos de `@doscientos/ui` se reutilizarán.
