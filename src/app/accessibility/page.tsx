import type { Metadata } from "next";
import {
  LegalList,
  LegalPage,
  LegalSection,
  legalLinkClass,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Accessibility | Atlas For Entrepreneurs",
  description:
    "Atlas For Entrepreneurs accessibility commitment and contact information.",
};

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Access for more owners"
      lastUpdated="July 15, 2026"
      summary="Atlas is working to make its public website, assessment, and client experience understandable and usable for people with different abilities and technologies."
      title="Accessibility"
    >
      <LegalSection title="Our commitment">
        <p>
          Accessibility is ongoing work, not a one-time badge. Atlas aims to improve
          the experience as the service grows and to respond constructively when a
          barrier is reported.
        </p>
        <p>
          This statement describes our current intent and practices. It is not a
          claim that every page has been independently audited or certified to a
          particular accessibility standard.
        </p>
      </LegalSection>

      <LegalSection title="Current design practices">
        <p>Atlas currently works to provide:</p>
        <LegalList>
          <li>semantic headings, labels, lists, links, and form controls;</li>
          <li>keyboard-accessible navigation and visible focus behavior;</li>
          <li>text alternatives for meaningful images;</li>
          <li>plain-language instructions and error messages;</li>
          <li>readable color contrast and scalable text; and</li>
          <li>responsive layouts for desktop and mobile screens.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Need help or found a barrier?">
        <p>
          If you cannot access part of the website or complete the assessment,
          email{" "}
          <a className={legalLinkClass} href="mailto:info@atlasforentrepreneurs.com?subject=Accessibility%20request">
            info@atlasforentrepreneurs.com
          </a>{" "}
          with the subject “Accessibility request.” Please describe the page,
          information, or action you were trying to use and the format or assistance
          that would help.
        </p>
        <p>
          Atlas will make a reasonable effort to provide the information or service
          through an accessible alternative while the underlying issue is reviewed.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
