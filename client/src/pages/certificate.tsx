import { useTranslation } from "react-i18next";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Award, Share2, Copy, CheckCircle, Home, FileText, ExternalLink } from "lucide-react";
import { SiLinkedin, SiX, SiFacebook } from "react-icons/si";
import { format } from "date-fns";
import { parseDate } from "@shared/safeDate";
import { Link } from "wouter";
import { examVisual } from "@/lib/examVisuals";
import { useSEO, buildUrl } from "@/hooks/use-seo";

interface CertificateData {
  id: string;
  recipientName: string;
  category: string;
  score: number;
  completedAt: string;
  slug: string;
}

export default function CertificatePage() {
  const { t, i18n } = useTranslation();
  const [match, params] = useRoute("/certificates/:slug");
  const { toast } = useToast();
  const slug = params?.slug;
  const language = i18n.language as "en" | "es";

  const { data: certificate, isLoading, error } = useQuery<CertificateData>({
    queryKey: ["/api/certificates/public", slug],
    queryFn: async () => {
      const response = await fetch(`/api/certificates/public/${slug}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to fetch certificate");
      }
      return response.json();
    },
    enabled: !!slug,
  });

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/certificates/${slug}`
    : "";

  const categoryLabel = certificate
    ? t(`categories.${certificate.category}`, certificate.category)
    : "";

  useSEO({
    title: certificate
      ? (language === "es"
          ? `Certificado de ${categoryLabel} — ${certificate.recipientName} | MyEasyPass`
          : `${categoryLabel} Exam Certificate — ${certificate.recipientName} | MyEasyPass`)
      : "Exam Certificate | MyEasyPass",
    description: certificate
      ? (language === "es"
          ? `${certificate.recipientName} aprobó el examen de práctica de ${categoryLabel} con una puntuación del ${certificate.score}% en MyEasyPass.`
          : `${certificate.recipientName} passed the ${categoryLabel} practice exam with a score of ${certificate.score}% on MyEasyPass.`)
      : "View this Texas licensing exam practice certificate from MyEasyPass.",
    canonicalUrl: slug ? buildUrl(`/certificates/${slug}`) : buildUrl("/"),
    ogImage: buildUrl("/og-image.png"),
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: language === "es" ? "Enlace copiado" : "Link copied",
        description: language === "es" 
          ? "El enlace del certificado ha sido copiado al portapapeles"
          : "Certificate link has been copied to clipboard",
      });
    } catch {
      toast({
        title: language === "es" ? "Error" : "Error",
        description: language === "es" 
          ? "No se pudo copiar el enlace"
          : "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleShareLinkedIn = () => {
    const text = language === "es"
      ? `Acabo de aprobar mi examen de ${t(`categories.${certificate?.category}`, certificate?.category ?? "")} con una puntuación del ${certificate?.score}%!`
      : `I just passed my ${t(`categories.${certificate?.category}`, certificate?.category ?? "")} exam with a score of ${certificate?.score}%!`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const handleShareTwitter = () => {
    const text = language === "es"
      ? `Acabo de aprobar mi examen de ${t(`categories.${certificate?.category}`, certificate?.category ?? "")} con una puntuación del ${certificate?.score}%! #TexasLicense #ExamPass`
      : `I just passed my ${t(`categories.${certificate?.category}`, certificate?.category ?? "")} exam with a score of ${certificate?.score}%! #TexasLicense #ExamPass`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="space-y-6 text-center">
                <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-2/3 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold mb-2">
                {language === "es" ? "Certificado no encontrado" : "Certificate Not Found"}
              </h1>
              <p className="text-muted-foreground mb-6">
                {language === "es" 
                  ? "Este certificado no existe o ha sido revocado."
                  : "This certificate does not exist or has been revoked."}
              </p>
              <Link href="/">
                <Button data-testid="button-go-home">
                  {language === "es" ? "Ir al inicio" : "Go to Home"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const certVisual = examVisual(certificate.category);
  const CategoryIcon = certVisual.icon;
  const categoryName = t(`categories.${certificate.category}`, certificate.category);
  const categoryGradient = certVisual.gradient;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl" data-testid="card-certificate">
          <div className={`bg-gradient-to-r ${categoryGradient} p-8 text-white`}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Award className="h-12 w-12" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
              {language === "es" ? "Certificado de Aprobación" : "Certificate of Achievement"}
            </h1>
            <p className="text-center text-white text-sm">
              MyEasyPass - Texas Licensing Exam Prep
            </p>
          </div>
          
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {language === "es" ? "Esto certifica que" : "This is to certify that"}
              </p>
              <h2 className="text-3xl font-bold text-foreground" data-testid="text-recipient-name">
                {certificate.recipientName}
              </h2>
              <p className="text-muted-foreground">
                {language === "es" 
                  ? "ha aprobado exitosamente el examen de práctica de"
                  : "has successfully passed the practice exam for"}
              </p>
              
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CategoryIcon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-2xl font-semibold text-foreground" data-testid="text-category">
                  {categoryName}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 py-4">
                <Badge variant="outline" className="text-lg px-4 py-2 gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span data-testid="text-score">{certificate.score}%</span>
                </Badge>
              </div>

              {/* date-fns format() throws a RangeError on an invalid Date,
                  which in a render unmounts the tree and blanks the page. Drop
                  the line rather than take the certificate down with it. */}
              {parseDate(certificate.completedAt) && (
                <p className="text-sm text-muted-foreground" data-testid="text-date">
                  {language === "es" ? "Fecha: " : "Date: "}
                  {format(parseDate(certificate.completedAt)!, "MMMM d, yyyy")}
                </p>
              )}
            </div>

            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>ID: {certificate.slug}</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              {language === "es" ? "Compartir certificado" : "Share Certificate"}
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={handleCopyLink}
                className="gap-2"
                data-testid="button-copy-link"
              >
                <Copy className="h-4 w-4" />
                {language === "es" ? "Copiar enlace" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={handleShareLinkedIn}
                className="gap-2"
                data-testid="button-share-linkedin"
              >
                <SiLinkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={handleShareTwitter}
                className="gap-2"
                data-testid="button-share-twitter"
              >
                <SiX className="h-4 w-4" />
                X
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={handleShareFacebook}
                className="gap-2"
                data-testid="button-share-facebook"
              >
                <SiFacebook className="h-4 w-4" />
                Facebook
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back-home">
              {language === "es" ? "Ir al inicio" : "Go to Home"}
            </Button>
          </Link>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
