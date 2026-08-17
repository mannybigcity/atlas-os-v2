import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPage,
  LegalSection,
  legalLinkClass,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use | Atlas For Entrepreneurs",
  description:
    "Terms governing use of the Atlas For Entrepreneurs website, assessment, and client workspace.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Website terms"
      lastUpdated="July 16, 2026"
      summary="These terms govern use of the Atlas website, free assessment, and client workspace. A separate written service agreement governs paid work."
      title="Terms of Use"
    >
      <LegalSection title="1. Agreement and operator">
        <p>
          By accessing or using this website, submitting an assessment, or using
          an Atlas workspace, you agree to these Terms of Use. If you do not agree,
          do not use the service.
        </p>
        <p>
          “Atlas,” “we,” “us,” and “our” mean the operator of the Atlas For
          Entrepreneurs business-services brand. The provider identified in a
          signed proposal or service agreement is the contracting provider for
          paid services, and that written agreement controls if it conflicts with
          these website terms.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility and business authority">
        <p>
          Atlas is intended for people who are at least 18 years old and are using
          the service for lawful business purposes. If you submit information or
          accept terms for a company or another person, you represent that you have
          authority to do so.
        </p>
      </LegalSection>

      <LegalSection title="3. Free assessment and client relationship">
        <p>
          The business assessment is an intake and fit-evaluation tool. Submitting
          it does not create a consulting, fiduciary, agency, employment, or other
          professional relationship; does not guarantee acceptance; and does not
          obligate either party to purchase or provide paid services.
        </p>
        <p>
          No payment is collected by the assessment and no subscription begins
          automatically. Paid work starts only after the parties agree to a written
          scope, deliverables, price, timing, approval process, and payment terms.
        </p>
        <p>
          The public Atlas chat is a limited preview, not a paid consulting
          engagement. Questions and replies may be retained to operate and secure
          the preview, understand common business needs, and control API usage.
          Preview access may be limited or unavailable, and its output must be
          reviewed before use.
        </p>
      </LegalSection>

      <LegalSection title="4. Pricing, cancellations, and refunds">
        <p>
          Public prices describe current offer structures and may be subject to
          availability, eligibility, scope boundaries, and separately approved
          external costs. A proposal or service agreement will state the final
          price before paid work begins.
        </p>
        <p>
          Cancellation, rescheduling, renewal, and refund rules for paid work will
          be stated in the applicable proposal or service agreement. Atlas does not
          make a refund promise that is not written into that agreement.
        </p>
      </LegalSection>

      <LegalSection title="5. AI-assisted work and human review">
        <p>
          Atlas may use a combination of human work, software, automation, public
          information, and AI-assisted tools where included in an approved scope.
          AI-generated or AI-assisted material can be incomplete, inaccurate,
          outdated, nonexclusive, or unsuitable for a particular use.
        </p>
        <p>
          You remain responsible for reviewing facts, names, dates, pricing,
          claims, permissions, legal requirements, and business decisions before
          using or approving work. Atlas will not automatically publish content,
          contact a prospect, purchase advertising, or take another external action
          unless a separate workflow expressly authorizes it.
        </p>
        <p>
          Atlas coordinates business workflows. It is not a human employee, and
          not every capability is autonomous or available in every plan. See{" "}
          <Link className={legalLinkClass} href="/responsible-ai">
            Responsible AI & Human Review
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. No professional advice or guaranteed result">
        <p>
          Atlas provides business organization, research, planning, drafting, and
          implementation support. It does not provide legal, tax, accounting,
          investment, medical, credit, insurance, employment, or other licensed
          professional advice. Consult an appropriately qualified professional for
          those matters.
        </p>
        <p>
          Business outcomes depend on many factors outside Atlas&apos;s control. Atlas
          does not guarantee revenue, profit, leads, rankings, sales, funding,
          customer responses, time savings, or any other particular result.
        </p>
      </LegalSection>

      <LegalSection title="7. Your information and responsibilities">
        <p>You agree to:</p>
        <LegalList>
          <li>provide information that is reasonably accurate and current;</li>
          <li>
            have the rights and permissions needed to submit business content,
            contact information, and public-source material;
          </li>
          <li>protect account credentials and promptly report suspected misuse;</li>
          <li>review work before approving or using it; and</li>
          <li>comply with applicable privacy, advertising, outreach, and industry rules.</li>
        </LegalList>
        <p>
          Do not submit passwords, payment card numbers, government identifiers,
          medical records, highly sensitive personal data, trade secrets belonging
          to someone else, or information you are not authorized to use.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <p>You may not use Atlas to:</p>
        <LegalList>
          <li>break the law, violate another person&apos;s rights, or facilitate harm;</li>
          <li>send unlawful spam, deceptive outreach, or unauthorized automated messages;</li>
          <li>impersonate another person or create fake reviews or testimonials;</li>
          <li>make prohibited discriminatory or high-impact automated decisions;</li>
          <li>introduce malware, bypass access controls, or disrupt the service;</li>
          <li>scrape or collect data in violation of applicable terms or law; or</li>
          <li>misrepresent an Atlas draft as verified professional advice.</li>
        </LegalList>
        <p>
          We may restrict or suspend access when reasonably necessary to protect
          clients, Atlas, third parties, or the service.
        </p>
      </LegalSection>

      <LegalSection title="9. Ownership and permission to provide the service">
        <p>
          You keep ownership of content and business information you submit. You
          grant Atlas a limited permission to host, copy, organize, transform, and
          otherwise process that material only as reasonably needed to provide,
          secure, and support the requested service.
        </p>
        <p>
          Atlas retains rights in its website, brand, software, general methods,
          templates, and preexisting materials. Ownership and permitted use of paid
          deliverables will be addressed in the applicable service agreement.
        </p>
      </LegalSection>

      <LegalSection title="10. Privacy and third-party services">
        <p>
          Our{" "}
          <Link className={legalLinkClass} href="/privacy">
            Privacy Policy
          </Link>{" "}
          explains how Atlas handles information. The service relies on third-party
          hosting, authentication, database, email, and other approved providers.
          Their services may have separate terms, availability, and privacy practices.
        </p>
        <p>
          Atlas is not responsible for an external website merely because Atlas
          links to it or reviews its public content.
        </p>
        <p>
          A private Atlas research preview may display transient Google Maps
          Platform content. That content is governed by the{" "}
          <a
            className={legalLinkClass}
            href="https://cloud.google.com/maps-platform/terms"
            rel="noreferrer"
            target="_blank"
          >
            Google Maps Platform Terms
          </a>
          . Google Maps result content is provided for review and verification;
          users may not bulk-copy, export, or build a separate directory from it.
        </p>
      </LegalSection>

      <LegalSection title="11. Availability and disclaimers">
        <p>
          Atlas is being developed in stages. Features may change, be limited, or be
          discontinued. We aim to keep the service useful and available but do not
          promise uninterrupted or error-free operation.
        </p>
        <p>
          To the maximum extent permitted by law, the website, assessment, and
          unpaid materials are provided “as is” and “as available,” without implied
          warranties of merchantability, fitness for a particular purpose, title,
          or noninfringement. Rights that cannot legally be waived remain unaffected.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Atlas will not be liable under
          these website terms for indirect, incidental, special, consequential, or
          punitive damages, or for lost profits, revenue, data, goodwill, or business
          opportunities arising from use of the website or unpaid assessment.
        </p>
        <p>
          Liability relating to paid services will be governed by the signed service
          agreement. Nothing in these terms excludes liability that cannot lawfully
          be limited.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law, changes, and contact">
        <p>
          These website terms are governed by applicable United States and Texas
          law, without limiting rights that cannot be waived under the law that
          applies to you. A paid service agreement may contain additional dispute
          terms reviewed and accepted by both parties.
        </p>
        <p>
          We may update these terms as Atlas changes. The revised version will show
          a new “Last updated” date. Continued use after an update means the updated
          website terms apply going forward, subject to applicable law.
        </p>
        <p>
          Questions may be sent to{" "}
          <a className={legalLinkClass} href="mailto:hello@siscustomcreations.com">
            hello@siscustomcreations.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
