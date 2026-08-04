import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LionsDenScene } from "@/components/lions-den/lions-den-scene";
import { lionsDenAgents } from "@/lib/lions-den/demo-scenario";

export const metadata: Metadata = {
  title: "Atlas Team Demo | Atlas For Entrepreneurs",
  description:
    "A sales-safe Atlas office demo where business assignments, approvals, and handoffs become visible.",
};

export default function AtlasTeamLivePage() {
  return (
    <main className="atlas-live-page">
      <nav className="live-nav" aria-label="Atlas Tiny Office navigation">
        <Link href="/" className="brand-mark">
          <span>A</span>
          <strong>
            Atlas Tiny Office
            <small>Public demo playback</small>
          </strong>
        </Link>
        <div>
          <Link href="/">Home</Link>
          <Link href="/assessment" className="nav-pill">
            Start assessment
          </Link>
        </div>
      </nav>

      <LionsDenScene />

      <section className="pillar-section" aria-labelledby="pillar-heading">
        <div>
          <span className="tiny-tag dark">The four pillars</span>
          <h2 id="pillar-heading">
            The Atlas business team is visible, not hidden behind a chat box.
          </h2>
        </div>
        <p>
          This public room shows the customer-facing team: ATLAS, HUNTER, MICAH,
          and DAVID. In the paid workspace, the same roles connect to real
          assignments, approvals, and client-safe records.
        </p>

        <div className="pillar-grid">
          {lionsDenAgents.map((agent, index) => (
            <article key={agent.id} className="pillar-card">
              <Image
                src={agent.portrait}
                alt={`${agent.name} sprite reference`}
                width={360}
                height={248}
                sizes="(max-width: 720px) 100vw, 25vw"
              />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{agent.animal}</small>
              <h3>{agent.name}</h3>
              <p>{agent.role}</p>
              <strong>
                {agent.id === "atlas" && "Sets the priority"}
                {agent.id === "hunter" && "Finds opportunities"}
                {agent.id === "micah" && "Creates the marketing"}
                {agent.id === "david" && "Keeps follow-up moving"}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="why-section">
        <div>
          <span className="tiny-tag">Why this sells</span>
          <h2>People understand a team faster than they understand software.</h2>
          <p>
            The Lion&apos;s Den makes Atlas feel alive: a chief of staff, a lead
            researcher, a content builder, and a CRM organizer all moving around
            one business goal.
          </p>
          <Link href="/assessment" className="primary-cta">
            Let Atlas find my revenue leak
          </Link>
        </div>
        <div className="why-grid">
          <article>
            <h3>Visible work</h3>
            <p>The prospect sees tasks moving instead of reading a wall of SaaS copy.</p>
          </article>
          <article>
            <h3>Simple roles</h3>
            <p>Each agent has one job, so the offer feels understandable.</p>
          </article>
          <article>
            <h3>Trust boundary</h3>
            <p>The preview says no private client data is exposed.</p>
          </article>
          <article>
            <h3>Approval first</h3>
            <p>Atlas looks powerful without pretending to act without consent.</p>
          </article>
        </div>
      </section>

      <section className="live-final-cta">
        <div>
          <span>Your next move</span>
          <h2>Find the growth leak before buying another tool.</h2>
        </div>
        <Link href="/assessment">Start free assessment</Link>
      </section>

      <footer className="live-footer">
        <p>
          Built for trust: private workspaces, human approval before external
          action, clear cost controls, and assessment information that is not sold.
        </p>
        <small>
          © 2026 Atlas For Entrepreneurs. Business results vary. No automatic
          subscription.
        </small>
      </footer>
    </main>
  );
}
