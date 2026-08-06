import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function RefundPolicyPage() {
  useSEO({
    title: "Refund and Cancellation Policy | MyEasyPass",
    description: "MyEasyPass's refund and cancellation policy for exam prep subscriptions, including how to cancel and what to expect.",
    canonicalUrl: buildUrl("/refund-policy"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-refund-policy">
          MyEasyPass Refund and Cancellation Policy
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Terms Shown at Checkout</h2>
            <p className="text-muted-foreground">
              The price, access duration, renewal status, and refund eligibility shown at checkout control for the purchase.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Digital Access</h2>
            <p className="text-muted-foreground">
              Because digital access may be delivered immediately, purchases are generally non-refundable after substantial access, question-bank use, download, or course consumption.
            </p>
            <p className="text-muted-foreground">LBS may provide a refund or account credit when:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>a duplicate charge occurred;</li>
              <li>LBS cannot provide purchased access;</li>
              <li>a material technical defect cannot be corrected within a reasonable period;</li>
              <li>a promotion expressly includes a refund right;</li>
              <li>law requires a refund.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Subscriptions</h2>
            <p className="text-muted-foreground">Where a subscription renews automatically:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>cancel before renewal to avoid the next charge;</li>
              <li>cancellation stops future charges;</li>
              <li>access ordinarily continues through the paid period;</li>
              <li>partial-period refunds are not normally provided.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Trials</h2>
            <p className="text-muted-foreground">
              Where a trial requires a payment method and converts to paid access, the conversion date and price must be displayed before enrollment. Cancel before the disclosed deadline to avoid the first charge.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Bootcamps and Live Sessions</h2>
            <p className="text-muted-foreground">Unless the booking page states otherwise:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>cancellation at least 48 hours before the session may be transferred once or refunded less non-refundable processor fees;</li>
              <li>cancellation less than 48 hours before the session may receive a one-time transfer, subject to availability;</li>
              <li>no-shows are non-refundable;</li>
              <li>if LBS cancels, the customer may choose a full refund or transfer;</li>
              <li>attendance does not guarantee passing.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Requesting a Refund</h2>
            <p className="text-muted-foreground">
              Contact <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a> and include the purchaser name, email, transaction date, product, and reason. Do not email full card information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Chargebacks</h2>
            <p className="text-muted-foreground">
              Contact LBS before initiating a chargeback so we can investigate. Fraudulent or abusive chargebacks may result in account suspension. Nothing limits lawful cardholder rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Contact</h2>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>Linton Business Solutions LLC</strong></li>
              <li>616 FM 1960 Road West, Suite 101</li>
              <li>Houston, Texas 77090-3048</li>
              <li>Phone: 281-836-5357</li>
              <li>Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a></li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
