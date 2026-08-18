import { LegalPage } from "@/components/legal-page";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function ElectronicCommunicationsPage() {
  useSEO({
    title: "Electronic Communications, Email & SMS Terms | MyEasyPass",
    description: "Terms governing electronic communications, email, and SMS messages sent by MyEasyPass and Linton Business Solutions LLC.",
    canonicalUrl: buildUrl("/electronic-communications"),
  });

  return (
    <LegalPage title="Electronic Communications, Email, and SMS Terms" testId="electronic-communications">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Electronic Delivery</h2>
        <p className="text-muted-foreground">
          By providing an email address or telephone number in connection with an account, purchase, appointment, application, or service, you consent to receive electronic records related to that transaction or relationship, including receipts, confirmations, appointment reminders, account notices, security alerts, policy updates, support messages, and service communications.
        </p>
        <p className="text-muted-foreground">
          You may withdraw consent to electronic delivery by contacting LBS, but withdrawal may affect our ability to provide online services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Marketing Email</h2>
        <p className="text-muted-foreground">
          Marketing email is separate from required transactional communication. Marketing messages will:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>accurately identify the sender;</li>
          <li>use non-deceptive subject lines;</li>
          <li>include LBS's physical postal address;</li>
          <li>provide a working opt-out method;</li>
          <li>honor valid opt-out requests as required by law.</li>
        </ul>
        <p className="text-muted-foreground">
          Unsubscribing from marketing does not stop necessary account, appointment, billing, security, testing, or service messages.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. SMS</h2>
        <p className="text-muted-foreground">
          Where SMS is offered, consent is not a condition of purchasing goods or services unless text messaging is essential to the requested service and clearly disclosed.
        </p>
        <p className="text-muted-foreground">
          Message frequency varies. Message and data rates may apply. Reply:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>STOP to opt out of optional messages;</li>
          <li>HELP for assistance.</li>
        </ul>
        <p className="text-muted-foreground">
          Carriers are not liable for delayed or undelivered messages.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Consent Records</h2>
        <p className="text-muted-foreground">LBS should retain records of:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>the disclosure shown;</li>
          <li>date and time of consent;</li>
          <li>telephone number or email;</li>
          <li>source page or form;</li>
          <li>policy version;</li>
          <li>opt-out or withdrawal.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Contact</h2>
        <ul className="list-none text-muted-foreground space-y-1">
          <li><strong>Linton Business Solutions LLC</strong></li>
          <li>616 FM 1960 Road West, Suite 101</li>
          <li>Houston, Texas 77090-3048</li>
          <li>Phone: 281-836-5357</li>
          <li>Email: <a href="mailto:info@LBSconnect.net" className="text-primary hover:underline">info@LBSconnect.net</a></li>
        </ul>
      </section>
    </LegalPage>
  );
}
