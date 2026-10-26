# Create Operational App

Generador de una aplicación operativa de Doscientos con Vite, React,
TypeScript, TanStack Router, TanStack Query, Tailwind v4, Supabase,
`@doscientos/ui`, configuración compartida y pruebas iniciales.

Solo genera Vite/Router; no hay un modo Start. Para decidir si corresponde un piloto
Start/Node, leer la [guía operativa canónica](https://github.com/doscientos-es/skills/blob/main/skills/operational-react-supabase/SKILL.md).
Las skills y sus referencias se instalan aparte desde el repositorio de skills; no
confundirlas con los archivos publicados del generador npm.

## Uso

Ejecuta el comando en el directorio padre del nuevo repositorio:

```bash
pnpm dlx @doscientos/create-operational-app mi-crm --title "CRM Acme"
```

La CLI nunca sobrescribe archivos: el directorio de destino debe no existir o
estar vacío. Por defecto sólo genera el proyecto; añade `--install` para que
ejecute `pnpm install` al terminar. Usa `--dry-run` para revisar la operación
sin escribir archivos y `--name @acme/mi-crm` para elegir el nombre del paquete.

Después instala las dependencias declaradas si no usaste `--install`, revisa el código,
ejecuta `pnpm quality` y `pnpm build`, y
define el primer vertical, las migraciones y las políticas RLS antes de conectar
datos reales. Consulta [`starter/README.md`](./starter/README.md) para los
límites de arquitectura y seguridad que conserva la plantilla.
Los tests de la CLI no certifican el build ni RLS. Revisa también las incompatibilidades
conocidas documentadas en el starter antes de usarlo como base de un cliente.

## Desarrollo del paquete

La plantilla dentro de `starter/` es la única fuente usada tanto por la skill
como por la CLI. Los marcadores de nombre y título se sustituyen al generar el
proyecto; no copies ni mantengas otra plantilla en paralelo.

```bash
pnpm test
pnpm release:check
```
