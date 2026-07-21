import type { Metadata } from "next";
import {
  LegalList,
  LegalPage,
  LegalSection,
  legalLinkClass,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Responsible AI & Human Review | Atlas For Entrepreneurs",
  description:
    "How Atlas introduces AI-assisted business workflows with human review, approval controls, and clear limits.",
};

export default function ResponsibleAiPage() {
  return (
    <LegalPage
      eyebrow="Trust by design"
      lastUpdated="July 15, 2026"
      summary="Atlas introduces AI in practical stages. The goal is useful business support with clear ownership—not automation for its own sake."
      title="Responsible AI & Human Review"
    >
      <section className="grid gap-5 sm:grid-cols-2">
        {[
          ["Human approval", "Drafts stay under your control before an external action is taken."],
          ["Plain-language scope", "You see what Atlas will do, what it will not do, and what it costs."],
          ["Minimum necessary data", "A workflow should use only the information reasonably needed for its purpose."],
          ["Measured introduction", "Capabilities are added after they are scoped, tested, and reviewable."],
        ].map(([title, description]) => (
          <article
            className="rounded-3xl border border-[#b9ddcd] bg-white p-6 shadow-sm"
            key={title}
          >
            <h2 className="text-xl font-black text-[#071b42]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </section>

      <LegalSection title="What Atlas is today">
        <p>
          Atlas is a founder-led business operations pilot with a private workspace,
          assessment intake, planning, actions, draft-review history, and client
          approval controls. Some work may be prepared by a person, assisted by
          software, or assisted by AI when included in an approved workflow.
        </p>
        <p>
          ATLAS, HUNTER, MICAH, and DAVID are names for coordinated business
          functions—not four human employees and not a claim that every function is
          fully autonomous. The public assessment is reviewed before a paid scope is
          recommended. The current website does not automatically send assessment
          submissions to an external AI model.
        </p>
      </LegalSection>

      <LegalSection title="Approval before external action">
        <p>
          Atlas does not automatically publish a post, message a prospect, purchase
          advertising, change a public website, or start outreach merely because a
          draft or recommendation exists. An external action requires the approval
          defined for that workflow.
        </p>
        <p>Before introducing a connected workflow, Atlas aims to identify:</p>
        <LegalList>
          <li>the business purpose and expected outcome;</li>
          <li>the information and external provider required;</li>
          <li>the person responsible for review and final approval;</li>
          <li>the action Atlas may take after approval; and</li>
          <li>usage limits and separately billed external costs.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Accuracy and human responsibility">
        <p>
          AI-assisted output can be wrong, incomplete, outdated, biased, or too
          generic. A polished answer is not proof that it is accurate. Names, dates,
          contact details, claims, prices, citations, and decisions should be checked
          against reliable sources before use.
        </p>
        <p>
          Atlas support does not replace the judgment of the business owner or an
          appropriately licensed professional. AI output should not be the sole basis
          for legal, medical, financial, credit, insurance, employment, housing, or
          other high-impact decisions.
        </p>
      </LegalSection>

      <LegalSection title="Data care">
        <p>
          Atlas aims to collect and use only information reasonably necessary for an
          approved business purpose. Do not submit passwords, payment card numbers,
          government identifiers, health records, or other highly sensitive personal
          information unless a separately reviewed workflow specifically requires and
          protects it.
        </p>
        <p>
          If a future workflow will send client information to an external AI or data
          provider, Atlas will describe the purpose and approval point before that
          workflow is activated. Additional details appear in the{" "}
          <a className={legalLinkClass} href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Uses Atlas will not support">
        <LegalList>
          <li>fake reviews, deceptive testimonials, impersonation, or fabricated evidence;</li>
          <li>unlawful spam, harassment, or unauthorized automated outreach;</li>
          <li>illegal discrimination or prohibited high-impact automated decisions;</li>
          <li>malware, credential theft, fraud, surveillance abuse, or other harm;</li>
          <li>use of confidential or personal information without authority; or</li>
          <li>claims that AI guarantees business growth, leads, revenue, or profit.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Questions and concerns">
        <p>
          If an Atlas recommendation appears inaccurate, unsafe, unauthorized, or
          inconsistent with these principles, stop using the output and email{" "}
          <a className={legalLinkClass} href="mailto:hello@siscustomcreations.com">
            hello@siscustomcreations.com
          </a>
          . Atlas will review the concern and, where appropriate, correct the workflow
          or restrict its use.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
