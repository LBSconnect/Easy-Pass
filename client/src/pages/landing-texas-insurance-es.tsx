import { useLocation } from "wouter";
import { ExamLandingPage } from "@/components/exam-landing-template";
import NotFound from "@/pages/not-found";
import SpanishInsuranceCategoryPage from "@/pages/spanish-insurance-category";

const CATEGORY_ROUTES = {
  "/es/preparacion-examen-seguros-propiedad-accidentes-texas": "propiedad-accidentes",
  "/es/preparacion-examen-seguros-vida-texas": "vida",
  "/es/preparacion-examen-seguros-lineas-generales-texas": "lineas-generales",
} as const;

export default function TexasInsuranceExamPrepEsPage() {
  const [location] = useLocation();

  if (location === "/es/preparacion-examen-seguros-texas") {
    return <ExamLandingPage slug="preparacion-examen-seguros-texas" />;
  }

  const kind = CATEGORY_ROUTES[location as keyof typeof CATEGORY_ROUTES];
  if (kind) {
    return <SpanishInsuranceCategoryPage kind={kind} />;
  }

  return <NotFound />;
}
