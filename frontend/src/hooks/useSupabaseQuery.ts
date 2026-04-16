import { useQuery } from 'react-query'
import type { QueryKey, UseQueryOptions, UseQueryResult } from 'react-query'
import { useAuthReady } from './useAuthReady'

/**
 * Wrapper around React Query useQuery that automatically waits for auth to be ready
 * before firing any database query. Merges the authReady guard with the caller's
 * own enabled condition so queries never fire before the session is confirmed.
 *
 * authReady becomes true only after AuthContext.fetchEmployee() completes —
 * strictly later than the INITIAL_SESSION event. This prevents the race where
 * a page mounts and fires a query with user=null before the session is known.
 *
 * @param queryKey - React Query cache key
 * @param queryFn  - Async function that returns the query data
 * @param options  - Standard React Query options (enabled is merged, not replaced)
 * @returns Standard React Query result
 */
export function useSupabaseQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: NonNullable<UseQueryOptions<TData, TError>['queryFn']>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> {
  const authReady = useAuthReady()
  return useQuery<TData, TError>(queryKey, queryFn, {
    ...options,
    enabled: authReady && (options?.enabled ?? true),
  })
}
