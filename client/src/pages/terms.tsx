import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-terms">
          MyEasyPass Terms of Service
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Agreement</h2>
            <p className="text-muted-foreground">
              These Terms govern access to MyEasyPass, including practice questions, mock exams, explanations, score tracking, study tools, courses, downloads, and related services.
            </p>
            <p className="text-muted-foreground">
              MyEasyPass is owned and operated by Linton Business Solutions LLC.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Educational Service Only</h2>
            <p className="text-muted-foreground">
              MyEasyPass provides independent exam-preparation materials. It is not a government agency, licensing board, official examination, pre-license education provider unless expressly identified, or substitute for required education.
            </p>
            <p className="text-muted-foreground">
              MyEasyPass is not affiliated with or endorsed by TREC, the Texas Department of Insurance, Pearson VUE, Certiport, PMI, or another examination or licensing body unless a specific relationship is expressly stated.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Eligibility</h2>
            <p className="text-muted-foreground">
              Purchasers and independent account holders must be at least 18 and legally able to contract. A parent, guardian, school, employer, or authorized organization may establish supervised access for an eligible minor where lawful.
            </p>
            <p className="text-muted-foreground">
              Do not create an account for a child under 13 without a separately approved parental-consent workflow.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Account Security</h2>
            <p className="text-muted-foreground">
              Provide accurate information, protect credentials, and do not share access. You are responsible for activity under your account until you notify LBS of suspected compromise.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. License</h2>
            <p className="text-muted-foreground">
              During the purchased access period, LBS grants a limited, personal, non-exclusive, non-transferable license to use MyEasyPass for your own study.
            </p>
            <p className="text-muted-foreground">You may not:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>copy, photograph, record, scrape, extract, or redistribute question banks;</li>
              <li>share accounts or answers;</li>
              <li>sell or publish explanations;</li>
              <li>reverse engineer the service;</li>
              <li>use automated tools;</li>
              <li>use content to build a competing exam-prep product;</li>
              <li>falsely represent practice questions as official exam questions;</li>
              <li>use the service to compromise exam security.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Purchases and Access</h2>
            <p className="text-muted-foreground">
              The price, access period, included exam tracks, trial status, renewal status, and billing schedule shown immediately before purchase are part of these Terms.
            </p>
            <p className="text-muted-foreground">MyEasyPass may offer:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>one-time access;</li>
              <li>time-limited access;</li>
              <li>subscriptions;</li>
              <li>free or paid trials;</li>
              <li>promotional or group access.</li>
            </ul>
            <p className="text-muted-foreground">
              A purchase does not include an official examination fee, licensing fee, testing-center fee, required course, or government application unless expressly stated.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Automatic Renewal</h2>
            <p className="text-muted-foreground">
              This section applies only when checkout clearly identifies an automatically renewing subscription.
            </p>
            <p className="text-muted-foreground">
              Before charging, MyEasyPass will disclose the renewal price, frequency, trial conversion, and cancellation method. By affirmatively accepting those terms, you authorize recurring charges until cancellation.
            </p>
            <p className="text-muted-foreground">
              Cancellation stops future renewal and does not normally create a refund for a period already purchased, except as stated in the <Link href="/refund-policy" className="text-primary hover:underline">Refund and Cancellation Policy</Link> or required by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Practice Results</h2>
            <p className="text-muted-foreground">
              Practice scores, readiness indicators, progress charts, and explanations are educational tools. They are not official scores, admissions decisions, licensing determinations, or guarantees.
            </p>
            <p className="text-muted-foreground">
              Question wording, topic weights, statutes, regulations, handbooks, and official exam outlines may change. Users must consult current official sources.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. No Pass Guarantee</h2>
            <p className="text-muted-foreground">
              Unless a separately published written offer expressly states a limited guarantee and its conditions, MyEasyPass does not guarantee that you will:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>pass an exam;</li>
              <li>receive a license or certification;</li>
              <li>encounter the same questions;</li>
              <li>complete licensing requirements;</li>
              <li>obtain employment or income.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Bootcamps and Tutoring</h2>
            <p className="text-muted-foreground">
              In-person or live instruction is subject to the schedule, location, attendance, cancellation, recording, and conduct terms shown at booking. Registration in a bootcamp does not reserve an official examination appointment unless expressly stated.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. User Conduct</h2>
            <p className="text-muted-foreground">
              Users must behave lawfully and respectfully. LBS may remove users for harassment, cheating, infringement, credential sharing, disruption, threats, misuse, or security risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Content Accuracy</h2>
            <p className="text-muted-foreground">
              LBS uses reasonable efforts to maintain useful content but does not warrant that every question, explanation, translation, citation, or topic is error-free or current. Report suspected errors to LBS for review.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Intellectual Property</h2>
            <p className="text-muted-foreground">
              LBS owns or licenses the MyEasyPass platform, branding, software, question banks, explanations, translations, course materials, videos, and related content.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. Feedback</h2>
            <p className="text-muted-foreground">
              You may submit feedback. Unless otherwise agreed, LBS may use non-confidential feedback without payment or restriction, but will not publicly identify you without permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">15. Privacy</h2>
            <p className="text-muted-foreground">
              The <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> explains information handling. Study history and practice scores may be used to provide the service and create aggregated or deidentified analytics.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">16. Suspension and Termination</h2>
            <p className="text-muted-foreground">
              LBS may suspend access for nonpayment, chargeback abuse, account sharing, infringement, cheating, security risk, or material breach. Where practical, LBS will provide notice and an opportunity to cure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">17. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Payment, authentication, video, email, and other providers may apply their own terms. Official licensing and testing organizations are independent of MyEasyPass.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">18. Disclaimers</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MYEASYPASS IS PROVIDED "AS IS" AND "AS AVAILABLE." LBS DISCLAIMS IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AND RESULTS.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">19. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LBS IS NOT LIABLE FOR INDIRECT, CONSEQUENTIAL, SPECIAL, PUNITIVE, EXEMPLARY, OR INCIDENTAL DAMAGES; LOST INCOME; LOST OPPORTUNITY; EXAM FEES; LICENSING FEES; TRAVEL; OR FAILURE TO PASS.
            </p>
            <p className="text-muted-foreground">
              LBS's aggregate liability for a MyEasyPass claim will not exceed the amount paid by the user for MyEasyPass during the 12 months before the event. Non-waivable rights remain unaffected.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">20. Governing Law and Venue</h2>
            <p className="text-muted-foreground">
              Texas law governs. Disputes must be brought in state or federal courts located in Harris County, Texas, unless applicable law requires another forum.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">21. Changes</h2>
            <p className="text-muted-foreground">
              Material changes will be communicated through reasonable notice. Purchased access will not be materially reduced without an appropriate remedy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">22. Contact</h2>
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
