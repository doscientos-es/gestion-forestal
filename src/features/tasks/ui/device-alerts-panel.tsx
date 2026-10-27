import { Button, toast } from '@doscientos/ui'
import { BellRing, Download, Smartphone } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'

import {
  alertPermission,
  askAlertPermission,
  installPrompt,
  isInstalled,
  showSystemAlert,
} from '@/shared/lib/pwa'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

/** Lets each person turn on system alerts on this device and install the app on the home screen. */
export function DeviceAlertsPanel() {
  const [permission, setPermission] = useState(alertPermission)
  const canInstall = useSyncExternalStore(installPrompt.subscribe, installPrompt.available)
  const installed = isInstalled()

  async function turnOn() {
    const result = await askAlertPermission()
    setPermission(result)
    if (result === 'granted') {
      await showSystemAlert({
        title: 'Avisos activados',
        body: 'Recibirás aquí las obras, tareas y respuestas de clientes.',
        url: '/avisos',
        tag: 'alerts-on',
      })
    } else if (result === 'denied') {
      toast.error('Has bloqueado los avisos. Se activan desde los ajustes del navegador.')
    }
  }

  return (
    <Panel aria-labelledby="device-title" className="mb-5">
      <PanelHeader
        id="device-title"
        icon={<Smartphone className="size-5" strokeWidth={1.75} />}
        title="Avisos en este dispositivo"
        description="Una alerta en el móvil o el ordenador cuando pase algo que te toca."
        action={
          permission === 'granted' ? (
            <Tag tone="green" dot>
              Activados
            </Tag>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        {permission === 'unsupported' ? (
          <p className="text-muted-foreground text-sm">
            Este navegador no permite alertas. En el iPhone, instala primero la app desde Compartir
            → «Añadir a pantalla de inicio».
          </p>
        ) : permission === 'denied' ? (
          <p className="text-muted-foreground text-sm">
            Los avisos están bloqueados en este navegador. Actívalos desde los ajustes del sitio.
          </p>
        ) : permission === 'default' ? (
          <Button onPress={() => void turnOn()}>
            <BellRing aria-hidden="true" className="size-4" /> Activar avisos
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            Recibirás alertas mientras la app esté abierta o en segundo plano.
          </p>
        )}
        {canInstall && !installed ? (
          <Button variant="outline" onPress={() => void installPrompt.run()}>
            <Download aria-hidden="true" className="size-4" /> Instalar la app
          </Button>
        ) : null}
        {installed ? <Tag tone="gray">App instalada</Tag> : null}
      </div>
    </Panel>
  )
}
