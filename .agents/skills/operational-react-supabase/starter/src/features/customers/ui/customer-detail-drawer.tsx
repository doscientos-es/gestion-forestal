import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DescriptionDetails,
  DescriptionItem,
  DescriptionList,
  DescriptionTerm,
  DetailDrawer,
  DetailDrawerBody,
  DetailDrawerFooter,
  DetailDrawerHeader,
  DrawerClose,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@doscientos/ui'

import type { Customer } from '../application/customer'
import { customerInitials, customerStatusLabels, formatCurrency } from './customer-presentation'

export function CustomerDetailDrawer({ customer }: { customer: Customer }) {
  return (
    <DrawerTrigger>
      <Button variant="ghost" aria-label={`Ver ficha de ${customer.name}`} className="min-h-11">
        Ver
      </Button>
      <DetailDrawer dialogProps={{ 'aria-label': `Ficha de ${customer.name}` }}>
        <DetailDrawerHeader>
          <Avatar className="mb-2 size-12">
            <AvatarFallback className="bg-secondary text-primary">
              {customerInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <DrawerTitle>{customer.name}</DrawerTitle>
          <DrawerDescription>
            Datos de demostración; no corresponden a un cliente real.
          </DrawerDescription>
        </DetailDrawerHeader>
        <DetailDrawerBody>
          <DescriptionList>
            <DescriptionItem>
              <DescriptionTerm>Contacto</DescriptionTerm>
              <DescriptionDetails>{customer.contactName}</DescriptionDetails>
            </DescriptionItem>
            <DescriptionItem>
              <DescriptionTerm>Email</DescriptionTerm>
              <DescriptionDetails className="break-all">{customer.email}</DescriptionDetails>
            </DescriptionItem>
            <DescriptionItem>
              <DescriptionTerm>Estado</DescriptionTerm>
              <DescriptionDetails>
                <Badge variant={customer.status === 'active' ? 'success' : 'outline'}>
                  {customerStatusLabels[customer.status]}
                </Badge>
              </DescriptionDetails>
            </DescriptionItem>
            <DescriptionItem>
              <DescriptionTerm>Valor mensual</DescriptionTerm>
              <DescriptionDetails>{formatCurrency(customer.monthlyValue)}</DescriptionDetails>
            </DescriptionItem>
          </DescriptionList>
        </DetailDrawerBody>
        <DetailDrawerFooter>
          <DrawerClose variant="outline">Cerrar</DrawerClose>
        </DetailDrawerFooter>
      </DetailDrawer>
    </DrawerTrigger>
  )
}
