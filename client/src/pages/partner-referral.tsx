/**
 * /p/:partnerCode - the door a partner's audience comes through.
 *
 * This page is a hand-off, not a destination. It asks the server whether the
 * code belongs to a live partner and then sends the visitor into the same
 * acquisition funnel everyone else uses: the readiness check, scoped to the
 * exam that partner sends us.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Build a branded page per organization. There is one route and one component,
 * because sixty-two organizations would otherwise become sixty-two React pages
 * that all drift apart, and activating the next partner would need a deploy.
 *
 * WHAT AN UNKNOWN CODE SEES
 *
 * The ordinary MyEasyPass readiness check, with no mention of any
 * organization. Unknown, unactivated and switched-off codes are treated
 * identically - the server answers 404 to all three - because a visible
 * difference between "no such partner" and "not activated yet" would confirm
 * that we hold a record on an organization that never agreed to anything.
 */

import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { rememberPartner, trackEvent } from "@/lib/analytics";

interface ResolvedPartner {
  /** The link that was clicked. */
  partnerCode: string;
  /**
   * Who this visitor's acquisition belongs to.
   *
   * The same as partnerCode for anyone new. Different for a returning student
   * who already belongs to someone else - the server decides, because only it
   * can see the stored attribution.
   */
  attributionPartnerCode: string;
  displayName: string;
  examCategory: string | null;
  landingVariant: string | null;
}

export default function PartnerReferralPage() {
  const params = useParams<{ partnerCode: string }>();
  const [, navigate] = useLocation();
  // The resolve call has a side effect on the server - it stashes the partner
  // in the session - so running it twice on a remount would be harmless but
  // untidy, and running it twice concurrently is just wasted work.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.partnerCode;

    // `replace` throughout: this page has nothing to come back to, and leaving
    // it in history means the browser's back button lands the visitor on a
    // spinner that immediately forwards them again.
    if (!code) {
      navigate("/readiness-check", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/partners/resolve/${encodeURIComponent(code)}`, {
          credentials: "include",
        });

        if (!res.ok) {
          // Not a live partner. The visitor still gets the product - they
          // followed a link to MyEasyPass and should land somewhere useful -
          // but nothing here names an organization.
          navigate("/readiness-check", { replace: true });
          return;
        }

        const partner = (await res.json()) as ResolvedPartner;

        // The owner, not the clicked link. A returning student who follows a
        // second partner's link keeps producing events under the partner who
        // actually introduced them, so their funnel and their eventual
        // subscription describe the same relationship.
        //
        // Falls back to the clicked code only if an older server omits the
        // field, which keeps this deployable ahead of the API.
        rememberPartner(partner.attributionPartnerCode ?? partner.partnerCode);

        trackEvent("partner_landing_view", {
          // partner_code always means the acquisition owner. trackEvent fills
          // it from the stored envelope; naming it here would overwrite that
          // with the clicked link and reintroduce exactly the drift this fixes.
          exam_type: partner.examCategory ?? null,
          // Which link was actually followed, kept as its own field so
          // "who is sharing links" stays answerable without muddling ownership.
          referral_partner_code: partner.partnerCode,
        });

        // Straight into the readiness check for the exam this partner sends.
        // A partner whose category an admin has not chosen yet lands on the
        // chooser rather than on a guess - an insurance agency might send life,
        // property and casualty or general lines, and picking wrong puts the
        // visitor in the wrong exam.
        navigate(
          partner.examCategory
            ? `/readiness-check?category=${partner.examCategory}`
            : "/readiness-check",
          { replace: true },
        );
      } catch {
        // A failed lookup must not strand anyone on a dead page.
        navigate("/readiness-check", { replace: true });
      }
    })();
  }, [params.partnerCode, navigate]);

  // Shown for the moment the lookup takes. Says nothing about any
  // organization, because at this point we do not know whether we are allowed to.
  return (
    <div className="flex min-h-screen items-center justify-center p-6" data-testid="partner-referral-loading">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p>Loading your readiness check…</p>
      </div>
    </div>
  );
}
