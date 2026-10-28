import { Alert, AlertDescription, AlertTitle, Button } from '@doscientos/ui'
import { Eye, Printer } from 'lucide-react'

import { company } from '@/shared/lib/company'

/**
 * Strip above the documents the client opens by link: who to contact, print/PDF and, when the
 * office is only checking the page, a notice that nothing is recorded or answered.
 */
export function PublicTopBar({ preview }: { preview: boolean }) {
  return (
    <div className="mx-auto mb-4 w-full max-w-3xl space-y-3 print:hidden">
      {preview ? (
        <Alert variant="info">
          <Eye aria-hidden="true" className="size-4" />
          <AlertTitle>Vista previa</AlertTitle>
          <AlertDescription>
            Así lo ve el cliente. Esta visita no se anota en el historial y los botones de respuesta
            están desactivados.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-muted-foreground text-xs">
          ¿Alguna duda? Llame al{' '}
          <a className="text-foreground underline-offset-2 hover:underline" href={`tel:${company.phone.replace(/\s/g, '')}`}>
            {company.phone}
          </a>{' '}
          o escriba a{' '}
          <a className="text-foreground underline-offset-2 hover:underline" href={`mailto:${company.email}`}>
            {company.email}
          </a>
          .
        </p>
        <Button variant="outline" size="sm" onPress={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir o guardar PDF
        </Button>
      </div>
    </div>
  )
}
