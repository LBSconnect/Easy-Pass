/**
 * The glossary a student reads.
 *
 * Published terms only. Everything here was written by a person: the terms
 * can be surfaced from the question bank automatically, but what one means
 * in Texas insurance or real-estate law is a statement about law, and no part
 * of this app writes those.
 *
 * Both languages are shown together rather than switched between. A student
 * revising in Spanish still sits an exam written in English, so seeing the
 * English term beside its Spanish definition is the thing they actually need
 * - and a bilingual student gets to check one against the other.
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell, PageHeader } from "@/components/page-shell";
import { EXAM_VISUALS } from "@/lib/examVisuals";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { BookA, Search } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

interface GlossaryTerm {
  id: string;
  category: ExamCategory | null;
  termEn: string;
  termEs: string;
  definitionEn: string;
  definitionEs: string;
}

export default function GlossaryPage() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [query, setQuery] = useState("");

  useSEO({
    title: es ? "Glosario | MyEasyPass" : "Glossary | MyEasyPass",
    description: es
      ? "Términos clave de los exámenes de licencia de Texas, en inglés y español."
      : "Key terms from the Texas licensing exams, in English and Spanish.",
    canonicalUrl: buildUrl(es ? "/glossary?lang=es" : "/glossary"),
    hreflang: [
      { lang: "en", url: buildUrl("/glossary") },
      { lang: "es", url: buildUrl("/glossary?lang=es") },
      { lang: "x-default", url: buildUrl("/glossary") },
    ],
  });

  const { data, isLoading, isError } = useQuery<GlossaryTerm[]>({
    queryKey: ["/api/glossary"],
  });

  const terms = Array.isArray(data) ? data : [];

  // Search both languages at once, because someone who knows the Spanish word
  // and wants the English one is the case this page exists for.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return terms;
    return terms.filter((t) =>
      [t.termEn, t.termEs, t.definitionEn, t.definitionEs]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [terms, query]);

  return (
    <PageShell>
      <PageHeader
        icon={BookA}
        title={es ? "Glosario" : "Glossary"}
        subtitle={
          es
            ? "Términos que aparecen en los exámenes, en inglés y español."
            : "Terms that appear in the exams, in English and Spanish."
        }
      />

      <div className="relative mt-6">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={es ? "Buscar un término" : "Search for a term"}
          aria-label={es ? "Buscar un término" : "Search for a term"}
          className="pl-9"
          data-testid="input-glossary-search"
        />
      </div>

      {isLoading && (
        <div className="mt-4 space-y-3" data-testid="loading-glossary">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="mt-4" data-testid="card-glossary-error">
          <CardContent className="py-10 text-center text-muted-foreground">
            {es ? "No pudimos cargar el glosario." : "We couldn't load the glossary."}
          </CardContent>
        </Card>
      )}

      {/* An empty glossary is a normal state, not a failure: the terms are
          written by hand, so it stays empty until someone writes some. */}
      {!isLoading && !isError && terms.length === 0 && (
        <Card className="mt-4" data-testid="card-glossary-empty">
          <CardContent className="py-12 text-center">
            <BookA className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium">
              {es ? "El glosario aún está en preparación" : "The glossary is still being written"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {es
                ? "Vuelve pronto - los términos se añaden a medida que se revisan."
                : "Check back soon - terms are added as they are reviewed."}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && terms.length > 0 && matches.length === 0 && (
        <p className="mt-6 text-center text-muted-foreground" data-testid="text-no-matches">
          {es ? `Nada coincide con "${query}".` : `Nothing matches "${query}".`}
        </p>
      )}

      {matches.length > 0 && (
        <dl className="mt-4 space-y-3" data-testid="list-glossary">
          {matches.map((term) => {
            const visual = term.category ? EXAM_VISUALS[term.category] : null;
            return (
              <Card key={term.id} data-testid={`card-term-${term.id}`}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <dt className="text-base font-semibold">{term.termEn}</dt>
                    <span className="text-sm text-muted-foreground">{term.termEs}</span>
                    {visual && (
                      <Badge variant="outline" className={`ml-auto ${visual.tint}`}>
                        {term.category}
                      </Badge>
                    )}
                  </div>

                  {/* Both definitions, always. The exam is in English; the
                      student may be revising in Spanish. */}
                  <dd className="mt-2 space-y-2 text-sm">
                    <p>{term.definitionEn}</p>
                    <p className="text-muted-foreground" lang="es">
                      {term.definitionEs}
                    </p>
                  </dd>
                </CardContent>
              </Card>
            );
          })}
        </dl>
      )}
    </PageShell>
  );
}
