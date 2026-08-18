/**
 * Where glossary definitions get written.
 *
 * Two halves, in the order the work happens.
 *
 * The candidate list is generated: it reads the approved question bank and
 * reports which terms the bank leans on that the glossary does not define
 * yet, with the questions they appear in. It contains no definitions and
 * cannot - what a term means in Texas insurance or real-estate law is a
 * statement about law, and nothing in this app writes those.
 *
 * The editor below is where a person writes one, in both languages. Saving a
 * draft is unrestricted, because a half-written entry is exactly what a draft
 * is for. Publishing is not: an English-only entry in a bilingual product
 * leaves a Spanish-speaking student with a blank where the answer should be.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { checkGlossaryDraft } from "@shared/glossaryGate";
import { BookA, Plus, Trash2, CircleCheck } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

interface GlossaryTerm {
  id: string;
  category: ExamCategory | null;
  termEn: string;
  termEs: string;
  definitionEn: string;
  definitionEs: string;
  status: string;
}

interface Candidate {
  term: string;
  questionCount: number;
  sourceQuestionIds: string[];
  topics: string[];
}

const BLANK = {
  category: null as ExamCategory | null,
  termEn: "",
  termEs: "",
  definitionEn: "",
  definitionEs: "",
  sourceQuestionIds: [] as string[],
};

type Draft = typeof BLANK;

const GLOSSARY_KEY = ["/api/admin/glossary"];
const CANDIDATES_KEY = ["/api/admin/glossary/candidates"];

export function GlossaryEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(BLANK);

  const { data: termsData, isLoading } = useQuery<GlossaryTerm[]>({ queryKey: GLOSSARY_KEY });
  const { data: candidatesData } = useQuery<Candidate[]>({ queryKey: CANDIDATES_KEY });

  const terms = Array.isArray(termsData) ? termsData : [];
  const candidates = Array.isArray(candidatesData) ? candidatesData : [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: GLOSSARY_KEY });
    // The candidate list is "terms not yet defined", so it changes whenever a
    // term is added or removed.
    queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY });
  };

  const save = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const res = await apiRequest("POST", "/api/admin/glossary", { ...draft, status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      setDraft(BLANK);
      refresh();
    },
    onError: (e: Error) => toast({ title: "Not saved", description: e.message, variant: "destructive" }),
  });

  const publishExisting = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/glossary/${id}`, { status: "published" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Published", description: "Students can see it now." });
      refresh();
    },
    onError: (e: Error) =>
      toast({ title: "Not published", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/glossary/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      refresh();
    },
  });

  // The same rule the server enforces, so the button state and the server's
  // answer never disagree.
  const gate = checkGlossaryDraft(draft);

  return (
    <div className="space-y-4">
      {/* --- what the bank uses that we have not defined ------------------- */}
      <Card data-testid="card-glossary-candidates">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookA className="h-5 w-5" aria-hidden="true" />
            Terms worth defining
          </CardTitle>
          <CardDescription>
            Read out of the approved question bank: phrases the questions lean on that the
            glossary does not cover yet, most-used first. No definitions - those are yours to
            write.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground" data-testid="text-no-candidates">
              Nothing outstanding. Either every term the bank uses is defined, or the bank is
              still small.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="list-candidates">
              {candidates.slice(0, 30).map((candidate) => (
                <button
                  key={candidate.term}
                  type="button"
                  // Fills the English term only. Everything else is authored.
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      termEn: candidate.term,
                      sourceQuestionIds: candidate.sourceQuestionIds,
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={`candidate-${candidate.term.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  {candidate.term}
                  <Badge variant="secondary" className="ml-1">
                    {candidate.questionCount}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- writing one -------------------------------------------------- */}
      <Card data-testid="card-glossary-editor">
        <CardHeader>
          <CardTitle>Add a term</CardTitle>
          <CardDescription>
            Both languages are needed to publish. Save it as a draft at any point.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="glossary-term-en">
                Term (English)
              </label>
              <Input
                id="glossary-term-en"
                value={draft.termEn}
                onChange={(e) => setDraft((d) => ({ ...d, termEn: e.target.value }))}
                data-testid="input-term-en"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="glossary-term-es">
                Término (español)
              </label>
              <Input
                id="glossary-term-es"
                value={draft.termEs}
                onChange={(e) => setDraft((d) => ({ ...d, termEs: e.target.value }))}
                data-testid="input-term-es"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="glossary-def-en">
                Definition (English)
              </label>
              <Textarea
                id="glossary-def-en"
                rows={4}
                value={draft.definitionEn}
                onChange={(e) => setDraft((d) => ({ ...d, definitionEn: e.target.value }))}
                data-testid="input-definition-en"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="glossary-def-es">
                Definición (español)
              </label>
              <Textarea
                id="glossary-def-es"
                rows={4}
                value={draft.definitionEs}
                onChange={(e) => setDraft((d) => ({ ...d, definitionEs: e.target.value }))}
                data-testid="input-definition-es"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => save.mutate("published")}
              disabled={!gate.ready || save.isPending}
              data-testid="button-publish-term"
            >
              <CircleCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Publish
            </Button>
            <Button
              variant="outline"
              onClick={() => save.mutate("draft")}
              disabled={!draft.termEn.trim() || save.isPending}
              data-testid="button-save-draft"
            >
              Save as draft
            </Button>
            {!gate.ready && (
              <span className="text-xs text-muted-foreground" data-testid="text-gate-missing">
                To publish, still needs: {gate.missing.join(", ")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- what exists -------------------------------------------------- */}
      <Card data-testid="card-glossary-list">
        <CardHeader>
          <CardTitle>Glossary</CardTitle>
          <CardDescription>
            {terms.filter((t) => t.status === "published").length} published,{" "}
            {terms.filter((t) => t.status !== "published").length} in draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : terms.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nothing defined yet.</p>
          ) : (
            <ul className="space-y-2">
              {terms.map((term) => (
                <li
                  key={term.id}
                  className="flex flex-wrap items-start gap-3 rounded-md border p-3"
                  data-testid={`admin-term-${term.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {term.termEn}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {term.termEs}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{term.definitionEn}</p>
                  </div>
                  <Badge variant={term.status === "published" ? "secondary" : "outline"}>
                    {term.status}
                  </Badge>
                  {term.status !== "published" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publishExisting.mutate(term.id)}
                      data-testid={`button-publish-${term.id}`}
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(term.id)}
                    aria-label={`Delete ${term.termEn}`}
                    data-testid={`button-delete-${term.id}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
