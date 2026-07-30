import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function NoticeAtCollectionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-notice-at-collection">
          Notice at Collection
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <p className="text-muted-foreground">
              Linton Business Solutions LLC collects personal information to operate its websites, applications, consulting services, educational products, workforce platform, testing center, and business-center services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Categories Collected</h2>
            <p className="text-muted-foreground">
              Depending on the service, LBS may collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>identifiers and contact details</li>
              <li>account and authentication information</li>
              <li>transaction and subscription records</li>
              <li>internet, device, and usage information</li>
              <li>appointment and testing information</li>
              <li>practice-test answers, scores, and study progress</li>
              <li>employer, employee, timekeeping, scheduling, attendance, PTO, payroll-related, pay-stub, and communication information</li>
              <li>government-identification details used for testing or notary services</li>
              <li>photographs and customer documents</li>
              <li>consulting and project information</li>
              <li>customer communications and support records</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Purposes</h2>
            <p className="text-muted-foreground">
              We use information to provide and secure services, process payments and appointments, administer accounts and education tools, support workforce operations, comply with testing and notary requirements, communicate with customers, prevent fraud, improve products, and satisfy legal obligations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Disclosure</h2>
            <p className="text-muted-foreground">
              We may disclose information to service providers, payment processors, testing sponsors, professional advisers, government authorities, and others described in the Corporate Privacy Policy.
            </p>
            <p className="text-muted-foreground">
              LBS does not sell personal information for money.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Retention</h2>
            <p className="text-muted-foreground">
              We retain information only for appropriate operational, legal, contractual, security, and backup periods. Short-lived document-service files should be deleted promptly after completion.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Rights and Contact</h2>
            <p className="text-muted-foreground">
              Review the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> or contact:
            </p>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>Linton Business Solutions LLC</strong></li>
              <li>616 FM 1960 Road West, Suite 101</li>
              <li>Houston, Texas 77090-3048</li>
              <li>Phone: 281-836-5357</li>
              <li>Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a></li>
            </ul>
            <p className="text-muted-foreground">
              Use the subject line "Privacy Request."
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
