import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";
import logoImage from "@assets/EP_logo_1768576610105.png";

export function Footer() {
  const { t } = useTranslation();
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });
  const isAdmin = profile?.role === "admin";

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoImage} alt="MyEasyPass" className="h-12 object-contain" />
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
              {isAdmin && (
                <li>
                  <Link href="/admin">
                    <span className="hover:text-primary transition-colors" data-testid="link-admin">
                      {t("nav.admin")}
                    </span>
                  </Link>
                </li>
              )}
              <li>
                <a
                  href="https://time-keeper-tnb8.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  data-testid="link-time-clock"
                >
                  {t("nav.timeClock")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("footer.examCategories")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/exams">
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    {t("categories.real_estate")}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/exams">
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    {t("categories.property_casualty")}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/exams">
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    {t("categories.life_insurance")}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/exams">
                  <span className="hover:text-primary cursor-pointer transition-colors">
                    {t("categories.general_lines")}
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("footer.contact")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Support@LBSconnect.net</li>
              <li>281-836-5357</li>
              <li>616 FM 1960 RD W STE 101</li>
              <li>Houston, TX 77090-3048</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">{t("footer.copyright")}</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms">
              <span className="cursor-pointer hover:text-primary transition-colors" data-testid="link-terms">
                {t("footer.terms")}
              </span>
            </Link>
            <Link href="/privacy">
              <span className="cursor-pointer hover:text-primary transition-colors" data-testid="link-privacy">
                {t("footer.privacy")}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
