import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  // `fetchUser` already draws the line that matters: 401 resolves to null
  // ("definitely signed out"), anything else throws ("we could not tell").
  // Retry once, because the second case is often a blip rather than a state.
  const { data: user, isLoading, isError, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    /**
     * Do not refetch when a new component starts observing this query.
     *
     * An errored query is never "fresh", so by default every newly mounted
     * observer retries it - and several components call useAuth. That turned a
     * failing /api/auth/user into an infinite loop: the query errors, the page
     * renders, a child mounts and calls useAuth, the refetch flips the query
     * back to pending, the page falls back to its spinner, the child unmounts,
     * the query settles, and round it goes - about one request per second,
     * forever, with nothing ever rendered. It also meant the client hammered
     * the server hardest exactly when the server was already unhealthy.
     *
     * The state is settled here instead, and recovery is explicit: the auth
     * error screen's "Try again" calls `retry` below.
     */
    refetchOnMount: false,
    // `retryOnMount` is the one that actually governs an *errored* query:
    // left on, every newly mounted observer retries it, which is what drove
    // the loop above. `refetchOnMount` alone does not cover this case.
    retryOnMount: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    /**
     * The auth check itself failed - server error, network drop, proxy.
     *
     * Distinct from `!isAuthenticated`, and callers must treat it as such.
     * Sending someone to /login because a 500 came back logs out a student
     * whose session is perfectly valid, and if the outage persists they cannot
     * log back in either.
     */
    isError,
    retry: refetch,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
