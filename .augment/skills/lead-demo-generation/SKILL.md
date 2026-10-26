---
name: lead-demo-generation
description: 'Genera demos comerciales visuales desde un lead de Doscientos usando el MCP, sin filtrar datos del CRM, seleccionando solo los módulos necesarios y dejando una base técnica que pueda evolucionar a producto.'
---

# Demo comercial escalable desde un lead

## Objetivo

Cuando el equipo pida “genera una demo para el lead X”, crea una demostración visual centrada en el problema confirmado, útil en la segunda llamada y reutilizable como primera fase del proyecto. No construyas una maqueta decorativa ni afirmes funcionalidades no evidenciadas.

Esta skill se instala con `technical-details`, `doscientos-ecosystem` y
`operational-react-supabase` para demos operativas. Definen proceso, módulos y
pipeline canónicos; esta skill no impone un framework alternativo. Una
petición explícita de demo aprueba el alcance reversible descrito aquí; siguen
requiriendo confirmación las integraciones reales, costes, datos sensibles y
decisiones de arquitectura irreversibles.

## Flujo obligatorio

1. Resuelve el lead con `search_leads`. Si hay más de una coincidencia, pide que se elija una; nunca adivines.
2. Consulta `get_lead_demo_brief` con el ID. Empieza sin evidencia privada.
3. Lee `unknowns`, separa hechos, supuestos y preguntas. Si no hay problema, usuario o flujo principal confirmados, pregunta antes de construir.
4. Si una nota o transcripción es imprescindible, pide autorización antes de consultar con `includePrivateContent: true`. El parámetro no constituye autorización por sí mismo. No copies datos personales, notas, cantidades ni transcripciones a la demo.
5. Localiza si ya existe un repositorio del cliente. Amplíalo si es la misma iniciativa. Si hay que crear otro, confirma el directorio padre: `clients/<slug-cliente>/` solo en el workspace que usa esa organización; no anides otro repositorio dentro del cliente actual.
6. Lee `doscientos-ecosystem` y aplica su matriz de decisión al alcance confirmado. Antes de implementar, declara cada módulo como `adoptar`, `no aplica` o `pendiente`, con su motivo y guía canónica.
7. Presenta un plan breve: recorrido de la demo, alcance excluido, stack, módulos y riesgos. Avanza sin esperar aprobación solo para una demo explícitamente solicitada; bloquea ante una integración real, dato sensible, coste o arquitectura irreversible.
8. Implementa y valida. Entrega una guía de demostración y una ruta concreta de promoción a producción.

## Qué debe demostrar

- Un flujo principal respaldado por el contexto comercial.
- Como máximo, un flujo de apoyo que haga visible el valor.
- Datos semilla sintéticos, coherentes y deterministas para contar la historia en menos de cinco interacciones por flujo.
- Estados reales de producto: vacío, carga, éxito, error o revisión cuando apliquen.

No uses un dashboard genérico, KPIs inventados, integraciones falsas presentadas como reales ni módulos que el lead no haya pedido.

## Arquitectura reutilizable

- Para una demo operativa, aplicar `operational-react-supabase`: Vite/TanStack Router si basta el backend previsto; Start/Node solo como piloto aprobado si necesita servidor integrado. Conservar el stack de la iniciativa existente. Astro para contenido estático. No elegir Next por defecto por ser una demo.
- Usa el router estándar elegido: TanStack Router en Vite/Start, App Router en Next existente y routing de Astro. No simules rutas con `window.location`, `location.pathname`, History API ni condicionales de pantallas.
- Si la demo usa React, adopta `@doscientos/ui` para tokens, estilos y primitivos; importa sus estilos globales una sola vez. No recrees ni modifiques localmente un primitivo que ya exista en el paquete.
- Aplica la skill `product-ui-design` a toda pantalla de la demo: cabecera con acción principal, listas como filas, pestañas con contador, estados vacíos con acción, avisos tras guardar y asistentes con pasos clicables. Sin ella la demo no se considera terminada.
- No añadas PWA, billing, VERI*FACTU ni acciones de publicación salvo que la matriz confirme una necesidad demostrable. Una demo fiscal o de facturación usa datos sintéticos y no realiza envíos ni operaciones reales.
- La demo debe arrancar sin servicios externos mediante un modo explícito y datos semilla locales. Documenta el flag/script real del proyecto; no asumir que `DEMO_MODE=true` o una variable sin prefijo es visible en Vite. Un fallo de producción nunca activa mocks silenciosamente.
- Define contratos de proveedor y adaptadores mock para cada integración futura. Los mocks no deben enviar emails, crear cobros ni modificar servicios externos.
- Separa dominio, UI, datos semilla y adaptadores. Nunca concentres toda la demo en una página o archivo.
- No diseñes una base de datos de producción sin requisitos validados. Si hacen falta datos persistentes, usa un modelo mínimo, migraciones y RLS, pero conserva el modo demo aislado.
- Añade `docs/demo-to-production.md` con la matriz pantalla/acción → mock → persistencia → permiso/RLS → prueba → estado del pipeline operativo. No declarar login real por mostrar un shell «autenticado».

## Protección de datos y marca

- No muestres email, teléfono, notas, presupuestos, transcripciones, facturas ni adjuntos del CRM.
- No copies documentos o logos del cliente sin autorización verificable. Si faltan activos, usa una identidad temporal neutra y marca el pendiente.
- No uses credenciales reales, producción, pagos, envíos ni integraciones irreversibles durante una demo.
- No infieras que una integración existe porque el lead la mencionó: muéstrala como simulada o exclúyela.

## Entregables mínimos

- `DEMO_BRIEF.md`: hechos confirmados, supuestos, preguntas y flujo de la llamada.
- `README.md`: arranque, modo demo, comandos de calidad y límites.
- `docs/demo-to-production.md`: plan de evolución sin reescritura.
- Datos semilla y adaptadores mock explícitos.
- Lint, typecheck, tests y build ejecutados según el proyecto.

## Criterio de calidad

La demo está terminada cuando puede enseñarse sin red ni credenciales, hace evidente el valor para ese lead, no filtra datos comerciales y permite conservar al menos el dominio, los componentes, los contratos y los tests al abrir el proyecto real.
