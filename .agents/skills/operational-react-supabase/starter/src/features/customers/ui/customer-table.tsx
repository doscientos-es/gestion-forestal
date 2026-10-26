import {
  Avatar,
  AvatarFallback,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@doscientos/ui'

import type { Customer } from '../application/customer'
import { CustomerDetailDrawer } from './customer-detail-drawer'
import { customerInitials, customerStatusLabels, formatCurrency } from './customer-presentation'

export function CustomerTable({ customers }: { customers: Customer[] }) {
  return (
    <Table aria-label="Clientes que coinciden con los filtros" className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Cliente</TableHead>
          <TableHead scope="col" className="hidden w-[24%] lg:table-cell">
            Contacto
          </TableHead>
          <TableHead scope="col" className="w-24 sm:w-28">
            Estado
          </TableHead>
          <TableHead scope="col" className="hidden w-32 text-right md:table-cell">
            Valor / mes
          </TableHead>
          <TableHead scope="col" className="w-20">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="whitespace-normal">
              <div className="flex items-center gap-3">
                <Avatar className="hidden size-9 shrink-0 sm:flex">
                  <AvatarFallback className="bg-secondary text-primary text-xs">
                    {customerInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="font-medium">{customer.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-xs lg:hidden">
                    {customer.contactName}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden whitespace-normal lg:table-cell">
              <span>{customer.contactName}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">{customer.email}</span>
            </TableCell>
            <TableCell>
              <Badge variant={customer.status === 'active' ? 'success' : 'outline'}>
                {customerStatusLabels[customer.status]}
              </Badge>
            </TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">
              {formatCurrency(customer.monthlyValue)}
            </TableCell>
            <TableCell className="text-right">
              <CustomerDetailDrawer customer={customer} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
