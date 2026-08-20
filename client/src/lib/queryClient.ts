import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiErrorFrom } from "./apiError";
import { trackEvent } from "./analytics";

/**
 * Fail with something a person can read.
 *
 * This used to throw `${status}: ${rawBody}`, which around thirty toasts in
 * the app then showed verbatim - so a student who reused an email address was
 * told `400: {"message":"Email already registered"}`. See lib/apiError.ts.
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) throw await apiErrorFrom(res);
}

function trackApiMilestone(method: string, url: string, phase: "start" | "success") {
  const verb = method.toUpperCase();

  if (verb === "POST" && url === "/api/register") {
    trackEvent(phase === "start" ? "signup_started" : "signup_completed");
    return;
  }

  if (phase === "success" && verb === "POST" && url === "/api/login") {
    trackEvent("login_completed");
    return;
  }

  if (phase === "success" && verb === "POST" && /^\/api\/diagnostic\/[^/]+\/submit$/.test(url)) {
    trackEvent("diagnostic_completed");
    return;
  }

  if (phase === "success" && verb === "POST" && url === "/api/stripe/checkout") {
    trackEvent("checkout_session_created");
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  trackApiMilestone(method, url, "start");

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  trackApiMilestone(method, url, "success");
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
