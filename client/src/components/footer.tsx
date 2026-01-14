import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{t("footer.company")}</span>
            </Link>
            <p className="text-sm text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/">
                  <span className="hover:text-primary transition-colors">{t("nav.home")}</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing">
                  <span className="hover:text-primary transition-colors">{t("nav.pricing")}</span>
                </Link>
              </li>
              <li>
                <Link href="/exams">
                  <span className="hover:text-primary transition-colors">{t("nav.exams")}</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("footer.examCategories")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-primary cursor-pointer transition-colors">
                  {t("categories.real_estate")}
                </span>
              </li>
              <li>
                <span className="hover:text-primary cursor-pointer transition-colors">
                  {t("categories.property_casualty")}
                </span>
              </li>
              <li>
                <span className="hover:text-primary cursor-pointer transition-colors">
                  {t("categories.life_insurance")}
                </span>
              </li>
              <li>
                <span className="hover:text-primary cursor-pointer transition-colors">
                  {t("categories.general_lines")}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("footer.contact")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@easypass.com</li>
              <li>1-800-EASYPASS</li>
              <li>Austin, Texas</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">{t("footer.copyright")}</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-primary transition-colors">
              {t("footer.terms")}
            </span>
            <span className="cursor-pointer hover:text-primary transition-colors">
              {t("footer.privacy")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
