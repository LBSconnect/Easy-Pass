/**
 * Ask Alexi about one question.
 *
 * The tutor is deliberately scoped to a single question the student has
 * already answered, and grounded only in that question's approved material.
 * That is the safety model, not a limitation to work around: a free-form chat
 * box would invite the assistant to state Texas insurance and real-estate
 * regulation from memory, and a confident wrong answer on a licensing exam is
 * worse than no answer.
 *
 * So the interface is a menu of intents plus an optional short follow-up, and
 * it always renders against a specific question.
 *
 * Three answer sources, all shown honestly:
 *   grounded - the assistant answered from the approved material
 *   fallback - the approved explanation verbatim (assistant off, rate limited,
 *              or not enough material to ground a generated answer)
 *   refused  - the request could not be grounded at all
 *
 * The panel is useful with the assistant switched off, because `fallback`
 * still returns the approved explanation. It is never hidden behind the AI
 * flag; only the branded framing is.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { AlexiMascot } from "@/components/alexi-mascot";
import { CircleHelp, Lightbulb, Brain, MessageSquareText } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { STUDY_ASSISTANT, useStudyAssistantConfig } from "@/lib/studyAssistant";

/** Mirrors TUTOR_INTENTS on the server. */
export type TutorIntent =
  | "explain_simply"
  | "why_wrong"
  | "why_correct"
  | "give_example"
  | "memory_trick"
  | "explain_more";

/** Mirrors MAX_STUDENT_MESSAGE_CHARS. The server enforces it; this only stops
 *  a student typing 900 characters and being told no afterwards. */
export const MAX_MESSAGE_CHARS = 400;

interface TutorResponse {
  answer: string;
  source: "grounded" | "fallback" | "refused";
}

const INTENTS: Array<{
  key: TutorIntent;
  icon: typeof CircleHelp;
  en: string;
  es: string;
  /** Only offered when we know the student got it wrong. */
  needsWrong?: boolean;
}> = [
  { key: "explain_simply", icon: Lightbulb, en: "Explain simply", es: "Explícalo simple" },
  { key: "why_wrong", icon: CircleHelp, en: "Why was I wrong?", es: "¿Por qué me equivoqué?", needsWrong: true },
  { key: "why_correct", icon: CircleHelp, en: "Why is that the answer?", es: "¿Por qué es esa la respuesta?" },
  { key: "give_example", icon: MessageSquareText, en: "Give me an example", es: "Dame un ejemplo" },
  { key: "memory_trick", icon: Brain, en: "Help me remember it", es: "Ayúdame a recordarlo" },
];

interface Props {
  questionId: string;
  /** Whether the student answered this one incorrectly. Gates "why was I wrong". */
  answeredIncorrectly?: boolean;
  /** Analytics context only. */
  topic?: string | null;
}

export function AskAlexi({ questionId, answeredIncorrectly = false, topic }: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const { data: config } = useStudyAssistantConfig();
  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;

  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<TutorResponse | null>(null);

  const ask = useMutation<TutorResponse, Error, TutorIntent>({
    mutationFn: async (intent) => {
      const res = await apiRequest("POST", "/api/alexi/tutor", {
        questionId,
        intent,
        // Empty string is not "no message" to a validator, so send undefined.
        message: message.trim() ? message.trim().slice(0, MAX_MESSAGE_CHARS) : undefined,
      });
      return res.json();
    },
    onSuccess: (data, intent) => {
      setAnswer(data);
      trackEvent("ask_alexi_clicked", { intent, source: data.source, topic: topic ?? null });
    },
  });

  const intents = INTENTS.filter((i) => !i.needsWrong || answeredIncorrectly);

  return (
    <div
      // Branded rather than a grey utility box: this is the one place a
      // student can ask a question, and it was disappearing into the card
      // behind it.
      className="mt-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.09] to-primary/[0.03] p-4 shadow-sm"
      data-testid="panel-ask-alexi"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-background p-1 shadow-sm">
          <AlexiMascot size={34} waving={false} sparkles={false} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-primary">
            {es ? `Pregúntale a ${named}` : `Ask ${named}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {es
              ? "Explicaciones sobre esta pregunta, al instante"
              : "Instant explanations about this question"}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {intents.map((i) => (
          <Button
            key={i.key}
            size="sm"
            variant="outline"
            disabled={ask.isPending}
            onClick={() => ask.mutate(i.key)}
            className="border-primary/40 bg-background font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            data-testid={`button-ask-${i.key}`}
          >
            <i.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {es ? i.es : i.en}
          </Button>
        ))}
      </div>

      <div className="mt-3">
        <label
          htmlFor={`ask-msg-${questionId}`}
          className="text-xs text-muted-foreground"
        >
          {es
            ? "¿Algo específico? (opcional)"
            : "Anything specific you want to know? (optional)"}
        </label>
        <Textarea
          id={`ask-msg-${questionId}`}
          value={message}
          maxLength={MAX_MESSAGE_CHARS}
          rows={2}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            es
              ? "Ej.: no entiendo la diferencia entre las opciones B y C"
              : "e.g. I don't get the difference between options B and C"
          }
          className="mt-1.5 bg-background text-sm"
          data-testid="input-ask-message"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">
          {message.length}/{MAX_MESSAGE_CHARS}
        </p>
      </div>

      {ask.isPending && (
        <p
          className="mt-3.5 flex items-center gap-2 text-sm font-medium text-primary"
          data-testid="text-ask-pending"
        >
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
          {es ? `${named} está pensando…` : `${named} is thinking…`}
        </p>
      )}

      {ask.isError && (
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-ask-error">
          {es
            ? "No pudimos obtener una respuesta ahora mismo. Inténtalo de nuevo."
            : "We couldn't get an answer just now. Please try again."}
        </p>
      )}

      {answer && !ask.isPending && (
        // aria-live so a screen-reader user hears the answer arrive rather than
        // having to go looking for it.
        <div
          className="mt-3.5 rounded-lg border-l-4 border-l-primary border-y border-r bg-background p-3.5 shadow-sm"
          role="status"
          aria-live="polite"
          data-testid="text-ask-answer"
        >
          <p className="whitespace-pre-line text-sm leading-relaxed">{answer.answer}</p>

          {/* Where the answer came from is stated, never implied. A student
              deciding how much to trust it deserves to know. */}
          <Badge
            variant="secondary"
            className="mt-3 border-primary/25 bg-primary/10 text-xs text-primary"
            data-testid={`badge-source-${answer.source}`}
          >
            {answer.source === "grounded"
              ? es ? "Basado en tu material aprobado" : "Based on your approved study material"
              : answer.source === "fallback"
                ? es ? "Explicación oficial de la pregunta" : "The question's official explanation"
                : es ? "Sin información suficiente" : "Not enough approved information"}
          </Badge>
        </div>
      )}
    </div>
  );
}
