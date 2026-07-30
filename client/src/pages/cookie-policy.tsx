import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-cookie-policy">
          Linton Business Solutions LLC Cookie Policy
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Scope</h2>
            <p className="text-muted-foreground">
              This Cookie Policy applies to lbsconnect.net, myeasypass.net, workabeez.net, lbs4.com, and related web applications that link to it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. What Cookies Are</h2>
            <p className="text-muted-foreground">
              Cookies are small text files placed on a browser or device. Similar technologies include local storage, software development kits, tags, pixels, and session identifiers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Categories We May Use</h2>

            <h3 className="text-lg font-medium">Essential</h3>
            <p className="text-muted-foreground">
              Used for login, authentication, security, fraud prevention, shopping carts, checkout, load balancing, and core operation. These technologies cannot always be disabled without making a service unusable.
            </p>

            <h3 className="text-lg font-medium">Preferences</h3>
            <p className="text-muted-foreground">
              Used to remember language, display, accessibility, and account settings.
            </p>

            <h3 className="text-lg font-medium">Analytics and Performance</h3>
            <p className="text-muted-foreground">
              Used to understand traffic, navigation, feature use, errors, and performance.
            </p>

            <h3 className="text-lg font-medium">Advertising</h3>
            <p className="text-muted-foreground">
              LBS does not authorize advertising cookies or cross-site targeted-advertising technologies through this Policy. If such technology is introduced, LBS must update this Policy, provide required notice and controls, and complete legal review before activation.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Service-Specific Use</h2>
            <p className="text-muted-foreground">
              LBSconnect may use cookies for contact forms, purchases, course access, and analytics.
            </p>
            <p className="text-muted-foreground">
              MyEasyPass may use cookies for authentication, saved study sessions, language selection, progress, and purchases.
            </p>
            <p className="text-muted-foreground">
              Work-A-Beez may use cookies for secure sessions, authentication, trusted-device workflows, preferences, and security.
            </p>
            <p className="text-muted-foreground">
              LBS4 may use cookies for appointments, forms, checkout, and analytics.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Cookie List</h2>
            <p className="text-muted-foreground">
              MyEasyPass currently uses the following cookies and similar technologies. Other LBS properties maintain their own inventories.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Cookie / Technology</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Provider</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Purpose</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Category</th>
                    <th className="text-left py-2 font-semibold text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Session cookie</td>
                    <td className="py-2 pr-4">MyEasyPass (self-hosted)</td>
                    <td className="py-2 pr-4">Keeps you signed in</td>
                    <td className="py-2 pr-4">Essential</td>
                    <td className="py-2">7 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Stripe cookies</td>
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2 pr-4">Fraud prevention during checkout and payment processing</td>
                    <td className="py-2 pr-4">Essential</td>
                    <td className="py-2">Set and controlled by Stripe</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Theme preference (local storage)</td>
                    <td className="py-2 pr-4">MyEasyPass (self-hosted)</td>
                    <td className="py-2 pr-4">Remembers light/dark display preference</td>
                    <td className="py-2 pr-4">Preferences</td>
                    <td className="py-2">Until cleared by user</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Language preference (local storage)</td>
                    <td className="py-2 pr-4">MyEasyPass (self-hosted)</td>
                    <td className="py-2 pr-4">Remembers English/Spanish selection</td>
                    <td className="py-2 pr-4">Preferences</td>
                    <td className="py-2">Until cleared by user</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              MyEasyPass does not currently use a third-party analytics or advertising cookie; usage events are logged to our own servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Your Choices</h2>
            <p className="text-muted-foreground">
              You may manage cookies through:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>a cookie preference tool, where provided;</li>
              <li>your browser settings;</li>
              <li>device privacy settings;</li>
              <li>opt-out tools provided by relevant analytics providers.</li>
            </ul>
            <p className="text-muted-foreground">
              Blocking essential cookies may prevent account login, checkout, appointment scheduling, or application functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Do Not Track and Universal Opt-Out Signals</h2>
            <p className="text-muted-foreground">
              Browser "Do Not Track" signals are not interpreted consistently across the industry. Where applicable law requires recognition of an approved universal opt-out mechanism, LBS will process the signal as required for the relevant activity.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Changes</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy when technology or law changes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Contact</h2>
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
