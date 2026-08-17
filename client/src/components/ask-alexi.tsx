/**
 * Ask-the-assistant dialog.
 *
 * Opens on a question the student has ALREADY answered, and offers a fixed
 * menu of intents rather than a blank chat box. That is a product decision as
 * much as a safety one: "explain this simply" is what a student actually wants
 * after a wrong answer, and it is a request we can ground in the approved
 * explanation we already hold.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, MessageCircleQuestion } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { STUDY_ASSISTANT, useStudyAssistantConfig } from "@/lib/studyAssistant";

type TutorIntent =
  | "explain_simply"
  | "why_wrong"
  | "why_correct"
  | "give_example"
  | "memory_trick"
  | "explain_more";

interface Props {
  questionId: string;
  /** Exam category, for analytics only. */
  category?: string;
  /** Whether the student got it wrong - changes which intents lead. */
  wasIncorrect?: boolean;
}

const INTENTS: Array<{ key: TutorIntent; en: string; es: string; incorrectOnly?: boolean }> = [
  { key: "explain_simply", en: "Explain this simply", es: "Explícalo de forma sencilla" },
  { key: "why_wrong", en: "Why was I wrong?", es: "¿Por qué me equivoqué?", incorrectOnly: true },
  { key: "why_correct", en: "Why is that answer correct?", es: "¿Por qué esa respuesta es correcta?" },
  { key: "give_example", en: "Give me an example", es: "Dame un ejemplo" },
  { key: "memory_trick", en: "Give me a memory trick", es: "Dame un truco para recordarlo" },
];

export function AskAlexi({ questionId, category, wasIncorrect = false }: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const { data: config } = useStudyAssistantConfig();
  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;

  const ask = useMutation({
    mutationFn: async (intent: TutorIntent) => {
      const res = await apiRequest("POST", "/api/alexi/tutor", { questionId, intent });
      return (await res.json()) as { answer: string; source: string };
    },
    onSuccess: (data) => {
      setAnswer(data.answer);
      setAsked(true);
    },
    onError: () => {
      // Never surface a technical error to a student mid-study.
      setAnswer(
        es
          ? "No pude cargar una explicación ahora mismo. Revisa la guía de estudio de este tema."
          : "I couldn't load an explanation right now. Please check the study guide for this topic.",
      );
      setAsked(true);
    },
  });

  // The tutor is gated; without it there is no button at all rather than a
  // button that does nothing.
  if (!config?.flags.tutorEnabled) return null;

  const visible = INTENTS.filter((i) => !i.incorrectOnly || wasIncorrect);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) trackEvent("alexi_opened", { exam_type: category ?? null });
        if (!next) {
          setAnswer(null);
          setAsked(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-ask-alexi">
          <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {es ? `Pregúntale a ${named}` : `Ask ${named}`}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            {named}
          </DialogTitle>
          <DialogDescription>
            {es
              ? "Explicaciones basadas en el material aprobado de MyEasyPass."
              : "Explanations grounded in approved MyEasyPass material."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {visible.map((intent) => (
            <Button
              key={intent.key}
              variant="outline"
              className="h-auto justify-start whitespace-normal py-2.5 text-left"
              disabled={ask.isPending}
              onClick={() => {
                trackEvent("alexi_tutor_question", {
                  exam_type: category ?? null,
                  intent: intent.key,
                });
                ask.mutate(intent.key);
              }}
              data-testid={`button-intent-${intent.key}`}
            >
              <MessageCircleQuestion
                className="mr-2 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {es ? intent.es : intent.en}
            </Button>
          ))}
        </div>

        {ask.isPending && (
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm text-muted-foreground">
              {es ? `${named} está pensando…` : `${named} is thinking…`}
            </p>
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {answer && !ask.isPending && (
          <div className="rounded-md border bg-muted/40 p-3" aria-live="polite">
            <p className="whitespace-pre-wrap text-sm" data-testid="text-alexi-answer">
              {answer}
            </p>
            {asked && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                disabled={ask.isPending}
                onClick={() => ask.mutate("explain_more")}
                data-testid="button-explain-more"
              >
                {es ? "Explícame más" : "Explain more"}
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {es
            ? "Material educativo de MyEasyPass. No es asesoría legal ni está afiliado a TREC, TDI o Pearson VUE."
            : "MyEasyPass educational material. Not legal advice, and not affiliated with or endorsed by TREC, TDI or Pearson VUE."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
