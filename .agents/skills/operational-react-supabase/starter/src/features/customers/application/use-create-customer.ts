import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createCustomer } from '../infrastructure/list-customers'

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
