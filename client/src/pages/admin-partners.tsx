/**
 * Partner acquisition, for the person doing the outreach.
 *
 * Two views behind one page, because they answer two different questions and
 * a person switches between them constantly:
 *
 *   Overview  - who is producing paying students?
 *   Prospects - who should I contact next, and what do I say?
 *
 * Everything here is admin-only and reads business-development data. It is not
 * a CRM in the Salesforce sense and should not grow into one: it holds what is
 * needed to run outreach to the first ten partners and no more.
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { scoreProspect, deriveComponents } from "@shared/partnerScore";
import { OUTREACH_STATUSES, PARTNER_STATUSES, PARTNER_SEGMENTS } from "@shared/partners";
import { Copy, ExternalLink, Search } from "lucide-react";

interface ProspectRow {
  id: string;
  organizationName: string;
  segment: string;
  segmentRaw: string | null;
  market: string | null;
  website: string | null;
  publicContact: string | null;
  candidateSignal: string | null;
  knownExamVolume: number | null;
  priority: string | null;
  whyItMatters: string | null;
  outreachStatus: string;
  decisionMakerName: string | null;
  decisionMakerTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  partnershipHypothesis: string | null;
  notes: string | null;
  nextAction: string | null;
  lastContactAt: string | null;
  scoreCandidatePipeline: number | null;
  scoreProductFit: number | null;
  scoreDecisionMakerAccess: number | null;
  scoreAudienceScale: number | null;
  scoreOverride: number | null;
  partnerStatus: string;
  partnerCode: string | null;
  defaultExamCategory: string | null;
  partnerActive: boolean;
  partnerDisplayName: string | null;
  attributedSubscriptions: number;
}

/** One prospect's automation state, from /api/admin/partners/campaigns. */
interface CampaignSummary {
  prospectId: string;
  state: string;
  paused: boolean;
  step: number;
  lastSentAt: string | null;
  nextActionAt: string | null;
  replyClassification: string | null;
  replyReceivedAt: string | null;
  replyExcerpt: string | null;
  suppressed: boolean;
  stopReason: string | null;
}

interface PerformanceRow {
  id: string;
  organizationName: string;
  partnerCode: string;
  partnerActive: boolean;
  defaultExamCategory: string | null;
  visits: number;
  readinessStarts: number;
  readinessCompletions: number;
  pricingViews: number;
  checkoutStarts: number;
  verifiedSubscriptions: number;
  lastActivityAt: string | null;
}

const EXAM_CATEGORIES = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * The score shown in the list.
 *
 * An override wins outright. Otherwise the stored components are used, and
 * where those are absent the import's rough defaults stand in - so a freshly
 * imported list sorts sensibly instead of being sixty-two zeros.
 */
function displayScore(row: ProspectRow): number {
  if (typeof row.scoreOverride === "number") return row.scoreOverride;

  const stored = {
    candidatePipeline: row.scoreCandidatePipeline,
    productFit: row.scoreProductFit,
    decisionMakerAccess: row.scoreDecisionMakerAccess,
    audienceScale: row.scoreAudienceScale,
  };
  const anyStored = Object.values(stored).some((v) => typeof v === "number");

  const components = anyStored
    ? {
        candidatePipeline: stored.candidatePipeline ?? 0,
        productFit: stored.productFit ?? 0,
        decisionMakerAccess: stored.decisionMakerAccess ?? 0,
        audienceScale: stored.audienceScale ?? 0,
      }
    : deriveComponents({
        knownExamVolume: row.knownExamVolume,
        priority: row.priority,
        segment: row.segment,
        hasContactEmail: Boolean(row.contactEmail),
        hasContactPhone: Boolean(row.contactPhone),
        hasDecisionMaker: Boolean(row.decisionMakerName),
      });

  return scoreProspect(components).score;
}

function PartnerOverview() {
  const { data: prospects } = useQuery<ProspectRow[]>({ queryKey: ["/api/admin/partners/prospects"] });
  const { data: performance, isLoading } = useQuery<PerformanceRow[]>({
    queryKey: ["/api/admin/partners/performance"],
  });

  const counts = useMemo(() => {
    const list = prospects ?? [];
    return {
      total: list.length,
      readyToContact: list.filter((p) => p.outreachStatus === "ready_to_contact").length,
      pilots: list.filter((p) => p.partnerStatus === "pilot").length,
      active: list.filter((p) => p.partnerStatus === "active_partner" && p.partnerActive).length,
    };
  }, [prospects]);

  const totals = useMemo(() => {
    const list = performance ?? [];
    return list.reduce(
      (acc, row) => ({
        visits: acc.visits + row.visits,
        readiness: acc.readiness + row.readinessStarts,
        checkouts: acc.checkouts + row.checkoutStarts,
        subscriptions: acc.subscriptions + row.verifiedSubscriptions,
      }),
      { visits: 0, readiness: 0, checkouts: 0, subscriptions: 0 },
    );
  }, [performance]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const cards = [
    { label: "Total prospects", value: counts.total, testId: "stat-total-prospects" },
    { label: "Ready to contact", value: counts.readyToContact, testId: "stat-ready-to-contact" },
    { label: "Active pilots", value: counts.pilots, testId: "stat-pilots" },
    { label: "Active partners", value: counts.active, testId: "stat-active-partners" },
    { label: "Partner visitors", value: totals.visits, testId: "stat-visits" },
    { label: "Partner diagnostics", value: totals.readiness, testId: "stat-readiness" },
    { label: "Partner checkouts", value: totals.checkouts, testId: "stat-checkouts" },
    { label: "Verified subscriptions", value: totals.subscriptions, testId: "stat-subscriptions" },
  ];

  const rows = performance ?? [];
  const noTraffic = rows.filter((r) => r.partnerActive && r.visits === 0);
  const trafficNoSales = rows.filter((r) => r.visits >= 10 && r.verifiedSubscriptions === 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold" data-testid={card.testId}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner performance</CardTitle>
          <CardDescription>
            Funnel counts come from analytics. Subscriptions come from verified Stripe
            reconciliation, so they count only sales that actually completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-partners">
              No partner links have been created yet.
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Partner</th>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3 text-right">Visits</th>
                  <th className="py-2 pr-3 text-right">Readiness</th>
                  <th className="py-2 pr-3 text-right">Completed</th>
                  <th className="py-2 pr-3 text-right">Pricing</th>
                  <th className="py-2 pr-3 text-right">Checkouts</th>
                  <th className="py-2 pr-3 text-right">Subscriptions</th>
                  <th className="py-2 text-right">Visit → sub</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0" data-testid={`row-performance-${row.partnerCode}`}>
                    <td className="py-2 pr-3 font-medium">{row.organizationName}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.partnerCode}</td>
                    <td className="py-2 pr-3 text-right">{row.visits}</td>
                    <td className="py-2 pr-3 text-right">{row.readinessStarts}</td>
                    <td className="py-2 pr-3 text-right">{row.readinessCompletions}</td>
                    <td className="py-2 pr-3 text-right">{row.pricingViews}</td>
                    <td className="py-2 pr-3 text-right">{row.checkoutStarts}</td>
                    <td className="py-2 pr-3 text-right font-semibold" data-testid={`subs-${row.partnerCode}`}>
                      {row.verifiedSubscriptions}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {row.visits > 0
                        ? `${((row.verifiedSubscriptions / row.visits) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic, but no sales</CardTitle>
            <CardDescription>Ten or more visits and nothing verified yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {trafficNoSales.length === 0
              ? <p className="text-sm text-muted-foreground">Nothing to look at.</p>
              : <ul className="space-y-1 text-sm">
                  {trafficNoSales.map((r) => (
                    <li key={r.id}>{r.organizationName} — {r.visits} visits</li>
                  ))}
                </ul>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live links with no traffic</CardTitle>
            <CardDescription>Activated, but nobody has used them.</CardDescription>
          </CardHeader>
          <CardContent>
            {noTraffic.length === 0
              ? <p className="text-sm text-muted-foreground">Nothing to look at.</p>
              : <ul className="space-y-1 text-sm">
                  {noTraffic.map((r) => <li key={r.id}>{r.organizationName}</li>)}
                </ul>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProspectList() {
  const { toast } = useToast();
  const { data: prospects, isLoading } = useQuery<ProspectRow[]>({
    queryKey: ["/api/admin/partners/prospects"],
  });
  const { data: campaigns } = useQuery<CampaignSummary[]>({
    queryKey: ["/api/admin/partners/campaigns"],
  });
  const campaignByProspect = useMemo(() => {
    const map = new Map<string, CampaignSummary>();
    for (const c of campaigns ?? []) map.set(c.prospectId, c);
    return map;
  }, [campaigns]);

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/partners/prospects/${id}`, patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/performance"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => {
      // The server's message is the useful one - "that code is taken", "choose
      // an exam first" - so it is shown rather than replaced with a generic.
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const rows = useMemo(() => {
    const list = (prospects ?? []).filter((p) => {
      if (segment !== "all" && p.segment !== segment) return false;
      if (status !== "all" && p.outreachStatus !== status) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const hay = `${p.organizationName} ${p.market ?? ""} ${p.decisionMakerName ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return list.sort((a, b) => displayScore(b) - displayScore(a));
  }, [prospects, search, segment, status]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search organization, market or contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-prospect-search"
          />
        </div>
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="sm:w-56" data-testid="select-segment"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All segments</SelectItem>
            {PARTNER_SEGMENTS.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-56" data-testid="select-outreach-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-prospect-count">
        {rows.length} of {prospects?.length ?? 0} organizations
      </p>

      {(() => {
        // The warm handoff, made unmissable: any prospect whose automated
        // sequence ended in interest or in a reply nobody has classified.
        const warm = (prospects ?? []).filter((p) => {
          const c = campaignByProspect.get(p.id);
          return c && (c.state === "interested" || c.state === "needs_human_review");
        });
        if (warm.length === 0) return null;
        return (
          <Card className="border-primary/40 bg-primary/[0.04]" data-testid="card-warm-prospects">
            <CardContent className="p-4">
              <p className="font-semibold">Needs your attention</p>
              <ul className="mt-2 space-y-1 text-sm">
                {warm.map((p) => {
                  const c = campaignByProspect.get(p.id)!;
                  return (
                    <li key={p.id}>
                      <button type="button" className="underline" onClick={() => setOpenId(p.id)}
                              data-testid={`link-warm-${p.id}`}>
                        {p.organizationName}
                      </button>
                      {" — "}
                      {c.state === "interested" ? "replied and looks interested" : "replied; needs a human read"}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })()}

      <div className="space-y-2">
        {rows.map((row) => {
          const open = openId === row.id;
          return (
            <Card key={row.id} data-testid={`card-prospect-${row.id}`}>
              <CardContent className="p-4">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 text-left"
                  onClick={() => { setOpenId(open ? null : row.id); setDraft(null); }}
                  data-testid={`button-prospect-toggle-${row.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{row.organizationName}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {label(row.segment)}{row.market ? ` · ${row.market}` : ""}
                      {row.priority ? ` · ${row.priority}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.attributedSubscriptions > 0 && (
                      <Badge data-testid={`badge-subs-${row.id}`}>{row.attributedSubscriptions} subs</Badge>
                    )}
                    {row.partnerStatus !== "prospect" && (
                      <Badge variant="secondary">{label(row.partnerStatus)}</Badge>
                    )}
                    {(() => {
                      const c = campaignByProspect.get(row.id);
                      if (!c) return null;
                      const attention = c.state === "interested" || c.state === "needs_human_review";
                      return (
                        <Badge
                          variant={attention ? "default" : "outline"}
                          data-testid={`badge-campaign-${row.id}`}
                        >
                          {c.paused ? "Paused" : label(c.state)}
                        </Badge>
                      );
                    })()}
                    <span className="text-lg font-bold tabular-nums" data-testid={`score-${row.id}`}>
                      {displayScore(row)}
                    </span>
                  </div>
                </button>

                {open && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {row.whyItMatters && (
                      <p className="text-sm text-muted-foreground">{row.whyItMatters}</p>
                    )}
                    {row.publicContact && (
                      <p className="text-sm"><span className="text-muted-foreground">Public contact:</span> {row.publicContact}</p>
                    )}
                    {row.website && (
                      <a href={row.website} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-sm underline">
                        Website <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}

                    <CampaignPanel campaign={campaignByProspect.get(row.id) ?? null} prospectId={row.id} />

                    <ProspectEditor row={row} onSave={(patch) => save.mutate({ id: row.id, patch })} saving={save.isPending} />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/partners/prospects/${row.id}/outreach`, { credentials: "include" });
                          if (res.ok) setDraft(await res.json());
                        }}
                        data-testid={`button-draft-${row.id}`}
                      >
                        Generate outreach draft
                      </Button>
                    </div>

                    {draft && (
                      <div className="rounded-lg border bg-muted/30 p-3" data-testid={`draft-${row.id}`}>
                        <p className="text-xs uppercase text-muted-foreground">Draft — nothing is sent</p>
                        <p className="mt-1 font-medium">{draft.subject}</p>
                        <Textarea className="mt-2 min-h-[220px] font-mono text-xs" defaultValue={draft.body} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-2"
                          onClick={() => {
                            navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`);
                            toast({ title: "Draft copied" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * What the outreach engine is doing to this prospect, and the levers a person
 * has over it. Deliberately small: status facts and five buttons. Nothing
 * here can activate a partnership - that stays with the referral-link
 * controls and their validation below.
 */
function CampaignPanel({ campaign, prospectId }: { campaign: CampaignSummary | null; prospectId: string }) {
  const { toast } = useToast();

  const act = useMutation({
    mutationFn: async (action: string) => {
      const res = await apiRequest("POST", `/api/admin/partners/campaigns/${prospectId}/action`, { action });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/prospects"] });
      toast({ title: "Campaign updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update campaign", description: error.message, variant: "destructive" });
    },
  });

  if (!campaign) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground" data-testid={`campaign-none-${prospectId}`}>
        No automated outreach yet. Set the status to Ready To Contact (with an email on file) and the
        next dispatch run will enroll them.
      </div>
    );
  }

  const when = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
  const done = ["completed", "interested", "maybe_later", "not_interested", "wrong_contact",
    "needs_human_review", "unsubscribed", "bounced", "stopped"].includes(campaign.state);

  return (
    <div className="rounded-lg border p-3" data-testid={`campaign-${prospectId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">Automated outreach</p>
        <Badge variant="outline" data-testid={`campaign-state-${prospectId}`}>{label(campaign.state)}</Badge>
        {campaign.paused && <Badge variant="secondary">Paused</Badge>}
        {campaign.suppressed && <Badge variant="destructive">Suppressed</Badge>}
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2"><dt className="text-muted-foreground">Emails sent:</dt><dd>{campaign.step} of 3</dd></div>
        <div className="flex gap-2"><dt className="text-muted-foreground">Last outreach:</dt><dd>{when(campaign.lastSentAt)}</dd></div>
        <div className="flex gap-2"><dt className="text-muted-foreground">Next outreach:</dt>
          <dd>{done || campaign.paused ? "—" : when(campaign.nextActionAt)}</dd></div>
        <div className="flex gap-2"><dt className="text-muted-foreground">Reply:</dt>
          <dd>{campaign.replyReceivedAt ? `${label(campaign.replyClassification ?? "received")} · ${when(campaign.replyReceivedAt)}` : "None yet"}</dd></div>
      </dl>
      {campaign.replyExcerpt && (
        <blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground" data-testid={`campaign-reply-${prospectId}`}>
          {campaign.replyExcerpt.slice(0, 400)}
        </blockquote>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {campaign.paused ? (
          <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate("resume")}
                  data-testid={`button-campaign-resume-${prospectId}`}>Resume</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={act.isPending || done} onClick={() => act.mutate("pause")}
                  data-testid={`button-campaign-pause-${prospectId}`}>Pause</Button>
        )}
        <Button size="sm" variant="outline" disabled={act.isPending || done} onClick={() => act.mutate("stop")}
                data-testid={`button-campaign-stop-${prospectId}`}>Stop</Button>
        <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate("mark_interested")}
                data-testid={`button-campaign-interested-${prospectId}`}>Mark interested</Button>
        <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate("mark_not_interested")}
                data-testid={`button-campaign-not-interested-${prospectId}`}>Mark not interested</Button>
      </div>
    </div>
  );
}

function ProspectEditor({
  row, onSave, saving,
}: { row: ProspectRow; onSave: (patch: Record<string, unknown>) => void; saving: boolean }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    outreachStatus: row.outreachStatus,
    decisionMakerName: row.decisionMakerName ?? "",
    decisionMakerTitle: row.decisionMakerTitle ?? "",
    contactEmail: row.contactEmail ?? "",
    contactPhone: row.contactPhone ?? "",
    partnershipHypothesis: row.partnershipHypothesis ?? "",
    notes: row.notes ?? "",
    nextAction: row.nextAction ?? "",
    partnerStatus: row.partnerStatus,
    partnerCode: row.partnerCode ?? "",
    defaultExamCategory: row.defaultExamCategory ?? "",
    partnerDisplayName: row.partnerDisplayName ?? "",
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const referralUrl = row.partnerCode ? `https://www.myeasypass.net/p/${row.partnerCode}` : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Outreach status">
          <Select value={form.outreachStatus} onValueChange={set("outreachStatus")}>
            <SelectTrigger data-testid={`select-status-${row.id}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Partner status">
          <Select value={form.partnerStatus} onValueChange={set("partnerStatus")}>
            <SelectTrigger data-testid={`select-partner-status-${row.id}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARTNER_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Decision maker">
          <Input value={form.decisionMakerName} onChange={(e) => set("decisionMakerName")(e.target.value)} />
        </Field>
        <Field label="Title">
          <Input value={form.decisionMakerTitle} onChange={(e) => set("decisionMakerTitle")(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input value={form.contactEmail} onChange={(e) => set("contactEmail")(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.contactPhone} onChange={(e) => set("contactPhone")(e.target.value)} />
        </Field>
      </div>

      <Field label="Partnership hypothesis — how MyEasyPass fits what they already do">
        <Textarea
          value={form.partnershipHypothesis}
          onChange={(e) => set("partnershipHypothesis")(e.target.value)}
          data-testid={`input-hypothesis-${row.id}`}
        />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
      </Field>
      <Field label="Next action">
        <Input value={form.nextAction} onChange={(e) => set("nextAction")(e.target.value)} />
      </Field>

      <div className="rounded-lg border p-3">
        <p className="text-sm font-semibold">Referral link</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The link only works once partner status is Active Partner and the link is switched on.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Partner code">
            <Input
              value={form.partnerCode}
              onChange={(e) => set("partnerCode")(e.target.value)}
              placeholder="kw-southwest"
              data-testid={`input-partner-code-${row.id}`}
            />
          </Field>
          <Field label="Exam they send">
            <Select value={form.defaultExamCategory} onValueChange={set("defaultExamCategory")}>
              <SelectTrigger data-testid={`select-exam-${row.id}`}>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Shown as">
            <Input value={form.partnerDisplayName} onChange={(e) => set("partnerDisplayName")(e.target.value)} />
          </Field>
        </div>

        {referralUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-xs" data-testid={`url-${row.id}`}>{referralUrl}</code>
            <Button
              size="sm" variant="outline" className="gap-2"
              onClick={() => { navigator.clipboard?.writeText(referralUrl); toast({ title: "Link copied" }); }}
              data-testid={`button-copy-url-${row.id}`}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
            </Button>
            <Badge variant={row.partnerActive ? "default" : "secondary"} data-testid={`badge-active-${row.id}`}>
              {row.partnerActive ? "Live" : "Not live"}
            </Badge>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={row.partnerActive ? "outline" : "default"}
            disabled={saving}
            onClick={() => onSave({ ...form, partnerActive: !row.partnerActive })}
            data-testid={`button-toggle-active-${row.id}`}
          >
            {row.partnerActive ? "Switch link off" : "Activate link"}
          </Button>
        </div>
      </div>

      <Button size="sm" disabled={saving} onClick={() => onSave(form)} data-testid={`button-save-${row.id}`}>
        Save
      </Button>
    </div>
  );
}

function Field({ label: text, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{text}</span>
      {children}
    </label>
  );
}

export default function AdminPartnersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-[1320px] px-4 py-8">
          <h1 className="text-2xl font-bold" data-testid="heading-admin-partners">Partners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prospects are organizations we have researched. They are not partners until someone here says so.
          </p>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="prospects" data-testid="tab-prospects">Prospects</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6"><PartnerOverview /></TabsContent>
            <TabsContent value="prospects" className="mt-6"><ProspectList /></TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
