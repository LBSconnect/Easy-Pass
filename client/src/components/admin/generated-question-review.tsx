/**
 * Review queue for generated questions.
 *
 * THE POINT OF THIS SCREEN
 *
 * A generated question is a draft and nothing else. It lives in its own table,
 * no student-facing query can reach it, and the only way one becomes a real
 * question is a person reading it here and pressing Approve. That is the whole
 * safety model for generation on a licensing product, and this screen is the
 * gate.
 *
 * So the reviewer gets what they need to judge it: the question as written,
 * the answer it claims, the explanation, the approved bank questions it was
 * derived from, and whatever the automatic checks flagged. Approve is
 * deliberately not one click - the Spanish translation has to be supplied,
 * because publishing an English-only question to a bilingual bank would leave
 * half the students with a blank.
 *
 * The reviewer's edits are what publish. Someone who corrected the wording
 * expects the correction to ship, not the draft.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CircleCheck, CircleX, TriangleAlert, Sparkles } from "lucide-react";

interface Draft {
  id: string;
  category: string;
  topic: string | null;
  questionTextEn: string;
  optionsEn: string[];
  correctAnswer: number;
  explanationEn: string | null;
  sourceQuestionIds: string[];
  validationNotes: string[] | null;
  validatorConfidenceBasisPoints: number | null;
  createdAt: string;
}

/** What a reviewer can change before publishing. */
interface Edits {
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  correctAnswer: number;
  explanationEn: string;
  explanationEs: string;
  topic: string;
}

function initialEdits(draft: Draft): Edits {
  return {
    questionTextEn: draft.questionTextEn,
    questionTextEs: "",
    optionsEn: [...draft.optionsEn],
    // Spanish starts empty on purpose. Prefilling it with the English would
    // invite a reviewer to approve untranslated text without noticing.
    optionsEs: draft.optionsEn.map(() => ""),
    correctAnswer: draft.correctAnswer,
    explanationEn: draft.explanationEn ?? "",
    explanationEs: "",
    topic: draft.topic ?? "",
  };
}

export function GeneratedQuestionReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Edits>>({});

  const { data, isLoading, isError } = useQuery<Draft[]>({
    queryKey: ["/api/admin/generated-questions?status=pending"],
  });
  const drafts = Array.isArray(data) ? data : [];

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/generated-questions?status=pending"] });

  const approve = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Edits }) => {
      const res = await apiRequest("POST", `/api/admin/generated-questions/${id}/approve`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Published", description: "The question is now in the live bank." });
      refresh();
    },
    onError: (e: Error) =>
      toast({ title: "Not published", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/generated-questions/${id}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "The draft will not reach students." });
      refresh();
    },
  });

  const editsFor = (draft: Draft) => edits[draft.id] ?? initialEdits(draft);
  const setEdit = (draft: Draft, patch: Partial<Edits>) =>
    setEdits((prev) => ({ ...prev, [draft.id]: { ...editsFor(draft), ...patch } }));

  /** Publishing needs both languages complete, or half the bank is blank. */
  const readyToPublish = (e: Edits) =>
    e.questionTextEn.trim().length >= 20 &&
    e.questionTextEs.trim().length > 0 &&
    e.optionsEn.every((o) => o.trim()) &&
    e.optionsEs.every((o) => o.trim());

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          We couldn't load the review queue.
        </CardContent>
      </Card>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card data-testid="card-review-empty">
        <CardContent className="py-12 text-center">
          <CircleCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-3 font-medium">Nothing waiting for review</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated questions appear here as drafts. None of them reach students until
            someone approves them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="list-generated-drafts">
      <p className="text-sm text-muted-foreground">
        {drafts.length} draft{drafts.length === 1 ? "" : "s"} waiting. Nothing here is visible
        to students; approving copies the question into the live bank.
      </p>

      {drafts.map((draft) => {
        const e = editsFor(draft);
        const confidence = draft.validatorConfidenceBasisPoints;

        return (
          <Card key={draft.id} data-testid={`card-draft-${draft.id}`}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{draft.category}</Badge>
                {draft.topic && <Badge variant="outline">{draft.topic}</Badge>}
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Draft
                </Badge>
                {confidence !== null && (
                  <span className="text-xs text-muted-foreground">
                    Checker confidence {(confidence / 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Automatic checks are shown, never treated as approval. */}
              {draft.validationNotes && draft.validationNotes.length > 0 && (
                <ul className="mt-3 space-y-1" data-testid="list-validation-notes">
                  {draft.validationNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="min-w-0 space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">English</p>
                  <Textarea
                    value={e.questionTextEn}
                    onChange={(ev) => setEdit(draft, { questionTextEn: ev.target.value })}
                    rows={3}
                    aria-label="Question, English"
                    data-testid={`input-en-${draft.id}`}
                  />
                  {e.optionsEn.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${draft.id}`}
                        checked={e.correctAnswer === i}
                        onChange={() => setEdit(draft, { correctAnswer: i })}
                        aria-label={`Mark option ${i + 1} correct`}
                        data-testid={`radio-correct-${draft.id}-${i}`}
                      />
                      <Input
                        value={opt}
                        onChange={(ev) => {
                          const next = [...e.optionsEn];
                          next[i] = ev.target.value;
                          setEdit(draft, { optionsEn: next });
                        }}
                        aria-label={`Option ${i + 1}, English`}
                      />
                    </div>
                  ))}
                  <Textarea
                    value={e.explanationEn}
                    onChange={(ev) => setEdit(draft, { explanationEn: ev.target.value })}
                    rows={3}
                    placeholder="Explanation (English)"
                    aria-label="Explanation, English"
                  />
                </div>

                <div className="min-w-0 space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Spanish (required before publishing)
                  </p>
                  <Textarea
                    value={e.questionTextEs}
                    onChange={(ev) => setEdit(draft, { questionTextEs: ev.target.value })}
                    rows={3}
                    placeholder="Pregunta en español"
                    aria-label="Question, Spanish"
                    data-testid={`input-es-${draft.id}`}
                  />
                  {e.optionsEs.map((opt, i) => (
                    <Input
                      key={i}
                      value={opt}
                      onChange={(ev) => {
                        const next = [...e.optionsEs];
                        next[i] = ev.target.value;
                        setEdit(draft, { optionsEs: next });
                      }}
                      placeholder={`Opción ${i + 1}`}
                      aria-label={`Option ${i + 1}, Spanish`}
                    />
                  ))}
                  <Textarea
                    value={e.explanationEs}
                    onChange={(ev) => setEdit(draft, { explanationEs: ev.target.value })}
                    rows={3}
                    placeholder="Explicación en español"
                    aria-label="Explanation, Spanish"
                  />
                </div>
              </div>

              {/* What it was derived from, so grounding is checkable. */}
              <p className="mt-3 text-xs text-muted-foreground">
                Derived from {draft.sourceQuestionIds.length} approved question
                {draft.sourceQuestionIds.length === 1 ? "" : "s"}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  disabled={!readyToPublish(e) || approve.isPending}
                  onClick={() => approve.mutate({ id: draft.id, body: e })}
                  data-testid={`button-approve-${draft.id}`}
                >
                  <CircleCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Approve and publish
                </Button>
                <Button
                  variant="outline"
                  disabled={reject.isPending}
                  onClick={() => reject.mutate(draft.id)}
                  data-testid={`button-reject-${draft.id}`}
                >
                  <CircleX className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Reject
                </Button>
                {!readyToPublish(e) && (
                  <span className="text-xs text-muted-foreground">
                    Fill in the Spanish text and every option to publish.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
