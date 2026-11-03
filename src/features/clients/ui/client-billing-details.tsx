import { billingAddressLines, type Client } from '@/features/workspace'

/** The same fiscal recipient on proposals and invoice drafts, including print/PDF. */
export function ClientBillingDetails({ client }: { client: Client | undefined }) {
  if (!client) return <p className="text-zinc-600">Cliente no encontrado</p>
  return (
    <div>
      <p className="font-semibold">{client.legalName}</p>
      {client.name !== client.legalName ? <p className="text-zinc-600">{client.name}</p> : null}
      <p className="text-zinc-600">
        {client.taxId ? `CIF / NIF: ${client.taxId}` : 'CIF / NIF pendiente'}
      </p>
      {billingAddressLines(client.billingAddress).map((line, index) => (
        <p key={index} className="text-zinc-600">
          {line}
        </p>
      ))}
      {!client.billingAddress.street ? (
        <p className="text-xs text-zinc-500">Dirección de facturación pendiente</p>
      ) : null}
    </div>
  )
}
