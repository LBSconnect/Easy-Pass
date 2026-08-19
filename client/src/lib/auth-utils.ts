import { ApiError } from "./apiError";

/**
 * Whether a failure was "you are not signed in".
 *
 * Reads the status rather than the message text. It used to match on the
 * message beginning "401: ...Unauthorized", which tied a control-flow decision
 * to the exact wording of a string shown to students - so making that string
 * readable would have silently broken this.
 */
export function isUnauthorizedError(error: Error): boolean {
  if (error instanceof ApiError) return error.status === 401;
  return /^401: .*Unauthorized/.test(error.message);
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/login";
  }, 500);
}
