import { LegalPage } from "@/components/legal-page";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function ExamDisclaimerPage() {
  useSEO({
    title: "Exam-Preparation Disclaimer | MyEasyPass.net",
    description: "Disclaimer clarifying that MyEasyPass.net provides independent exam-preparation materials and is not affiliated with any licensing board or testing agency.",
    canonicalUrl: buildUrl("/exam-disclaimer"),
  });

  return (
    <LegalPage title="MyEasyPass.net Exam-Preparation Disclaimer" testId="exam-disclaimer">
      <section className="space-y-4">
        <p className="text-muted-foreground">
          MyEasyPass.net is an independent educational service.
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>It is not an official examination.</li>
          <li>It is not a licensing agency.</li>
          <li>It is not a substitute for required pre-license education.</li>
          <li>It does not issue licenses or certifications.</li>
          <li>It does not control eligibility, scheduling, scoring, retesting, accommodations, or licensing.</li>
          <li>Practice questions are not represented as copied official examination questions.</li>
          <li>Practice scores are not official results.</li>
          <li>Content may not reflect every recent change in law, rule, handbook, or exam blueprint.</li>
          <li>Users must verify current requirements with the relevant official agency and examination provider.</li>
          <li>No passing score, license, certification, employment, commission, income, or business result is guaranteed.</li>
          <li>Educational content is not legal, tax, insurance, real-estate, financial, or other professional advice.</li>
          <li>Names and trademarks of examination sponsors, regulators, certifications, and products belong to their respective owners and are used only to identify the subject matter, unless an authorization is expressly stated.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Contact</h2>
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
