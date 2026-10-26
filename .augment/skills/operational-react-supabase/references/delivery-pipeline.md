# Pipeline técnico: de petición a entrega verificable

Usar en orden. No saltar una puerta porque la UI parezca terminada. Una petición explícita
autoriza el trabajo reversible de su alcance; no repreguntar por cada archivo o test.
Dependencias/versiones nuevas, datos reales, proveedores, coste y despliegues requieren permiso.

## P0 — Contexto y alcance

1. Leer instrucciones del repositorio, scripts, lockfile y estado Git del repositorio correcto.
   Respetar cambios del usuario; no resetear, limpiar, commitear ni publicar implícitamente.
2. Si hay MCP comercial disponible, descubrir sus herramientas y consultar solo el recurso
   necesario en lectura. No copiar credenciales, transcripciones o datos personales al repo.
3. Elegir un usuario y un flujo principal; separar hechos, supuestos, excluidos y bloqueos.
4. Registrar permisos, tenants, datos sensibles, integraciones y criterio observable de éxito.

**Salida:** alcance aprobado y un primer vertical concreto. Preguntar solo por huecos que
cambien arquitectura, permisos, fiscalidad o aceptación; no inventarlos para poder continuar.

## P1 — Decisión y reutilización

1. Aplicar la [decisión de stack](./stack-decision.md), conservando proyectos existentes.
2. Evaluar cada módulo como adoptar/no aplica/pendiente y consultar la versión real disponible.
3. Registrar un ADR breve: motivo, alternativas descartadas, runtime, versiones, coste pendiente
   y evidencia necesaria. No confundir una recomendación con implementación validada.

**Salida:** stack/runtime y contratos de módulos decididos; altas de dependencias autorizadas.

## P2 — Base reproducible

1. Vite/Router: usar la CLI existente solo en destino vacío. Start: piloto aprobado con
   instrucciones oficiales de la versión elegida; no inventar flags de la CLI de Doscientos.
2. Instalar las skills del preset dentro del repo y comprobar que sus referencias se copiaron.
3. Instalar dependencias declaradas con pnpm; respetar el lockfile. En CI, instalación congelada.
4. Ejecutar scripts reales: formato, lint, estructura si existe, tipos, tests y build.
   Verificar que `quality` llama scripts existentes e incluye las pruebas; no asumirlo por nombre.
5. Comprobar un arranque limpio, ruta profunda y refresh. No reutilizar un build antiguo como prueba.

Unificar los controles anteriores bajo `pnpm quality` y usarlo también en CI. Aplicar
la [receta de hooks](./quality-gates.md): pre-commit rápido de solo lectura, instalación
explícita por clon y comprobación de que no sustituye hooks existentes. No tests/build
en cada commit; tampoco omitir el quality completo al cerrar la tarea.

**Salida:** proyecto generado que pasa sus controles, no solo tests de copia del generador.
Si el starter falla, conservar la evidencia y corregir la causa dentro del alcance aprobado.
No eliminar el check para tener verde ni propagar el fallo a nuevos clientes.

## P3 — Primer vertical completo

Implementar ruta/URL → query o función de servidor → caso de uso → adaptador → UI.
Empezar con fixtures deterministas: listado, filtro, detalle y una mutación relevante.
Mostrar loading, empty, error recuperable, permiso denegado, contenido largo y móvil.

**Salida:** flujo demostrable y pruebas que verifican el contrato, sin servicios externos.
Una demo muestra explícitamente qué es simulado; no aparentar integraciones o datos reales.

## P4 — Persistencia y seguridad

Para cada pantalla/acción completar esta matriz en `docs/demo-to-production.md`:

| Acción         | Fuente actual                  | Persistencia objetivo         | Quién puede | Control servidor/RLS | Prueba            | Estado                 |
| -------------- | ------------------------------ | ----------------------------- | ----------- | -------------------- | ----------------- | ---------------------- |
| Flujo acordado | Fixture/mock o real comprobado | Adaptador/migración aprobados | Rol/tenant  | Dónde se comprueba   | Comando/evidencia | Pendiente o verificado |

Probar sesión y expiración, RLS por operación, usuario anónimo, dos tenants, roles,
pertenencia falsificada, descargas privadas y caché al cambiar de organización/usuario.
Validar constraints, transacciones y concurrencia en la base de datos real de prueba.
Un repositorio en memoria no prueba RLS ni atomicidad. No usar producción como banco de pruebas.

**Salida:** adaptadores y migraciones probados en entorno autorizado; ningún mock silencioso
en el flujo de producción. Si falta acceso al entorno, documentar el bloqueo sin declararlo seguro.

## P5 — Integraciones y operaciones sensibles

Solo si están en alcance: PDF, fiscalidad, pagos, email, webhooks, cron y PWA.
Aplicar los [límites de reutilización](./reusable-modules.md). Webhooks validan firma/origen
según proveedor, deduplican eventos y gestionan reintentos sin repetir efectos de negocio.
En facturación, probar emisión concurrente, idempotencia, rollback, snapshot y documento privado.
Los fallos del proveedor no deben volver a emitir una factura ni duplicar un cobro.

**Salida:** flujo correcto y sus fallos probados en mock/sandbox; reintentos trazables y sin secretos.

## P6 — Entrega y operación

1. Repetir tests afectados, suite pertinente, formato, lint, tipos, estructura y build.
2. Ejecutar pruebas de integración y smoke/E2E pertinentes; distinguirlas de tests unitarios.
3. Documentar configuración por nombre, migraciones, health check, observabilidad, rollback,
   backup/restore que aplique y responsables. No declarar probado un restore no ejecutado.
4. Solicitar despliegue explícito indicando destino, entorno y efectos. Deploy no es parte
   implícita de «hazlo funcionar». Después, smoke autorizado sin operaciones fiscales reales.

**Salida:** criterios de aceptación satisfechos y evidencia reproducible. Un fallo explicado
no equivale a una comprobación aprobada; una aceptación parcial requiere explicitar límites.

## Cómo ejecutar y comunicar pruebas

- Empezar por test concreto → archivo → paquete. Añadir regresión para el bug antes de cerrar.
- Un comando debe haber terminado y su salida debe comprobarse: salida 0 y sin errores obvios.
  En PowerShell, cortar tras cada fallo; un último comando correcto no prueba los anteriores.
- Estados permitidos: PASA, FALLA, NO EJECUTADO, BLOQUEADO y NO APLICA con motivo.
- Si falta Chromium, instalar el runtime de la dependencia ya declarada cuando esté permitido;
  repetir la prueba. No llamar «visual validado» a un build o a tests jsdom.
- No relajar asserts, desactivar lint ni aumentar timeouts para esconder errores. Si no se
  distingue fallo del test frente al producto después de aislarlo, detenerse y preguntar.
- Secretos: inspeccionar nombres, conteos y estados; nunca volcar `.env`, cookies, tokens,
  certificados, headers de auth o resultados privados a terminal, logs o documentación.

## Handoff mínimo al siguiente agente

Actualizar `docs/implementation-status.md` sin copiar esta guía. Registrar:

- Objetivo aprobado y exclusiones; ADR/decisiones y preguntas pendientes.
- Repo/feature y archivos relevantes; versión/runtime efectivamente utilizados.
- Qué está implementado, qué es mock y qué sigue siendo propuesta.
- Comprobación, comando exacto sin secretos, entorno, resultado y fallo/advertencia relevante.
- Acciones reales realizadas (o ninguna), cambios del usuario preservados y límites de seguridad.
- Siguiente paso concreto, evidencia de aceptación y autorización necesaria.

No guardar razonamiento interno ni un diario de herramientas: guardar decisiones y evidencia.
No fijar contadores históricos de tests como garantía futura; volver a ejecutar sobre el cambio actual.

## Plan inicial de una semana (adaptar, no prometer plazo)

1. Coherencia de skills/generador y base limpia comprobada.
2. Referencia mínima Auth + autorización + RLS y pruebas negativas.
3. CI que comprueba el artefacto generado y contratos de paquetes.
4. Piloto de un flujo completo con integraciones acotadas.
5. Validación, documentación operativa y entrega autorizada.

Medir tiempo hasta checks verdes y primer flujo, reparaciones manuales y regresiones.
No construir un CRM universal, migrar toda la cartera ni agregar módulos «por si acaso».
