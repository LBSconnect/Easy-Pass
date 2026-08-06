import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function PrivacyPage() {
  useSEO({
    title: "Privacy Policy | MyEasyPass",
    description: "Privacy Policy explaining how Linton Business Solutions LLC collects, uses, discloses, and protects personal information across MyEasyPass and related services.",
    canonicalUrl: buildUrl("/privacy"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-privacy">
          Linton Business Solutions LLC Privacy Policy
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective Date: July 30, 2026<br />
            Last Updated: July 30, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Overview</h2>
            <p className="text-muted-foreground">
              Linton Business Solutions LLC ("LBS," "we," "us," or "our") respects privacy and is committed to handling personal information responsibly. This Privacy Policy explains how we collect, use, disclose, retain, and protect information through:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>lbsconnect.net</li>
              <li>myeasypass.net</li>
              <li>workabeez.net</li>
              <li>lbs4.com</li>
              <li>related applications, forms, communications, appointments, and in-person services that link to this Policy</li>
            </ul>
            <p className="text-muted-foreground">
              This Policy does not replace privacy notices issued by testing sponsors, employers, government agencies, payment processors, or other organizations that independently determine how they use information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Who We Are</h2>
            <p className="text-muted-foreground">
              Linton Business Solutions LLC<br />
              616 FM 1960 Road West, Suite 101<br />
              Houston, Texas 77090-3048<br />
              Phone: 281-836-5357<br />
              Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a>
            </p>
            <p className="text-muted-foreground">
              LBS operates several distinct services. Our role may differ depending on the service:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>For corporate inquiries, purchases, appointments, and direct customer relationships, LBS generally determines why and how information is used.</li>
              <li>For employee information processed through Work-A-Beez on behalf of a subscribing employer, the employer generally controls the information and LBS processes it under the employer's instructions.</li>
              <li>For testing services, a testing sponsor may independently control candidate registration, eligibility, identification, exam delivery, scores, proctoring information, and retention.</li>
              <li>A commissioned notary controls the notarial record the notary is legally required to maintain.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Information We Collect</h2>

            <h3 className="text-lg font-medium">3.1 Information You Provide Directly</h3>
            <p className="text-muted-foreground">
              Depending on the service, we may collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>name, email address, telephone number, mailing address, and organization</li>
              <li>account credentials and account preferences</li>
              <li>billing contact and transaction information</li>
              <li>appointment, reservation, attendance, and service-selection information</li>
              <li>messages, customer-support requests, survey responses, and feedback</li>
              <li>files, documents, photographs, or other content you submit</li>
              <li>consulting intake details and confidential project information</li>
              <li>practice answers, mock-exam results, study progress, and course activity</li>
              <li>employer, administrator, employee, contractor, schedule, time, attendance, PTO, payroll-related, pay-stub, message, performance, and recognition information</li>
              <li>government-issued identification information required for testing or notarial services</li>
              <li>passport or visa photographs</li>
              <li>information entered into notarial records as required by law</li>
              <li>information contained in documents presented for printing, copying, scanning, faxing, resume assistance, or similar services</li>
            </ul>

            <h3 className="text-lg font-medium">3.2 Information Collected Automatically</h3>
            <p className="text-muted-foreground">
              Our websites and applications may collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>IP address</li>
              <li>browser and device type</li>
              <li>operating system</li>
              <li>referring page</li>
              <li>pages or screens viewed</li>
              <li>timestamps and session information</li>
              <li>login history</li>
              <li>device authorization information</li>
              <li>error, diagnostic, performance, and security logs</li>
              <li>cookie and similar technology identifiers</li>
            </ul>

            <h3 className="text-lg font-medium">3.3 Payment Information</h3>
            <p className="text-muted-foreground">
              Payments may be processed by third-party payment processors, including Stripe where implemented. LBS generally does not receive or store full payment-card numbers, CVV codes, or full bank credentials. We may receive transaction identifiers, billing contact information, card type, last four digits, payment status, subscription status, refunds, chargebacks, and related records.
            </p>

            <h3 className="text-lg font-medium">3.4 Sensitive Information</h3>
            <p className="text-muted-foreground">
              Depending on the service, information may include government identification, precise work records, employment-related data, private documents, or other information that may be sensitive.
            </p>
            <p className="text-muted-foreground">
              The current Work-A-Beez design is described as PIN-based and restricted to authorized devices. This Policy does not authorize collection of fingerprints, face geometry, voiceprints, retina or iris scans, or precise geolocation. LBS will not introduce biometric or precise-location collection without completing legal review, updating notices, and obtaining any required consent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. How We Use Information</h2>
            <p className="text-muted-foreground">
              We may use information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>provide, operate, maintain, and secure our websites, applications, and services</li>
              <li>create and administer accounts</li>
              <li>authenticate users and authorized devices</li>
              <li>process purchases, subscriptions, appointments, reservations, and refunds</li>
              <li>deliver digital products, courses, study tools, and consulting services</li>
              <li>administer practice tests and display study progress</li>
              <li>support workforce scheduling, timekeeping, attendance, PTO, payroll-related reporting, messages, and analytics</li>
              <li>coordinate testing-center appointments and comply with testing-sponsor requirements</li>
              <li>perform notarial acts and maintain legally required records</li>
              <li>prepare passport photographs and perform business-center document services</li>
              <li>respond to questions and provide support</li>
              <li>send transactional notices, security alerts, service messages, and account communications</li>
              <li>send marketing communications where permitted and subject to opt-out rights</li>
              <li>prevent fraud, abuse, unauthorized access, and security incidents</li>
              <li>troubleshoot, analyze performance, and improve products</li>
              <li>create aggregated or deidentified information</li>
              <li>enforce agreements</li>
              <li>comply with legal, accounting, tax, regulatory, testing, and contractual obligations</li>
              <li>establish, exercise, or defend legal claims</li>
            </ul>
            <p className="text-muted-foreground">
              We do not use employer-controlled Work-A-Beez employee data to advertise products to employees.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Website- and Service-Specific Practices</h2>

            <h3 className="text-lg font-medium">5.1 LBSconnect.net</h3>
            <p className="text-muted-foreground">
              LBSconnect may collect information from consulting prospects, government and commercial clients, subcontractors, digital-product purchasers, course participants, newsletter subscribers, and website visitors.
            </p>
            <p className="text-muted-foreground">
              Project information may be governed by a separate nondisclosure agreement, master services agreement, statement of work, purchase order, subcontract, or government contract. When those documents impose stricter confidentiality or data-handling requirements, those requirements control.
            </p>

            <h3 className="text-lg font-medium">5.2 MyEasyPass.net</h3>
            <p className="text-muted-foreground">
              MyEasyPass may collect account data, purchases, practice answers, scores, timing, topic performance, study history, language preferences, and bootcamp-related information.
            </p>
            <p className="text-muted-foreground">
              Practice scores are educational indicators only and are not official licensing-exam results. LBS does not control official eligibility, testing, scoring, licensing, or certification decisions.
            </p>

            <h3 className="text-lg font-medium">5.3 Work-A-Beez.net</h3>
            <p className="text-muted-foreground">
              Work-A-Beez customers may upload and manage employee and contractor information. For this information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>the customer determines what information is entered and why it is processed;</li>
              <li>the customer is responsible for providing employee notices and obtaining required permissions;</li>
              <li>LBS processes the information to provide the service, secure it, support users, comply with law, and follow documented customer instructions;</li>
              <li>users seeking access, correction, or deletion of employer-controlled information should normally contact their employer first.</li>
            </ul>
            <p className="text-muted-foreground">
              LBS separately controls business-contact, billing, security, support, and account-relationship information used for its own legitimate business operations.
            </p>

            <h3 className="text-lg font-medium">5.4 LBS4.com and Physical Services</h3>
            <p className="text-muted-foreground">
              LBS4 may collect appointment, payment, communication, identification, service, and transaction information.
            </p>
            <p className="text-muted-foreground">
              Testing sponsors may separately collect and control candidate accounts, exam eligibility, identification, test delivery, scores, incident reports, and monitoring information. Their privacy notices and candidate rules also apply.
            </p>
            <p className="text-muted-foreground">
              For traditional notarial acts, the commissioned notary must maintain a record book containing information required by Texas law. Notary records may be public records. LBS does not provide legal advice and does not decide whether a document is legally sufficient.
            </p>
            <p className="text-muted-foreground">
              For passport photos and business-center documents, LBS seeks to retain files only as long as reasonably necessary to complete the requested service, troubleshoot immediate service issues, process payment, and satisfy legal obligations. See the Business-Center Document Handling Notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Cookies and Similar Technologies</h2>
            <p className="text-muted-foreground">
              We may use:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>essential cookies for security, authentication, checkout, and core functionality;</li>
              <li>preference cookies to remember settings;</li>
              <li>analytics technologies to understand site and application performance;</li>
              <li>security technologies to detect fraud and abuse.</li>
            </ul>
            <p className="text-muted-foreground">
              Additional details appear in the <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. How We Disclose Information</h2>
            <p className="text-muted-foreground">
              We may disclose information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>cloud hosting, database, storage, and infrastructure providers</li>
              <li>authentication and security providers</li>
              <li>payment processors</li>
              <li>email and communication providers</li>
              <li>analytics, diagnostics, and performance providers</li>
              <li>customer support and scheduling providers</li>
              <li>professional advisers, insurers, auditors, and contractors</li>
              <li>testing sponsors and certification organizations</li>
              <li>government agencies, courts, regulators, and law enforcement where legally required</li>
              <li>a buyer, successor, lender, investor, or adviser in a proposed or completed corporate transaction</li>
              <li>other parties at your direction or with your permission</li>
            </ul>
            <p className="text-muted-foreground">
              Service providers are permitted to receive information only for legitimate service purposes and should be subject to appropriate confidentiality and security obligations.
            </p>
            <p className="text-muted-foreground">
              We do not sell personal information for money.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Aggregated and Deidentified Information</h2>
            <p className="text-muted-foreground">
              We may create and use aggregated or deidentified information for analytics, product improvement, capacity planning, security, benchmarking, and business operations. We will take reasonable measures designed to prevent deidentified data from being associated with an identifiable person and will not knowingly attempt to reidentify it except as permitted by law to test deidentification safeguards.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Retention</h2>
            <p className="text-muted-foreground">
              We retain information for periods reasonably necessary for the purposes described in this Policy, considering:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>the duration of the account or customer relationship</li>
              <li>the sensitivity and volume of the information</li>
              <li>legal, tax, accounting, employment, testing, notary, and contractual requirements</li>
              <li>security, backup, fraud-prevention, and dispute-resolution needs</li>
              <li>customer instructions where LBS acts as a processor</li>
            </ul>
            <p className="text-muted-foreground">Examples:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>transaction and tax records may be retained for legally and operationally appropriate periods;</li>
              <li>Work-A-Beez customer data may be retained during the subscription and for a limited export or recovery period after termination;</li>
              <li>employer payroll and time records should be retained according to the employer's legal obligations and configured retention requirements;</li>
              <li>traditional notary records are retained by the commissioned notary as required by Texas law;</li>
              <li>online-notary recordings, if offered, require separate statutory retention;</li>
              <li>passport-photo and document-service working files should ordinarily be deleted promptly after service completion;</li>
              <li>backups may persist for a limited cycle before being overwritten.</li>
            </ul>
            <p className="text-muted-foreground">
              Detailed proposed periods appear in the Records Retention Schedule.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Security</h2>
            <p className="text-muted-foreground">
              We use administrative, technical, and physical safeguards designed to protect information. Measures may include access controls, authentication, encryption in transit, encryption at rest where appropriate, tenant separation, logging, backups, vendor management, employee confidentiality obligations, and incident-response procedures.
            </p>
            <p className="text-muted-foreground">
              No system can guarantee absolute security. You are responsible for using strong credentials, protecting account access, maintaining secure devices, and promptly reporting suspected misuse.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Your Privacy Choices and Rights</h2>
            <p className="text-muted-foreground">
              Depending on your relationship with LBS and applicable law, you may request to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>know whether we process your personal information</li>
              <li>access or obtain a copy of certain information</li>
              <li>correct inaccurate information</li>
              <li>delete certain information</li>
              <li>opt out of marketing email or SMS</li>
              <li>opt out of qualifying targeted advertising, sale, or profiling if those activities occur</li>
              <li>appeal certain privacy-request decisions where required</li>
            </ul>
            <p className="text-muted-foreground">
              Submit requests to <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a> with the subject line "Privacy Request" or use our <Link href="/privacy-request" className="text-primary hover:underline">Privacy Request Procedure</Link>.
            </p>
            <p className="text-muted-foreground">
              We may verify identity before acting. Authorized agents may be required to provide proof of authority. We may deny or limit requests where permitted by law, including where we cannot verify identity, must retain the information, need it to provide a requested service, or process it solely on behalf of an employer or other customer.
            </p>
            <p className="text-muted-foreground">
              For Work-A-Beez employee records controlled by an employer, contact the employer first. We will support the employer's response where contractually and legally required.
            </p>
            <p className="text-muted-foreground">
              We will not discriminate against a person for exercising applicable privacy rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Marketing Communications</h2>
            <p className="text-muted-foreground">
              You may unsubscribe from marketing email using the link in the message or by contacting us. You may opt out of marketing SMS by replying STOP, where available. Transactional, security, account, appointment, testing, and service messages may still be sent when necessary.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Children and Minors</h2>
            <p className="text-muted-foreground">
              Our general online services are not directed to children under 13, and we do not knowingly allow children under 13 to independently create accounts or submit personal information.
            </p>
            <p className="text-muted-foreground">
              Testing services may be used by minors where permitted by a testing sponsor and authorized by a parent, guardian, school, or sponsoring organization. In those cases, information may be handled under the testing sponsor's rules and applicable law.
            </p>
            <p className="text-muted-foreground">
              MyEasyPass and paid account services are intended for adults unless an authorized parent, guardian, school, or organization establishes or supervises access.
            </p>
            <p className="text-muted-foreground">
              If you believe a child under 13 submitted information without appropriate authorization, contact us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. International Users</h2>
            <p className="text-muted-foreground">
              LBS operates from the United States. Information may be processed in the United States and other countries where service providers operate. Those countries may have different privacy laws. If international operations expand, LBS will implement additional contractual and transfer safeguards where required.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">15. Third-Party Links and Services</h2>
            <p className="text-muted-foreground">
              Our properties may link to third-party websites and services. We do not control their privacy practices. Review their notices before submitting information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">16. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Policy to reflect legal, technical, or business changes. We will post the revised version and update the effective date. For material changes, we may provide additional notice through email, account notifications, checkout, or another appropriate method.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">17. Contact Us</h2>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>Linton Business Solutions LLC</strong></li>
              <li>616 FM 1960 Road West, Suite 101</li>
              <li>Houston, Texas 77090-3048</li>
              <li>Phone: 281-836-5357</li>
              <li>Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a></li>
            </ul>
            <p className="text-muted-foreground">
              For privacy requests, use the subject line "Privacy Request."
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
