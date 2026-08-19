import { useLocation } from "wouter";
import { ExamLandingPage } from "@/components/exam-landing-template";
import NotFound from "@/pages/not-found";
import SpanishInsuranceCategoryPage from "@/pages/spanish-insurance-category";
import { SpanishConceptHub, SpanishConceptPage } from "@/pages/spanish-concepts";

const CATEGORY_ROUTES = {
  "/es/preparacion-examen-seguros-propiedad-accidentes-texas": "propiedad-accidentes",
  "/es/preparacion-examen-seguros-vida-texas": "vida",
  "/es/preparacion-examen-seguros-lineas-generales-texas": "lineas-generales",
} as const;

const CONCEPT_ROUTES = {
  "/es/concepto-deducible-texas": "deducible",
  "/es/concepto-indemnizacion-texas": "indemnizacion",
  "/es/concepto-subrogacion-texas": "subrogacion",
  "/es/concepto-prima-texas": "prima",
  "/es/concepto-beneficiario-texas": "beneficiario",
  "/es/concepto-periodo-de-gracia-texas": "periodo-de-gracia",
  "/es/concepto-agencia-texas": "agencia",
  "/es/concepto-escritura-vs-titulo-texas": "escritura-vs-titulo",
} as const;

export default function TexasInsuranceExamPrepEsPage() {
  const [location] = useLocation();

  if (location === "/es/preparacion-examen-seguros-texas") {
    return <ExamLandingPage slug="preparacion-examen-seguros-texas" />;
  }

  if (location === "/es/conceptos-seguros-texas") {
    return <SpanishConceptHub kind="seguros" />;
  }

  if (location === "/es/conceptos-bienes-raices-texas") {
    return <SpanishConceptHub kind="bienes-raices" />;
  }

  const conceptSlug = CONCEPT_ROUTES[location as keyof typeof CONCEPT_ROUTES];
  if (conceptSlug) {
    return <SpanishConceptPage conceptSlug={conceptSlug} />;
  }

  const kind = CATEGORY_ROUTES[location as keyof typeof CATEGORY_ROUTES];
  if (kind) {
    return <SpanishInsuranceCategoryPage kind={kind} />;
  }

  return <NotFound />;
}
