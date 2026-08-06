import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === "es";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="heading-not-found">
              {isSpanish ? "Página No Encontrada" : "Page Not Found"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isSpanish
                ? "La página que buscas no existe o ha sido movida."
                : "The page you're looking for doesn't exist or has been moved."}
            </p>
            <Button asChild data-testid="button-not-found-home">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                {isSpanish ? "Volver al Inicio" : "Back to Home"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
