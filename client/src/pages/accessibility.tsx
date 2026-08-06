import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function AccessibilityPage() {
  useSEO({
    title: "Accessibility Statement | MyEasyPass",
    description: "MyEasyPass's commitment to digital accessibility, the standards followed, and how to report accessibility issues on this site.",
    canonicalUrl: buildUrl("/accessibility"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-accessibility">
          Accessibility Statement
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <p className="text-muted-foreground">
              Linton Business Solutions LLC is committed to making its websites, applications, digital products, and physical services reasonably accessible to people with disabilities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Our Goal</h2>
            <p className="text-muted-foreground">
              We aim to design and maintain digital experiences consistent with generally recognized accessibility practices, including relevant Web Content Accessibility Guidelines where reasonably applicable.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Measures</h2>
            <p className="text-muted-foreground">LBS may:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>use semantic page structure and keyboard-accessible controls;</li>
              <li>provide text alternatives for meaningful images;</li>
              <li>maintain readable contrast and scalable text;</li>
              <li>label forms and identify validation errors;</li>
              <li>support screen-reader and keyboard navigation;</li>
              <li>review new features for accessibility;</li>
              <li>address reported barriers;</li>
              <li>provide reasonable alternative methods of receiving information or service.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Testing and Third-Party Content</h2>
            <p className="text-muted-foreground">
              Some content, embedded tools, payment pages, testing platforms, or third-party services may be controlled by others. LBS will make reasonable efforts to select accessible providers and to help users identify available alternatives.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Physical Accommodations</h2>
            <p className="text-muted-foreground">
              Individuals needing an accommodation for a certification or licensing examination may be required to request approval through the applicable testing sponsor before scheduling. LBS cannot independently modify exam rules or approved accommodations.
            </p>
            <p className="text-muted-foreground">
              For other LBS services, contact us in advance when possible so we can discuss a reasonable accommodation.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Feedback</h2>
            <p className="text-muted-foreground">Please describe:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>the page, application, or service involved;</li>
              <li>the accessibility barrier;</li>
              <li>the device and assistive technology used, if relevant;</li>
              <li>the preferred way to receive a response.</li>
            </ul>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>Linton Business Solutions LLC</strong></li>
              <li>616 FM 1960 Road West, Suite 101</li>
              <li>Houston, Texas 77090-3048</li>
              <li>Phone: 281-836-5357</li>
              <li>Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a></li>
            </ul>
            <p className="text-muted-foreground">
              LBS does not retaliate against anyone who requests an accommodation or reports an accessibility concern.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
