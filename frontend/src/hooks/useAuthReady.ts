import { useAuth } from '../contexts/AuthContext'

/**
 * Returns true when auth session has finished initialising — safe to start data fetches.
 * loading = auth is still checking the GoTrue session (INITIAL_SESSION has not fired yet,
 * or fetchEmployee is still running).
 * Once loading is false, auth state is fully known: either user is set or null.
 *
 * @returns boolean — true when auth is ready
 */
export function useAuthReady(): boolean {
  const { loading } = useAuth()
  return !loading
}
