import { LegalPage } from "@/components/legal-page";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function CopyrightDmcaPage() {
  useSEO({
    title: "Copyright and DMCA Policy | MyEasyPass",
    description: "Copyright and DMCA policy for MyEasyPass, including how to submit a copyright infringement notice or counter-notice.",
    canonicalUrl: buildUrl("/copyright-dmca"),
  });

  return (
    <LegalPage title="Copyright and DMCA Policy" testId="copyright-dmca">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. LBS Content</h2>
        <p className="text-muted-foreground">
          Unless otherwise stated, Linton Business Solutions LLC owns or licenses the websites, software, text, graphics, templates, prompts, courses, practice questions, explanations, videos, documentation, workflows, branding, and other content made available through its services.
        </p>
        <p className="text-muted-foreground">
          No content may be copied, scraped, republished, resold, distributed, publicly displayed, reverse engineered, or used to create a competing product except as expressly authorized.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Customer Content</h2>
        <p className="text-muted-foreground">
          Customers retain ownership of content they submit, subject to the limited rights required for LBS to host, process, transmit, reproduce, display, secure, back up, and deliver the requested service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Copyright Complaints</h2>
        <p className="text-muted-foreground">
          A copyright owner or authorized agent may send a notice identifying:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>the copyrighted work;</li>
          <li>the allegedly infringing material and its location;</li>
          <li>contact information;</li>
          <li>a good-faith statement that the use is unauthorized;</li>
          <li>a statement under penalty of perjury that the notice is accurate and the sender is authorized;</li>
          <li>a physical or electronic signature.</li>
        </ul>
        <p className="text-muted-foreground">Send notices to:</p>
        <ul className="list-none text-muted-foreground space-y-1">
          <li><strong>Linton Business Solutions LLC</strong></li>
          <li>616 FM 1960 Road West, Suite 101</li>
          <li>Houston, Texas 77090-3048</li>
          <li>Phone: 281-836-5357</li>
          <li>Email: <a href="mailto:info@LBSconnect.net?subject=Copyright%20Notice" className="text-primary hover:underline">info@LBSconnect.net</a></li>
          <li>Subject: Copyright Notice</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Counter-Notices</h2>
        <p className="text-muted-foreground">
          A person whose material was removed may submit a legally sufficient counter-notice identifying the removed material, stating under penalty of perjury a good-faith belief that removal was mistaken, and consenting to appropriate federal-court jurisdiction where required.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Repeat Infringers</h2>
        <p className="text-muted-foreground">
          LBS may suspend or terminate users who repeatedly infringe intellectual-property rights.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. No Misrepresentation</h2>
        <p className="text-muted-foreground">
          Knowingly submitting a materially false infringement or counter-notice may create legal liability.
        </p>
      </section>
    </LegalPage>
  );
}
