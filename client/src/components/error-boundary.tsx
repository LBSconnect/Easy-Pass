/**
 * Error boundaries.
 *
 * The app had none. A render error anywhere - one card reading a field that
 * turned out to be undefined - unmounted the entire React tree and left a
 * blank white page. A route sweep found ten routes that blank this way when an
 * API returns a well-formed-but-unexpected body, and the same mechanism is why
 * a single bad readiness band once took down the whole dashboard rather than
 * one card.
 *
 * Two levels, because they fail differently:
 *
 * - `PageErrorBoundary` keeps navigation and the footer usable so a student
 *   who hits a broken page can leave it. A blank page offers no way out but
 *   the back button.
 * - `CardErrorBoundary` isolates one widget. The rest of the dashboard keeps
 *   working, which matters because most of these failures are one unlucky
 *   field on one card, not a broken page.
 *
 * Boundaries must be class components - there is no hook equivalent.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Shown instead of the default card fallback. */
  fallback?: ReactNode;
  /** Identifies the failing area in logs. */
  label?: string;
}

interface State {
  hasError: boolean;
}

class BaseBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console is the existing error channel for this app; when a monitoring
    // service is added, this is the single place to forward from.
    console.error(`[error-boundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  /** Clearing the flag remounts the subtree, which retries the render. */
  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return null;
  }
}

/**
 * Isolates a single card.
 *
 * Deliberately understated: the student does not need to know which component
 * threw, only that this one box is unavailable and the rest of the page is
 * fine. No stack traces, no error codes - those go to the console.
 */
export class CardErrorBoundary extends BaseBoundary {
  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Card className="h-full" data-testid="card-error-fallback">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
          <TriangleAlert className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            This section couldn't be displayed right now.
          </p>
          <Button variant="outline" size="sm" onClick={this.reset} data-testid="button-card-retry">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
}

/**
 * Catches a whole-page failure.
 *
 * Renders inside the router, so whatever chrome the layout provides around it
 * survives. Offers a way onward rather than a dead end.
 */
export class PageErrorBoundary extends BaseBoundary {
  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center"
        data-testid="page-error-fallback"
      >
        <TriangleAlert className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">Something went wrong on this page</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The rest of MyEasyPass is still working. Try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={this.reset} data-testid="button-page-retry">
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Go to dashboard</a>
          </Button>
        </div>
      </div>
    );
  }
}
