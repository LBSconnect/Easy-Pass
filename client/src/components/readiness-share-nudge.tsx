import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { buildReadinessShareUrl } from "@/lib/shareLinks";

/**
 * A small viral loop shown only after a readiness score is visible.
 *
 * It lives near the app root so it can be added without coupling the diagnostic
 * screen to browser share APIs. MutationObserver watches the SPA root because
 * the score card appears without a full navigation.
 */
export function ReadinessShareNudge() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSpanish = typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("es");
  const shareUrl = useMemo(() => buildReadinessShareUrl(), []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    const refresh = () => {
      const onReadiness = window.location.pathname === "/readiness-check";
      const hasScore = Boolean(
        document.querySelector('[data-testid="card-diagnostic-result"]') ||
        document.querySelector('[data-testid="card-diagnostic-saved"]'),
      );
      setVisible(onReadiness && hasScore);
      if (!onReadiness) setDismissed(false);
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("popstate", refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", refresh);
    };
  }, []);

  const category = () => new URLSearchParams(window.location.search).get("category") ?? undefined;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      trackEvent("readiness_cta_click", { step: "share_copy", category: category() });
    } catch {
      // Clipboard can be unavailable in locked-down browsers. The native share
      // button remains available where supported, and a failed copy must never
      // disrupt the readiness result screen.
    }
  };

  const share = async () => {
    const title = isSpanish ? "Evaluación gratis de preparación MyEasyPass" : "Free MyEasyPass readiness check";
    const text = isSpanish
      ? "Estoy usando esta evaluación gratis para prepararme para un examen de licencia de Texas. Pruébala."
      : "I'm using this free readiness check to prepare for a Texas licensing exam. Try it.";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        trackEvent("readiness_cta_click", { step: "share_native", category: category() });
        return;
      }
      await copyLink();
    } catch {
      // User cancellation is normal and should not produce an error UI.
    }
  };

  if (!visible || dismissed) return null;

  return (
    <aside
      className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-background p-4 shadow-lg"
      aria-label={isSpanish ? "Compartir evaluación gratis" : "Share free readiness check"}
      data-testid="readiness-share-nudge"
    >
      <button
        type="button"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
        onClick={() => setDismissed(true)}
        aria-label={isSpanish ? "Cerrar" : "Close"}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="pr-6">
        <p className="font-semibold">
          {isSpanish ? "¿Conoces a alguien que también esté estudiando?" : "Know someone else studying too?"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSpanish
            ? "Compártele la evaluación gratis. Tu puntuación y tus respuestas nunca se incluyen."
            : "Share the free readiness check. Your score and answers are never included."}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="gap-2" onClick={share} data-testid="button-share-readiness">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {isSpanish ? "Compartir" : "Share"}
        </Button>
        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={copyLink} data-testid="button-copy-readiness-link">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? (isSpanish ? "Copiado" : "Copied") : (isSpanish ? "Copiar enlace" : "Copy link")}
        </Button>
      </div>
    </aside>
  );
}
