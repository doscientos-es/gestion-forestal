import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback } from 'react'

type SearchBag = Record<string, unknown>

function useRawParam(key: string) {
  return useRouterState({ select: (state) => (state.location.search as SearchBag)[key] })
}

/** Router search values are already parsed (`2025` arrives as a number): back to text. */
function asText(raw: unknown): string | undefined {
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : undefined
}

/** Updates one search param in place (no new history entry, no scroll jump); `undefined` removes it. */
function useSetParam(key: string) {
  const navigate = useNavigate()
  return useCallback(
    (value: string | undefined) => {
      void navigate({
        to: '.',
        replace: true,
        resetScroll: false,
        search: ((previous: SearchBag) => ({ ...previous, [key]: value })) as never,
      })
    },
    [navigate, key],
  )
}

/**
 * A list filter that lives in the URL (`?estado=enviado`): going into a record and back, or
 * sharing the link, keeps the view. The default is not written, and unknown values fall back.
 */
export function useUrlState<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const raw = useRawParam(key)
  const setParam = useSetParam(key)
  const text = asText(raw)
  const value = allowed.find((item) => item === text) ?? fallback
  return [value, (next) => setParam(next === fallback ? undefined : next)]
}

/** Free text (a search box) kept in the URL. */
export function useUrlText(key: string): [string, (value: string) => void] {
  const raw = useRawParam(key)
  const setParam = useSetParam(key)
  return [asText(raw) ?? '', (next) => setParam(next === '' ? undefined : next)]
}
