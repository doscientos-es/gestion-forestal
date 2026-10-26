---
name: doscientos-ecosystem
description: 'Descubre y adopta los módulos reutilizables de Doscientos sin añadir dependencias innecesarias. Para CRM, billing y portales Supabase usa junto a operational-react-supabase.'
---

# Ecosistema reutilizable de Doscientos

## Propósito y fuente de verdad

Esta skill ayuda a decidir **si** un proyecto necesita un módulo de Doscientos y
a llegar a su documentación canónica. No sustituye contratos, ejemplos,
checklists ni requisitos de seguridad de los módulos: léelos siempre en su
origen antes de integrarlos.

- La documentación funcional y técnica vive junto a cada módulo.
- Storybook (`ui.doscientos.es`) es el catálogo visual y de accesibilidad de
  `@doscientos/ui`; no documenta infraestructura, fiscalidad ni CI.
- Esta skill solo se actualiza cuando cambian módulos disponibles, criterios de
  adopción o ubicaciones de las fuentes. No copies aquí recetas de integración.

## Cuándo usarla

Úsala antes de crear un proyecto y cuando el alcance nuevo incluya interfaz de
producto React, instalación PWA, facturación, emisión fiscal española,
estándares de proyecto o publicación de un paquete. No la uses para imponer
módulos en una landing, una web editorial o una tarea que no los requiere.

## Proceso obligatorio

1. Lee `AGENTS.md`, `README.md` y la configuración del repositorio; respeta el
   stack y las dependencias ya aprobadas.
2. Clasifica el alcance real: web de contenido, aplicación con usuarios,
   herramienta interna, librería o sistema de facturación.
3. Recorre la tabla de decisión. Selecciona solo los módulos cuyo disparador se
   cumple y anota expresamente los que no aplican.
4. Antes de instalar, lee la fuente canónica enlazada, confirma runtime,
   compatibilidad y precondiciones, y pide aprobación para dependencias o
   decisiones de seguridad, datos, coste o fiscalidad.
5. Integra el mínimo necesario, conserva los adaptadores en la aplicación y
   valida con los checks del módulo y los del proyecto.
6. Registra en el README o ADR del proyecto los módulos adoptados, su motivo,
   las variables de entorno requeridas y el enlace a su guía. No copies la guía.

## Matriz de decisión

| Necesidad comprobada                                                                       | Adoptar                                                                                                | No usar automáticamente                                            | Fuente canónica                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| CRM, billing, portal autenticado o demo operativa con Supabase                             | Skill `operational-react-supabase`: SPA Vite/Router o propuesta de piloto Start/Node según operaciones | Migración, runtime Edge fiscal o un router manual por defecto      | [Skill canónica](https://github.com/doscientos-es/skills/blob/main/skills/operational-react-supabase/SKILL.md) |
| Interfaz de producto en React y Tailwind v4                                                | `@doscientos/ui`                                                                                       | Sitios sin React o componentes de dominio exclusivos               | [README](https://github.com/doscientos-es/ui#readme) y [Storybook](https://ui.doscientos.es)                   |
| Proyecto TypeScript que necesite perfiles compartidos de lint, formato, tests o estructura | `@doscientos/configs`                                                                                  | Configuración ajena que el repositorio ya haya aprobado            | [README](https://github.com/doscientos-es/configs#readme)                                                      |
| Aplicación de uso recurrente que aporte valor instalable o funciones offline               | `@doscientos/pwa`                                                                                      | Landing, blog o app sin necesidad PWA validada                     | [README](https://github.com/doscientos-es/pwa#readme)                                                          |
| Dominio que emite facturas o calcula importes facturables                                  | `@doscientos/billing`                                                                                  | Cobros aislados, presupuestos no emitidos o una UI sin facturación | [README](https://github.com/doscientos-es/billing#readme)                                                      |
| Emisión de facturas españolas sujeta a VERI*FACTU                                          | `@doscientos/verifactu`                                                                                | Pagos, recibos no fiscales o facturación fuera de ese alcance      | [Guía de integración](https://github.com/doscientos-es/verifactu/blob/main/docs/INTEGRATION.es.md)             |
| Publicar un paquete reutilizable con Trusted Publishing                                    | acción apropiada de Doscientos                                                                         | Aplicaciones consumidoras o CI sin publicación de paquetes         | README de la acción elegida                                                                                    |

## Límites que no se pueden relajar

- **UI:** usa el paquete como primitivas; las rutas, datos, APIs, entidades y
  variaciones exclusivas del producto pertenecen a la aplicación.
- **Versiones:** consulta exports/tipos del paquete instalado. Una API documentada en
  main puede no estar publicada ni presente en el cliente. No copiar código para simularla.
- **PWA:** cada aplicación posee manifest, iconos, service worker y política de
  caché. No caches APIs, autenticación ni respuestas personalizadas por defecto.
- **Billing:** la aplicación aporta persistencia y adaptadores. Una factura
  emitida es un snapshot; no se edita ni recalcula.
  El paquete no garantiza numeración atómica, RLS, idempotencia ni fiscalidad completa:
  probar estos contratos en los adaptadores y consultar sus límites antes de emitir.
- **VERI\*FACTU:** la integración es server-side. Certificados, contraseñas y
  configuración SIF nunca llegan al cliente. Lee y cumple el playbook completo
  antes de modelar ledger, outbox, reintentos o flujos de anulación.
  Verificar runtime Node, mTLS y dependencias nativas; no asumir compatibilidad Edge.
- **Configs:** compón perfiles y deja las excepciones locales documentadas; no
  rebajes una regla compartida para ocultar un problema de una aplicación.
- **Actions:** fija acciones por SHA inmutable y conserva permisos y workflow
  del repositorio consumidor según la guía de la acción.

## Combinaciones habituales

- Una aplicación operativa con Supabase adopta `operational-react-supabase`,
  evalúa `@doscientos/ui` y el perfil de `@doscientos/configs` adecuado al
  framework, no PWA por defecto.
- Un producto de facturación evalúa `@doscientos/billing`; añade
  `@doscientos/verifactu` solo si su obligación fiscal está confirmada.
- Una librería publicada puede usar `@doscientos/configs` y la acción de
  publicación, sin arrastrar UI, PWA ni módulos de facturación.

## Resultado que debe comunicar el agente

Antes de implementar, entrega una tabla breve con necesidad, módulo, decisión
(`adoptar`, `no aplica` o `pendiente`) y motivo. Para cada módulo adoptado
incluye la guía que se consultará y las precondiciones bloqueantes. Si falta una
decisión de negocio, legal o de seguridad, no presupongas que el módulo aplica.

## Mantenimiento de esta guía

Al cambiar un módulo, actualiza primero su README, guía de integración, tests y
ejemplos en el repositorio del módulo. Actualiza esta skill únicamente si cambia
su nombre, su criterio de selección, su fuente canónica o aparece/desaparece un
módulo. Así el catálogo no duplica contratos que puedan divergir.
