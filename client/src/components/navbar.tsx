import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, User, LogOut, Settings, LayoutDashboard } from "lucide-react";
import logoImage from "@assets/EP_logo_1768576610105.png";
import { useState } from "react";

export function Navbar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keep primary discovery routes visible while leaving account actions and
  // secondary conversion links to the CTA area/footer.
  const navLinks = [
    { href: "/", label: t("nav.home"), show: true },
    { href: "/exams", label: t("nav.exams"), show: true },
    { href: "/free/study-resources", label: "Free Study Resources", show: true },
    { href: "/study-guide", label: t("nav.studyGuide"), show: isAuthenticated },
    { href: "/faq", label: t("nav.faq"), show: true },
    { href: "/profile", label: t("nav.profile"), show: isAuthenticated },
  ];

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <img src={logoImage} alt="MyEasyPass" className="h-10 w-auto object-contain" width={996} height={301} />
        </Link>

        <div className="hidden lg:flex items-center gap-4 xl:gap-6">
          {navLinks
            .filter((link) => link.show)
            .map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-primary ${
                    location === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`link-nav-${link.href.replaceAll("/", "-").replace(/^-/, "") || "home"}`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />

          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : !isAuthenticated ? (
            <>
              <Button
                size="sm"
                asChild
                className="gap-1"
                data-testid="cta-header-start"
                data-analytics="header-cta-start"
              >
                <Link href="/signup">
                  <span className="hidden sm:inline">
                    {t("nav.startPracticing", "Start Practicing")}
                  </span>
                  <span className="sm:hidden">{t("nav.start", "Start")}</span>
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="hidden sm:flex"
                data-testid="link-nav-login"
              >
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.profileImageUrl || undefined}
                      alt={user?.firstName || "User"}
                    />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <Link href="/dashboard">
                  <DropdownMenuItem data-testid="menu-item-dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                </Link>
                <Link href="/profile">
                  <DropdownMenuItem data-testid="menu-item-profile">
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.profile")}
                  </DropdownMenuItem>
                </Link>
                <Link href="/profile">
                  <DropdownMenuItem data-testid="menu-item-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" data-testid="menu-item-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.logout")}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={logoImage} alt="MyEasyPass" className="h-10 w-auto object-contain" width={996} height={301} />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {navLinks
                  .filter((link) => link.show)
                  .map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span
                        className={`block py-2 text-lg font-medium ${
                          location === link.href
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ))}
                {!isAuthenticated && (
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
                    <Button
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="cta-mobile-start"
                      data-analytics="mobile-cta-start"
                    >
                      <Link href="/signup">{t("nav.startPracticing", "Start Practicing")}</Link>
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/login">{t("nav.login")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
