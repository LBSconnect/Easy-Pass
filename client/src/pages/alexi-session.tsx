/**
 * The Alexi session runner.
 *
 * Alexi has always described a session - "3-minute review, 8 flashcards, 12
 * targeted questions" - and Start dropped the student on the generic study
 * guide or exams page. The session was named, then never run. This page runs
 * it.
 *
 * One block at a time, in the order the engine chose, with a progress rail
 * across the top so the student can see the shape of what they agreed to.
 * Answers post as they are given, so a student who stops halfway keeps credit
 * for the questions they did answer.
 *
 * Every block renders material the server resolved from the approved question
 * bank. Nothing here is generated on the page.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearch } from "wouter";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlexiMascot } from "@/components/alexi-mascot";
import { AskAlexi } from "@/components/alexi/ask-alexi";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowRight, CircleCheck, CircleX, Eye, GraduationCap, Layers, RotateCcw, Target,
  ClipboardCheck, PartyPopper,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { STUDY_ASSISTANT, useStudyAssistantConfig, modeLabel, modeHint, type LearningMode } from "@/lib/studyAssistant";
import type { ExamCategory } from "@shared/schema";

/* ------------------------------------------------------------------ */
/* Server payloads                                                     */

interface TeachExample {
  questionId: string;
  topic: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
interface Flashcard {
  questionId: string;
  topic: string;
  front: string;
  back: string;
}
interface PracticeQuestion {
  questionId: string;
  topic: string;
  questionText: string;
  options: string[];
}
interface ReviewItem extends PracticeQuestion {
  correctIndex: number;
  explanation: string | null;
}

type Block =
  | { mode: "teach"; label: string; estimatedMinutes: number; keyPoints: string[]; examples: TeachExample[] }
  | { mode: "flashcards"; label: string; estimatedMinutes: number; cards: Flashcard[] }
  | { mode: "practice" | "scenarios"; label: string; estimatedMinutes: number; questions: PracticeQuestion[] }
  | { mode: "review"; label: string; estimatedMinutes: number; items: ReviewItem[] }
  | { mode: "mock_exam"; label: string; estimatedMinutes: number };

interface SessionPayload {
  sessionId: string;
  category: ExamCategory;
  headline: string;
  phrasing: string;
  concept: { conceptId: string; label: string; mastery: number } | null;
  estimatedMinutes: number;
  blocks: Block[];
}

interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
}

const BLOCK_ICON: Record<LearningMode, typeof Target> = {
  teach: GraduationCap,
  flashcards: Layers,
  practice: Target,
  scenarios: Target,
  review: RotateCcw,
  mock_exam: ClipboardCheck,
};

/* ------------------------------------------------------------------ */

export default function AlexiSessionPage() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const params = useParams<{ category: string }>();
  const search = useSearch();
  const { data: config } = useStudyAssistantConfig();
  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;

  const category = params.category as ExamCategory;
  const minutes = Number.parseInt(new URLSearchParams(search).get("minutes") ?? "", 10);

  const [session, setSession] = useState<SessionPayload | null>(null);
  const [blockIndex, setBlockIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerResult>>({});
  const [failed, setFailed] = useState<string | null>(null);

  // Starting a session writes a row, so it is a mutation rather than a query -
  // a query would re-run on refocus and quietly create sessions.
  const start = useMutation<SessionPayload>({
    mutationFn: async () => {
      const q = Number.isFinite(minutes) ? `?minutes=${minutes}` : "";
      const res = await apiRequest("POST", `/api/alexi/session/${category}${q}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      // Validate at the boundary rather than at each consumer. A 200 whose
      // body is missing `blocks` used to reach `.length` and throw mid-render;
      // failing here routes it to the "couldn't prepare your session" screen.
      if (!body?.sessionId || !Array.isArray(body.blocks)) {
        throw new Error("malformed");
      }
      return body as SessionPayload;
    },
    onSuccess: (data) => {
      setSession(data);
      trackEvent("alexi_recommendation_started", {
        exam_type: category,
        blocks: data.blocks.length,
      });
    },
    onError: (err: Error) => setFailed(err.message),
  });

  useEffect(() => {
    if (!category) return;
    start.mutate();
    // Starting once per category is the whole intent; re-running on every
    // render of the mutation object would create a session per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const answer = useMutation<AnswerResult, Error, { questionId: string; answerIndex: number }>({
    mutationFn: async ({ questionId, answerIndex }) => {
      const res = await apiRequest("POST", `/api/alexi/session/${session!.sessionId}/answer`, {
        questionId,
        answerIndex,
      });
      return res.json();
    },
    onSuccess: (result, vars) => {
      setAnswers((prev) => ({ ...prev, [vars.questionId]: result }));
    },
  });

  const blocks = session?.blocks ?? [];
  const current = blocks[blockIndex] ?? null;
  const finished = Boolean(session) && blockIndex >= blocks.length;

  // Score across every question actually answered in this session.
  const tally = useMemo(() => {
    const values = Object.values(answers);
    return { total: values.length, correct: values.filter((a) => a.isCorrect).length };
  }, [answers]);

  // Mastery and readiness move as the session is answered, so anything showing
  // them is stale by the time the student lands back on the dashboard.
  useEffect(() => {
    if (!finished) return;
    queryClient.invalidateQueries({ queryKey: [`/api/readiness/${category}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/mastery/${category}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/study-plan/${category}`] });
  }, [finished, category]);

  const advance = () => setBlockIndex((i) => i + 1);

  /* ---------------------------------------------------------------- */

  if (start.isPending || (!session && !failed)) {
    return (
      <PageShell width="content">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-4 h-64 w-full" />
      </PageShell>
    );
  }

  if (failed || !session) {
    const forbidden = failed === "403";
    return (
      <PageShell width="content">
        <PageHeader title={named} subtitle={es ? "Sesión de estudio" : "Study session"} icon={GraduationCap} />
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {forbidden
                ? es
                  ? "Tu suscripción no cubre este examen todavía."
                  : "Your subscription doesn't cover this exam yet."
                : es
                  ? "No pudimos preparar tu sesión ahora mismo."
                  : "We couldn't prepare your session just now."}
            </p>
            <Button asChild className="mt-4" data-testid="button-session-back">
              <Link href={forbidden ? "/pricing" : "/dashboard"}>
                {forbidden
                  ? es ? "Ver planes" : "View plans"
                  : es ? "Volver al panel" : "Back to dashboard"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell width="content">
      <PageHeader
        title={session.headline}
        subtitle={session.phrasing}
        icon={GraduationCap}
      />

      {/* Alexi introduces the session in their own voice, and says what the
          steps involve.
          
          Two problems this solves. The page opened on a generic mortarboard
          icon, so the one screen that is meant to feel like being taught by
          Alexi was the one place Alexi did not appear. And the block names
          along the rail - "Mixed review", "Applied scenarios" - are headings,
          not explanations: a student had agreed to a session without being
          told what any of it involved. */}
      <Card className="mt-5 border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent" data-testid="session-intro">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <span className="inline-flex shrink-0 items-center justify-center self-start rounded-full bg-background p-1.5 shadow-sm">
            <AlexiMascot size={56} waving={false} sparkles={false} animated />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">
              {es
                ? `${named} te acompaña en esta sesión`
                : `${named} is walking you through this session`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {es
                ? `${blocks.length} ${blocks.length === 1 ? "paso" : "pasos"}, unos ${session.estimatedMinutes} minutos. Puedes parar cuando quieras: cada respuesta se guarda al darla.`
                : `${blocks.length} ${blocks.length === 1 ? "step" : "steps"}, about ${session.estimatedMinutes} minutes. You can stop whenever you like — every answer is saved as you give it.`}
            </p>

            <ul className="mt-3 space-y-1.5" data-testid="session-steps">
              {blocks.map((b, i) => {
                const Icon = BLOCK_ICON[b.mode];
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Icon
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{modeLabel(b.mode, es)}</span>
                      <span className="text-muted-foreground"> — {modeHint(b.mode, es)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Progress rail. The student can see how many steps remain, which is
          the difference between a session and an open-ended list. */}
      <div className="mt-5" data-testid="session-progress">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">
            {finished
              ? es ? "Sesión completa" : "Session complete"
              : `${es ? "Paso" : "Step"} ${blockIndex + 1} ${es ? "de" : "of"} ${blocks.length}`}
          </span>
          <span className="text-muted-foreground">
            {session.estimatedMinutes} {es ? "min" : "min"}
          </span>
        </div>
        <Progress
          value={(Math.min(blockIndex, blocks.length) / Math.max(1, blocks.length)) * 100}
          className="mt-2 h-2"
          aria-label={es ? "Progreso de la sesión" : "Session progress"}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {blocks.map((b, i) => {
            const Icon = BLOCK_ICON[b.mode];
            const done = i < blockIndex;
            return (
              <Badge
                key={i}
                variant={i === blockIndex ? "default" : "secondary"}
                className={done ? "opacity-60" : undefined}
              >
                <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
                {modeLabel(b.mode, es)}
              </Badge>
            );
          })}
        </div>
      </div>

      {finished ? (
        <SessionSummary
          es={es}
          named={named}
          category={category}
          correct={tally.correct}
          total={tally.total}
        />
      ) : current ? (
        <div className="mt-6">
          {current.mode === "teach" && (
            <TeachStep es={es} block={current} onDone={advance} />
          )}
          {current.mode === "flashcards" && (
            <FlashcardStep es={es} block={current} onDone={advance} />
          )}
          {(current.mode === "practice" || current.mode === "scenarios") && (
            <PracticeStep
              es={es}
              block={current}
              answers={answers}
              pending={answer.isPending}
              onAnswer={(questionId, answerIndex) => answer.mutate({ questionId, answerIndex })}
              onDone={advance}
            />
          )}
          {current.mode === "review" && (
            <ReviewStep es={es} block={current} onDone={advance} />
          )}
          {current.mode === "mock_exam" && (
            <MockExamStep es={es} block={current} category={category} onSkip={advance} />
          )}
        </div>
      ) : null}
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */

function StepCard({
  icon: Icon,
  title,
  hint,
  children,
  testId,
}: {
  icon: typeof Target;
  title: string;
  hint?: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Worked examples with their approved explanations. Nothing generated. */
function TeachStep({
  es,
  block,
  onDone,
}: {
  es: boolean;
  block: Extract<Block, { mode: "teach" }>;
  onDone: () => void;
}) {
  return (
    <StepCard
      icon={GraduationCap}
      title={block.label}
      hint={es ? "Puntos clave y ejemplos resueltos" : "Key points, then worked examples"}
      testId="step-teach"
    >
      {/* Every line here comes from approved material for this concept -
          either editorial copy in the study-topic config or the explanations
          already attached to its questions. Nothing on this page is written
          at render time. */}
      {block.keyPoints.length > 0 && (
        <div className="mt-4 rounded-lg border border-primary/25 bg-primary/[0.05] p-4" data-testid="list-key-points">
          <p className="text-sm font-semibold text-primary">
            {es ? "Lo esencial" : "The essentials"}
          </p>
          <ul className="mt-2.5 space-y-2">
            {block.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {block.examples.length > 0 && (
        <p className="mt-5 text-sm font-medium">
          {es ? "Ejemplos resueltos" : "Worked examples"}
        </p>
      )}
      <ol className="mt-3 space-y-5">
        {block.examples.map((e, i) => (
          <li key={e.questionId} className="rounded-lg border p-4">
            <Badge variant="secondary" className="text-xs">{e.topic}</Badge>
            <p className="mt-2 text-sm font-medium">{e.questionText}</p>
            <p className="mt-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {es ? "Respuesta: " : "Answer: "}
              </span>
              {e.options[e.correctIndex]}
            </p>
            <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
              {e.explanation}
            </p>
            {/* The tutor's precondition is an answered question. These are
                shown, not answered, so no ask panel here - it would refuse. */}
            <span className="sr-only">{`${i + 1}`}</span>
          </li>
        ))}
      </ol>

      <Button className="mt-5 w-full sm:w-auto" onClick={onDone} data-testid="button-step-done">
        {es ? "Entendido, continuar" : "Got it, continue"}
        <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
      </Button>
    </StepCard>
  );
}

function FlashcardStep({
  es,
  block,
  onDone,
}: {
  es: boolean;
  block: Extract<Block, { mode: "flashcards" }>;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = block.cards[index];

  const next = () => {
    setRevealed(false);
    if (index + 1 >= block.cards.length) onDone();
    else setIndex((i) => i + 1);
  };

  if (!card) return null;

  return (
    <StepCard
      icon={Layers}
      title={block.label}
      hint={`${index + 1} / ${block.cards.length}`}
      testId="step-flashcards"
    >
      <div className="mt-4 rounded-lg border p-5">
        <Badge variant="secondary" className="text-xs">{card.topic}</Badge>
        <p className="mt-3 text-base font-medium" data-testid="text-session-card-front">
          {card.front}
        </p>

        {revealed ? (
          <p
            className="mt-4 whitespace-pre-line border-t pt-4 text-sm"
            data-testid="text-session-card-back"
          >
            {card.back}
          </p>
        ) : (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setRevealed(true)}
            data-testid="button-session-reveal"
          >
            <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {es ? "Mostrar respuesta" : "Show answer"}
          </Button>
        )}
      </div>

      {revealed && (
        <Button className="mt-5 w-full sm:w-auto" onClick={next} data-testid="button-step-done">
          {index + 1 >= block.cards.length
            ? es ? "Siguiente paso" : "Next step"
            : es ? "Siguiente tarjeta" : "Next card"}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </StepCard>
  );
}

function PracticeStep({
  es,
  block,
  answers,
  pending,
  onAnswer,
  onDone,
}: {
  es: boolean;
  block: Extract<Block, { mode: "practice" | "scenarios" }>;
  answers: Record<string, AnswerResult>;
  pending: boolean;
  onAnswer: (questionId: string, answerIndex: number) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const question = block.questions[index];
  const result = question ? answers[question.questionId] : undefined;

  const next = () => {
    setPicked(null);
    if (index + 1 >= block.questions.length) onDone();
    else setIndex((i) => i + 1);
  };

  if (!question) return null;

  return (
    <StepCard
      icon={Target}
      title={block.label}
      hint={`${index + 1} / ${block.questions.length}`}
      testId="step-practice"
    >
      <Badge variant="secondary" className="mt-4 text-xs">{question.topic}</Badge>
      <p className="mt-2 text-base font-medium" data-testid="text-session-question">
        {question.questionText}
      </p>

      <ul className="mt-4 space-y-2" role="radiogroup" aria-label={es ? "Opciones" : "Options"}>
        {question.options.map((option, i) => {
          const isPicked = picked === i;
          const isCorrect = result && i === result.correctIndex;
          const isWrongPick = result && isPicked && !result.isCorrect;

          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={Boolean(result) || pending}
                onClick={() => {
                  setPicked(i);
                  onAnswer(question.questionId, i);
                }}
                className={`flex min-h-11 w-full items-start gap-2.5 rounded-md border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isCorrect
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : isWrongPick
                      ? "border-rose-500/50 bg-rose-500/10"
                      : "hover:bg-muted/60"
                }`}
                data-testid={`button-session-option-${i}`}
              >
                {/* Result is stated in words and icon, never colour alone. */}
                {isCorrect && (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                )}
                {isWrongPick && (
                  <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                )}
                <span className="min-w-0">{option}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {result && (
        <div role="status" aria-live="polite">
          <p className="mt-4 text-sm font-semibold" data-testid="text-session-verdict">
            {result.isCorrect
              ? es ? "Correcto" : "Correct"
              : es ? "Incorrecto" : "Not quite"}
          </p>
          {result.explanation && (
            <p className="mt-1.5 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
              {result.explanation}
            </p>
          )}

          {/* The student has now answered this question, which is exactly the
              tutor's precondition, so the ask panel works here. */}
          <AskAlexi
            questionId={question.questionId}
            answeredIncorrectly={!result.isCorrect}
            topic={question.topic}
          />

          <Button className="mt-5 w-full sm:w-auto" onClick={next} data-testid="button-step-done">
            {index + 1 >= block.questions.length
              ? es ? "Siguiente paso" : "Next step"
              : es ? "Siguiente pregunta" : "Next question"}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}

function ReviewStep({
  es,
  block,
  onDone,
}: {
  es: boolean;
  block: Extract<Block, { mode: "review" }>;
  onDone: () => void;
}) {
  return (
    <StepCard
      icon={RotateCcw}
      title={block.label}
      hint={es ? "Preguntas que fallaste antes" : "Questions you got wrong before"}
      testId="step-review"
    >
      <ul className="mt-4 space-y-4">
        {block.items.map((item) => (
          <li key={item.questionId} className="rounded-lg border p-4">
            <Badge variant="secondary" className="text-xs">{item.topic}</Badge>
            <p className="mt-2 text-sm font-medium">{item.questionText}</p>
            <p className="mt-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {es ? "Respuesta correcta: " : "Correct answer: "}
              </span>
              {item.options[item.correctIndex]}
            </p>
            {item.explanation && (
              <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                {item.explanation}
              </p>
            )}
            <AskAlexi questionId={item.questionId} answeredIncorrectly topic={item.topic} />
          </li>
        ))}
      </ul>

      <Button className="mt-5 w-full sm:w-auto" onClick={onDone} data-testid="button-step-done">
        {es ? "Siguiente paso" : "Next step"}
        <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
      </Button>
    </StepCard>
  );
}

/**
 * A mock exam is its own screen with its own timing rules. Burying a full
 * timed paper inside a fifteen-minute session would misrepresent what the
 * student is starting, so this step hands them over deliberately.
 */
function MockExamStep({
  es,
  block,
  category,
  onSkip,
}: {
  es: boolean;
  block: Extract<Block, { mode: "mock_exam" }>;
  category: ExamCategory;
  onSkip: () => void;
}) {
  return (
    <StepCard
      icon={ClipboardCheck}
      title={block.label}
      hint={es ? "Se abre como examen cronometrado" : "Opens as a timed exam"}
      testId="step-mock-exam"
    >
      <p className="mt-4 text-sm text-muted-foreground">
        {es
          ? `Esto es un examen completo bajo condiciones reales, de unos ${block.estimatedMinutes} minutos. Se abre en su propia pantalla.`
          : `This is a full paper under real conditions, about ${block.estimatedMinutes} minutes. It opens on its own screen.`}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild data-testid="button-session-mock">
          <Link
            href={`/exams/${category}?mode=full`}
            onClick={() => trackEvent("mock_exam_clicked", { exam_type: category })}
          >
            {es ? "Comenzar examen simulado" : "Start mock exam"}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button variant="outline" onClick={onSkip} data-testid="button-step-done">
          {es ? "Ahora no" : "Not now"}
        </Button>
      </div>
    </StepCard>
  );
}

function SessionSummary({
  es,
  named,
  category,
  correct,
  total,
}: {
  es: boolean;
  named: string;
  category: ExamCategory;
  correct: number;
  total: number;
}) {
  return (
    <Card className="mt-6 border-primary/25 bg-primary/[0.04]" data-testid="card-session-summary">
      <CardContent className="flex flex-col items-center p-6 text-center md:p-8">
        <AlexiMascot size={96} />
        <h2 className="mt-3 flex items-center gap-2 text-xl font-bold">
          <PartyPopper className="h-5 w-5 text-primary" aria-hidden="true" />
          {es ? "Sesión completa" : "Session complete"}
        </h2>

        {total > 0 ? (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-session-score">
            {es
              ? `Acertaste ${correct} de ${total} preguntas. Ya cuenta para tu Puntaje EasyPass.`
              : `You got ${correct} of ${total} questions right. It already counts towards your EasyPass Score.`}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {es
              ? "Repaso terminado. Practica algunas preguntas para mover tu puntaje."
              : "Review done. Answer some practice questions to move your score."}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild data-testid="button-session-next">
            <Link href="/study-assistant">
              {es ? `Ver qué sigue con ${named}` : `See what ${named} suggests next`}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-session-dashboard">
            <Link href="/dashboard">{es ? "Volver al panel" : "Back to dashboard"}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/exams/${category}`}>{es ? "Más práctica" : "More practice"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
