# Quality y Git hooks: protección sin frenar el desarrollo

## Decisión Doscientos

Un comando completo, `pnpm quality`, es el contrato de agentes y CI. Un pre-commit
nativo de Git ejecuta `pnpm quality:quick` como ayuda local. No añadir Husky,
lint-staged, un hook pre-push o un framework de hooks por defecto.

Husky es una opción válida y habitual para gestionar hooks; lint-staged selecciona
archivos preparados y puede gestionar staging parcial. No son obligatorios. Con
Oxfmt/Oxlint y un único hook, Git ya resuelve la ejecución. No reimplementar selección
de archivos/stash por nuestra cuenta. Si el check completo se vuelve lento o estorba
al staging parcial, medir y proponer lint-staged con autorización de la dependencia.
Conservar Husky/Lefthook existente si funciona: no migrar solo por uniformidad.

## Contrato de comandos

| Comando              | Qué hace                                                       | Cuándo                              |
| -------------------- | -------------------------------------------------------------- | ----------------------------------- |
| `pnpm format`        | Formatea deliberadamente; modifica archivos                    | Editor/desarrollador revisa el diff |
| `pnpm quality:quick` | `pnpm format:check && pnpm lint`, sin fixes                    | Pre-commit y feedback rápido        |
| `pnpm quality`       | Formato, lint, estructura si aplica, tipos y tests pertinentes | Antes de cerrar una tarea y en CI   |
| `pnpm build`         | Artefacto real; no forma parte del pre-commit                  | CI y validación de entrega          |
| `pnpm hooks:install` | Instala el hook en la configuración Git local                  | Una vez por clon tras revisarlo     |

Todos los scripts deben existir. Paquetes JS sin compilación TypeScript pueden omitir
typecheck justificándolo; no crear scripts vacíos para aparentar cobertura. Los tests
de documentos/configuración cuentan si ese es el producto del repositorio.
Mantener aliases anteriores si hay consumidores, pero instrucciones nuevas usan `quality`.
No duplicar una lista diferente de comandos en el workflow: ejecutar el mismo contrato.

## Qué garantiza el hook y qué no

- Comprueba el **árbol de trabajo completo**, no exclusivamente el contenido del índice.
  Puede bloquear por cambios aún no preparados. No certifica un commit parcial exacto.
- No formatea, no ejecuta `git add`, no crea stash, no altera el índice ni arregla bugs.
  Si falla: corregir, revisar el diff y preparar explícitamente los cambios deseados.
- No ejecuta tests, typecheck, builds, navegadores, red ni servicios de producción.
- Medir duración real; objetivo orientativo de pocos segundos, no garantía. Si un repo
  tarda más de unos 5 segundos de forma habitual, revisar el alcance antes de expandirlo.
- Hooks pueden omitirse y `.git/config` no viaja al clonar. **No son una barrera de seguridad**.
  CI valida el contenido realmente subido y los checks requeridos protegen el merge.
- No instruir agentes a usar `--no-verify` para ocultar fallos. Una excepción local
  autorizada debe ser explícita y nunca elimina los checks completos de CI.

## Receta e instalación

Fuente de la receta mínima: [configs/.githooks](https://github.com/doscientos-es/configs/tree/main/.githooks).
También se incluye en el starter; sus copias se versionan y se actualizan mediante diff
revisado, no por descargas automáticas. No depende de APIs nuevas de un paquete instalado.

1. Confirmar raíz Git real, scripts y baseline de `quality:quick`. No instalar en una
   carpeta contenedora de repositorios ni cambiar la configuración del padre desde un subpaquete.
2. Revisar `core.hooksPath` y hooks existentes. El instalador rehúsa sustituirlos;
   integrarlos deliberadamente si ya hay Husky, Lefthook u otro hook necesario.
3. Ejecutar `pnpm hooks:install` en el repositorio inicializado. Solo configura
   `core.hooksPath=.githooks` localmente y hace ejecutable el pre-commit. No instala globalmente.
4. Cada persona repite la activación en su clon. No usar `prepare` silencioso: instalar
   dependencias de un paquete no debe cambiar hooks de otro repositorio ni de CI.
5. Git para Windows aporta el shell; Node/pnpm deben estar en PATH también para la GUI.
   Se fija LF en el hook mediante `.githooks/.gitattributes`; comprobar Linux en CI.

Para desactivar la receta local deliberadamente, comprobar primero que la configuración
local sigue apuntando a `.githooks`, y entonces usar `git config --local --unset core.hooksPath`.
No borrar archivos ni otros hooks. No hacer esta desactivación para saltarse validaciones.

## CI y adopción gradual

- Primero configs/UI y módulos compartidos críticos; billing y starter llevan la receta
  para activarla cuando tengan repositorio propio. No ejecutar el instalador del starter
  dentro del repositorio de skills: debe negarse a modificar el repo padre.
- Backoffice y la landing incluyen el contrato y la receta, pero se activan por clon solo
  después de que su baseline de `quality:quick` esté verde. Ante deuda previa, mantener
  el hook inactivo y planificar una limpieza revisable; no hacer formato masivo ni
  distribuir un hook que bloquearía todos los commits.
- CI: checkout, Node/pnpm aprobados, instalación con lockfile congelado, `pnpm quality`
  y `pnpm build` cuando exista. Storybook/E2E/seguridad en jobs explícitos, con entornos seguros.
- El starter incluye un `pnpm-lock.yaml` versionado, por lo que su CI puede usar
  `--frozen-lockfile` desde el primer commit. Renovarlo deliberadamente al cambiar
  dependencias; no eliminarlo para sortear una instalación no reproducible.
- Configurar required checks/reglas de rama en GitHub con autorización. Añadir YAML al
  disco no activa protección de ramas ni demuestra que GitHub haya ejecutado el workflow.
- Probar el instalador (idempotencia, conflictos, repo anidado), rechazo/éxito del hook y
  preservación de staging parcial. No crear commits reales para ensayar el hook.

## Changelog y commit-msg en el starter

El starter añade el hook `commit-msg` (`changelog lint-commit`, Conventional Commits) junto
al pre-commit; `hooks:install` instala ambos. `pnpm changelog:sync` (con `--soft`) se ejecuta
en `pnpm build` y genera `CHANGELOG.md` + `public/changelog.json`. `changelog:check` es para CI
con historial completo (`fetch-depth: 0`), no para `quality`, porque el generado siempre
va un commit por detrás de HEAD.

## Regla para agentes

Ejecutar el test mínimo mientras se desarrolla y **`pnpm quality` al cerrar**; ejecutar
también build/checks de integración pertinentes. Informar comando, salida y avisos.
Pasar solo `quality:quick`, un pre-commit o un test concreto no permite afirmar «quality pasa».
Si `quality` falla por algo previo, separar el fallo, no relajar controles ni arreglar
masivamente código ajeno para obtener verde. Aplicar el [pipeline](./delivery-pipeline.md).
