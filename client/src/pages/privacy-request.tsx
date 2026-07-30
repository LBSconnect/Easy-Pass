import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function PrivacyRequestPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-privacy-request">
          Privacy Request Procedure
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">How to Submit a Request</h2>
            <p className="text-muted-foreground">
              To submit a privacy request, email us with the subject line "Privacy Request" and include the details listed below.
            </p>
            <Button asChild data-testid="button-email-privacy-request">
              <a href="mailto:info@LBSconnect.net?subject=Privacy%20Request">
                <Mail className="h-4 w-4 mr-2" />
                Email a Privacy Request
              </a>
            </Button>
            <p className="text-muted-foreground">
              Do not send passwords, full payment-card numbers, Social Security numbers, or unnecessary copies of identification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">What to Include</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your name and email address</li>
              <li>Telephone number (optional)</li>
              <li>Organization or employer, if relevant</li>
              <li>Which website or service is involved (LBSconnect, MyEasyPass, Work-A-Beez, LBS4, or other)</li>
              <li>The type of request (see below)</li>
              <li>Any account, appointment, order, or transaction identifier (do not include passwords)</li>
              <li>A description of your request</li>
              <li>Your preferred response method</li>
              <li>Whether you are submitting on behalf of another person, and if so, proof of your authority to do so</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Request Types</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access or confirmation</li>
              <li>Copy or portability</li>
              <li>Correction</li>
              <li>Deletion</li>
              <li>Marketing opt-out</li>
              <li>Targeted-advertising or sale opt-out, if applicable</li>
              <li>Profiling opt-out, if applicable</li>
              <li>Appeal of a previous decision</li>
              <li>Authorized-agent request</li>
              <li>Other privacy question</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Verification</h2>
            <p className="text-muted-foreground">
              LBS may verify a request by matching information already associated with the requester, confirming control of an email address or account, asking for transaction or appointment details, or using another proportionate method. Highly sensitive requests may require additional verification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Work-A-Beez Employee Requests</h2>
            <p className="text-muted-foreground">
              If the information is maintained by an employer through Work-A-Beez, the employee should ordinarily submit the request to the employer. LBS will assist the employer as required by contract and applicable law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Response Timing</h2>
            <p className="text-muted-foreground">
              Where the Texas Data Privacy and Security Act applies, LBS will generally respond without undue delay and within 45 days, subject to permitted extensions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Appeal</h2>
            <p className="text-muted-foreground">
              To appeal a denied request, email us with the subject line "Privacy Appeal" and include the original request date, response, and reason for appeal.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Contact</h2>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>Linton Business Solutions LLC</strong></li>
              <li>616 FM 1960 Road West, Suite 101</li>
              <li>Houston, Texas 77090-3048</li>
              <li>Phone: (281) 836-5357</li>
              <li>Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a></li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
