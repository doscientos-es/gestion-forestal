import { toast } from '@doscientos/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { DomainError } from './errors'

type Message = { title: string; description?: string }

/**
 * Runs an `api.ts` operation: refreshes every query afterwards (the demo dataset is tiny),
 * confirms with a toast and turns business errors into readable messages.
 */
export function useCommand<Input, Output>(
  operation: (input: Input) => Promise<Output>,
  options: {
    success?: string | ((output: Output, input: Input) => Message)
    onSuccess?: (output: Output, input: Input) => void
  } = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: operation,
    onSuccess: async (output, input) => {
      await queryClient.invalidateQueries()
      const message =
        typeof options.success === 'function'
          ? options.success(output, input)
          : options.success
            ? { title: options.success }
            : null
      if (message) {
        toast.success(
          message.title,
          message.description ? { description: message.description } : {},
        )
      }
      options.onSuccess?.(output, input)
    },
    onError: (error) => {
      toast.error(
        error instanceof DomainError ? error.message : 'No se ha podido completar la acción.',
      )
    },
  })
}
