import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SisHeader } from "@/components/sis-shell";

const pageData = {
  "sis-ai-design-studio": {
    eyebrow: "Create",
    title: "SIS AI Design Studio",
    summary:
      "Upload a file, describe the idea, preview the product, request revisions, and move into production with a premium flow.",
    highlights: [
      "Prompt-first and upload-first creation paths",
      "Revision history and approval checkpoints",
      "Garment selection and pricing preview",
    ],
    nextSteps: [
      "Connect the studio to design generation services.",
      "Store saved designs and revision history.",
      "Hand approved proofs into cart and checkout.",
    ],
  },
  "custom-apparel": {
    eyebrow: "Shop",
    title: "Custom Apparel",
    summary:
      "Fresh Apparel & Design lives here: branded shirts, team gear, family reunions, church apparel, and merch runs.",
    highlights: [
      "Premium basics and elevated merch",
      "Family, school, church, and team orders",
      "Quantity-based pricing and no minimums",
    ],
    nextSteps: [
      "Connect product catalog and variants later.",
      "Add bulk-order inquiry and quote forms.",
      "Route repeat buys into customer accounts.",
    ],
  },
  "fresh-apparel-design": {
    eyebrow: "Division",
    title: "Fresh Apparel & Design",
    summary:
      "The apparel-focused division of SIS Custom Creations for custom garments, business merchandise, and repeat production.",
    highlights: [
      "Business merchandise and branded clothing",
      "Family reunion and event shirts",
      "Print-on-demand ready architecture",
    ],
    nextSteps: [
      "Keep the public brand centered on SIS.",
      "Use this page for apparel-specific positioning.",
      "Link to the apparel catalog and bulk order flow.",
    ],
  },
  "diy-kits": {
    eyebrow: "Make",
    title: "DIY Kits",
    summary:
      "Giftable creative kits for families, classrooms, and anyone who wants to make something at home.",
    highlights: ["At-home making", "Simple instructions", "Warm unboxing"],
    nextSteps: ["Add product cards and bundle options.", "Show seasonal kit drops.", "Connect to a future storefront."],
  },
  "diy-subscriptions": {
    eyebrow: "Subscribe",
    title: "DIY Kit Subscriptions",
    summary:
      "Recurring creative boxes that keep families and groups stocked with new projects and seasonal ideas.",
    highlights: ["Recurring orders", "Seasonal themes", "Family-friendly gifts"],
    nextSteps: ["Add subscription management later.", "Support pause, skip, and resume controls.", "Surface renewal and billing settings."],
  },
  "paint-parties": {
    eyebrow: "Experience",
    title: "Paint Parties",
    summary:
      "Creative events for birthdays, churches, schools, teams, and private celebrations.",
    highlights: ["Private events", "Group pricing", "Family-centered experiences"],
    nextSteps: ["Add booking forms and event intake.", "Support deposits and scheduling.", "List package tiers and inclusions."],
  },
  "splatter-paint-parties": {
    eyebrow: "Experience",
    title: "Splatter Paint Parties",
    summary:
      "A louder, more energetic version of the experience with color, motion, and memorable photos.",
    highlights: ["High-energy sessions", "Great for group photos", "Bold visual identity"],
    nextSteps: ["Add safety notes and room requirements.", "Show package options.", "Connect to event booking."],
  },
  "group-events": {
    eyebrow: "Events",
    title: "Group & Corporate Events",
    summary:
      "Team-building, school, church, and company experiences built around making something together.",
    highlights: ["Schools and churches", "Corporate groups", "Custom package flow"],
    nextSteps: ["Show quote-request forms.", "Support event minimums when needed.", "Create repeat booking options."],
  },
  "business-and-bulk-orders": {
    eyebrow: "Bulk",
    title: "Business and Bulk Orders",
    summary:
      "Large custom apparel orders for teams, companies, fundraisers, and repeat merchandising.",
    highlights: ["Volume pricing", "Repeat orders", "Dedicated support"],
    nextSteps: ["Add quote workflows.", "Track size breakdowns and approvals.", "Keep pricing configurable."],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Pricing",
    summary:
      "Clear quantity tiers, no minimums, and a pricing model that can move into configuration later.",
    highlights: ["One of One", "Small Group", "Event and Business"],
    nextSteps: ["Replace placeholder prices with admin data later.", "Keep revision pricing configurable.", "Show quantity-based savings clearly."],
  },
  gallery: {
    eyebrow: "Showcase",
    title: "Gallery",
    summary:
      "A place for featured designs, event photos, and product highlights across the brand.",
    highlights: ["Apparel mockups", "Creative experiences", "Seasonal product drops"],
    nextSteps: ["Swap in real photography later.", "Add filters for apparel, kits, and events.", "Turn showcases into shoppable links."],
  },
  "our-story": {
    eyebrow: "Story",
    title: "Our Story",
    summary:
      "The place for Deleana's real story, the why behind SIS, and the family-centered mission that shaped the brand.",
    highlights: ["Deleana's voice", "Purpose and community", "Dandelion brand meaning"],
    nextSteps: ["Insert final story copy when ready.", "Add portrait or workspace photography.", "Connect the page to the homepage story section."],
  },
  contact: {
    eyebrow: "Contact",
    title: "Contact SIS",
    summary:
      "Use this page for questions, custom order requests, event inquiries, and bulk-order conversations.",
    highlights: ["Order questions", "Event booking", "Bulk and business inquiries"],
    nextSteps: ["Add forms for each inquiry type.", "Route messages to email or CRM.", "Show response time expectations."],
  },
  faq: {
    eyebrow: "Support",
    title: "FAQ",
    summary:
      "A simple place for the common questions that slow down custom buying decisions.",
    highlights: ["Revisions", "No minimums", "Fulfillment"],
    nextSteps: ["Add accordion answers later.", "Cover shipping and turnaround time.", "Explain cart and checkout steps."],
  },
  cart: {
    eyebrow: "Commerce",
    title: "Cart",
    summary:
      "A future cart surface for products, experiences, and creative add-ons before checkout.",
    highlights: ["Line items", "Quantity edits", "Checkout handoff"],
    nextSteps: ["Connect to Shopify or a custom cart engine.", "Preserve design previews in cart.", "Support promo codes later."],
  },
  checkout: {
    eyebrow: "Commerce",
    title: "Checkout",
    summary:
      "The future payment step for custom orders, event bookings, and recurring purchases.",
    highlights: ["Payments", "Shipping", "Order confirmation"],
    nextSteps: ["Wire in the payment provider later.", "Protect final order data server-side.", "Keep checkout branded and simple."],
  },
  "customer-account": {
    eyebrow: "Account",
    title: "Customer Account",
    summary:
      "A customer hub for saved designs, past orders, subscriptions, and event history.",
    highlights: ["Saved projects", "Order history", "Subscription status"],
    nextSteps: ["Add authentication and account management later.", "Surface repeat-order shortcuts.", "Show design and booking status."],
  },
  "order-tracking": {
    eyebrow: "Tracking",
    title: "Order Tracking",
    summary:
      "A simple page for checking order status, production progress, and shipping updates.",
    highlights: ["Production status", "Shipping updates", "Support contact"],
    nextSteps: ["Pull order status from the commerce backend later.", "Show proof approval state.", "Add reship or help options."],
  },
} as const;

type PageSlug = keyof typeof pageData;

export function generateStaticParams() {
  return Object.keys(pageData).map((page) => ({ page }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const entry = pageData[page as PageSlug];

  if (!entry) {
    return {};
  }

  return {
    title: `${entry.title} | SIS Custom Creations`,
    description: entry.summary,
  };
}

export default async function SisContentPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const entry = pageData[page as PageSlug];

  if (!entry) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#090d1a] text-white">
      <SisHeader variant="page" />

      <main className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-7 sm:py-16">
        <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(91,61,245,0.32),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(65,216,255,0.18),transparent_24%),linear-gradient(180deg,#121935_0%,#0a1022_100%)] p-8 shadow-[0_28px_72px_rgba(6,10,22,0.35)] sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9fdcff]">
            {entry.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            {entry.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            {entry.summary}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sis-ai-design-studio"
              className="inline-flex items-center justify-center rounded-full bg-[#8b6cff] px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#9d86ff]"
            >
              Create With SIS AI
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/6 px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
            >
              Contact SIS
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {entry.highlights.map((item) => (
            <article
              key={item}
              className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 shadow-[0_12px_32px_rgba(6,10,22,0.22)]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9fdcff]">
                Highlight
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                {item}
              </h2>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9fdcff]">
              What this page is for
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              A production-shaped placeholder with the right next step.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This route exists so the SIS brand can expand into dedicated pages without breaking the launchable homepage. It is ready to be filled with product, booking, or commerce data later.
            </p>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9fdcff]">
              Next steps
            </p>
            <div className="mt-4 space-y-3">
              {entry.nextSteps.map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-[#11192d] px-4 py-3 text-sm leading-6 text-slate-200"
                >
                  {step}
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
