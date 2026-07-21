"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SisHeader } from "@/components/sis-shell";

type GarmentId = "tee" | "hoodie" | "crewneck" | "tote" | "youth" | "hat";
type ColorId = "navy" | "purple" | "blue" | "lavender" | "black";
type BeginMode = "upload" | "idea" | "template" | "ai";

const experienceCards = [
  {
    href: "/sis-ai-design-studio",
    label: "SIS AI Custom Wear",
    text: "Upload a logo, sketch, or photo and shape it into a ready-to-print apparel concept.",
  },
  {
    href: "/custom-apparel",
    label: "Fresh Apparel & Design",
    text: "Premium shirts, hoodies, and branded merch for businesses, reunions, and teams.",
  },
  {
    href: "/diy-kits",
    label: "DIY Kits",
    text: "At-home craft kits that feel special, giftable, and easy to order.",
  },
  {
    href: "/diy-subscriptions",
    label: "DIY Kit Subscriptions",
    text: "Recurring creative boxes for families, classrooms, and community groups.",
  },
  {
    href: "/paint-parties",
    label: "Paint Parties",
    text: "Guided creative events for birthdays, churches, schools, and private groups.",
  },
  {
    href: "/splatter-paint-parties",
    label: "Splatter Paint Parties",
    text: "High-energy sessions built around color, play, and memorable photos.",
  },
  {
    href: "/group-events",
    label: "Group & Corporate Events",
    text: "Custom experiences designed for teams, celebrations, and customer activations.",
  },
] as const;

const garments: Array<{ id: GarmentId; label: string; detail: string }> = [
  { id: "tee", label: "T-Shirt", detail: "Everyday staple for launches and gifts." },
  { id: "hoodie", label: "Hoodie", detail: "Premium weight for colder seasons." },
  { id: "crewneck", label: "Crewneck", detail: "Polished layer for team orders." },
  { id: "tote", label: "Tote Bag", detail: "Useful add-on for events and retail." },
  { id: "youth", label: "Youth Shirt", detail: "Sized for family and school orders." },
  { id: "hat", label: "Hat", detail: "Clean front panel with embroidery." },
];

const colors: Array<{ id: ColorId; label: string; value: string }> = [
  { id: "navy", label: "Midnight Navy", value: "#0f172a" },
  { id: "purple", label: "Cosmic Purple", value: "#5b3df5" },
  { id: "blue", label: "Electric Blue", value: "#1665ff" },
  { id: "lavender", label: "Soft Lavender", value: "#b8a6ff" },
  { id: "black", label: "Black", value: "#111111" },
];

const beginModes: Array<{ id: BeginMode; label: string; note: string }> = [
  { id: "upload", label: "Upload my design", note: "Artwork, logo, sketch, or inspiration image." },
  { id: "idea", label: "Describe my idea", note: "Natural language prompt to start the concept." },
  { id: "template", label: "Use a template", note: "Guided layouts for fast ordering." },
  { id: "ai", label: "Create with AI", note: "Generate a direction and refine it with revisions." },
];

const stylePresets = [
  "Clean logo",
  "Family reunion",
  "Faith-centered",
  "Bold typography",
  "Youth team",
  "Event merch",
];

const featuredItems = [
  { title: "Custom shirt drop", tag: "Fresh Apparel & Design", meta: "Best for branded launches and repeat orders." },
  { title: "Seasonal DIY box", tag: "DIY Kits", meta: "Giftable kits with a warm unboxing feel." },
  { title: "Private paint night", tag: "Paint Parties", meta: "Made for birthdays, churches, and families." },
  { title: "Business merch bundle", tag: "Bulk orders", meta: "Designed for teams, schools, and events." },
  { title: "Splatter session", tag: "Experiences", meta: "High-energy sessions that photograph well." },
] as const;

const processSteps = [
  "Choose a product or experience.",
  "Upload an idea or create with AI.",
  "Review the proof and personalize it.",
  "Approve the final design.",
  "We create and fulfill the order.",
];

const pricingTiers = [
  { label: "One of One", range: "1-9 pieces", note: "Ideal for personal orders and gifts." },
  { label: "Small Group", range: "10-49 pieces", note: "Families, teams, churches, and events." },
  { label: "Event and Business", range: "50+ pieces", note: "Volume pricing with dedicated support." },
];

export function SisHomepage() {
  const [mode, setMode] = useState<BeginMode>("ai");
  const [selectedGarment, setSelectedGarment] = useState<GarmentId>("tee");
  const [selectedColor, setSelectedColor] = useState<ColorId>("purple");
  const [quantity, setQuantity] = useState(24);
  const [revisionCount, setRevisionCount] = useState(2);
  const [prompt, setPrompt] = useState(
    "Create a premium custom shirt for a family-centered brand with a bold dandelion mark, electric blue highlights, and soft lavender accents.",
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const currentGarment =
    garments.find((item) => item.id === selectedGarment) ?? garments[0];
  const currentColor =
    colors.find((item) => item.id === selectedColor) ?? colors[0];
  const tier =
    quantity <= 9
      ? pricingTiers[0]
      : quantity <= 49
        ? pricingTiers[1]
        : pricingTiers[2];

  const unitPrice = quantity <= 9 ? 34 : quantity <= 49 ? 26 : 19;
  const revisionOverage = Math.max(0, revisionCount - 2);
  const estimatedTotal = quantity * unitPrice + revisionOverage;

  const dandelionSeeds = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${8 + (index % 6) * 14}%`,
        top: `${10 + Math.floor(index / 6) * 22}%`,
        size: 4 + (index % 4) * 1.4,
        delay: `${index * 0.35}s`,
      })),
    [],
  );

  return (
    <div className="min-h-screen bg-[#090d1a] text-white">
      <SisHeader variant="home" />

      <main>
        <section
          className="relative overflow-hidden border-b border-white/8"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setPointer({
              x: (event.clientX - rect.left - rect.width / 2) / rect.width,
              y: (event.clientY - rect.top - rect.height / 2) / rect.height,
            });
          }}
          onMouseLeave={() => setPointer({ x: 0, y: 0 })}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(91,61,245,0.38),transparent_25%),radial-gradient(circle_at_80%_25%,rgba(22,101,255,0.22),transparent_22%),radial-gradient(circle_at_50%_70%,rgba(184,166,255,0.16),transparent_28%),linear-gradient(180deg,#090d1a_0%,#0c1324_45%,#11182d_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

          <div
            className="pointer-events-none absolute right-[-2rem] top-10 hidden h-[34rem] w-[34rem] lg:block"
            style={{
              transform: `translate3d(${pointer.x * 26}px, ${pointer.y * 20}px, 0)`,
            }}
          >
            <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle,#d2d8ff_0%,rgba(210,216,255,0.1)_25%,transparent_62%)] blur-2xl" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82)_0%,rgba(208,216,255,0.35)_24%,rgba(18,22,42,0.05)_70%)] shadow-[0_0_120px_rgba(140,138,255,0.28)]" />
            {dandelionSeeds.map((seed) => (
              <span
                key={seed.id}
                className="sis-seed absolute rounded-full bg-[#f4f1ff] shadow-[0_0_18px_rgba(244,241,255,0.95)]"
                style={{
                  left: seed.left,
                  top: seed.top,
                  width: `${seed.size}px`,
                  height: `${seed.size}px`,
                  animationDelay: seed.delay,
                }}
              />
            ))}
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-200">
                SIS Custom Creations
                <span className="h-1.5 w-1.5 rounded-full bg-[#41d8ff]" />
                Premium creative commerce
              </p>
              <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.07em] sm:text-6xl lg:text-[5.8rem]">
                Bring your ideas to life.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200/80 sm:text-xl sm:leading-9">
                Custom apparel, creative experiences, DIY kits, and AI-assisted design. SIS keeps the brand warm, personal, and easy to buy from without making the homepage feel endless.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sis-ai-design-studio"
                  className="inline-flex items-center justify-center rounded-full bg-[#8b6cff] px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_42px_rgba(91,61,245,0.32)] transition hover:-translate-y-0.5 hover:bg-[#9d86ff]"
                >
                  Create With SIS AI
                </Link>
                <Link
                  href="/custom-apparel"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/6 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-white/12"
                >
                  Shop Custom Apparel
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/paint-parties"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/10"
                >
                  Book a Paint Party
                </Link>
                <Link
                  href="/diy-kits"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/10"
                >
                  Explore DIY Kits
                </Link>
                <Link
                  href="/group-events"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/10"
                >
                  Group Events
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                {[
                  "No minimum order quantity",
                  "Two revisions included",
                  "Quantity-based pricing",
                  "Dandelion brand motif",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-2"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgba(65,216,255,0.24),transparent_32%),radial-gradient(circle_at_75%_80%,rgba(139,108,255,0.22),transparent_30%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-[0_34px_90px_rgba(6,10,22,0.45)] backdrop-blur-xl">
                <div className="border-b border-white/10 px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9fdcff]">
                        SIS AI Design Studio preview
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                        Live product mockup
                      </h2>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                        Revision policy
                      </p>
                      <p className="mt-2 text-lg font-semibold">2 free edits</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-[#10192f] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                        Start here
                      </p>
                      <div className="mt-3 grid gap-2">
                        {beginModes.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMode(item.id)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              mode === item.id
                                ? "border-[#8b6cff] bg-[#1a2440] text-white"
                                : "border-white/10 bg-white/6 text-slate-200 hover:bg-white/10"
                            }`}
                          >
                            <span className="block text-sm font-black uppercase tracking-[0.14em]">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-300">
                              {item.note}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block rounded-3xl border border-white/10 bg-[#10192f] p-4 text-sm font-semibold text-slate-100">
                      Prompt
                      <textarea
                        className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-[#0a1223] p-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-[#8b6cff] focus:ring-2 focus:ring-[#8b6cff]/20"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Describe the shirt idea, family story, event, or style direction."
                      />
                    </label>

                    <label className="block cursor-pointer rounded-3xl border border-dashed border-white/15 bg-[#10192f] p-4 text-sm font-semibold text-slate-100 transition hover:border-[#9fdcff]/50 hover:bg-[#131c33]">
                      Upload artwork
                      <input
                        className="sr-only"
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf,.svg,.ai"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setFileName(file ? file.name : null);
                        }}
                      />
                      <span className="mt-3 block rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-200">
                        {fileName ?? "PNG, JPG, PDF, AI, or SVG"}
                      </span>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#f7f2ff_0%,#ced8ff_100%)] p-4 text-slate-900 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
                      <div className="rounded-[1.5rem] border border-white/60 bg-[#0d1230] p-5 text-white">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                              {currentGarment.label}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {currentGarment.detail}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                              Qty
                            </p>
                            <p className="mt-1 text-2xl font-semibold">{quantity}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex h-64 items-end justify-center rounded-[1.5rem] bg-[radial-gradient(circle_at_top,rgba(159,220,255,0.24),transparent_40%),linear-gradient(180deg,#101631_0%,#0a1022_100%)] p-6">
                          <div className="relative h-44 w-40 rounded-[2rem] border border-white/15 bg-[linear-gradient(180deg,#f4f5ff_0%,#d6dcff_100%)] shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
                            <div
                              className="absolute inset-x-6 top-8 h-7 rounded-b-[1.5rem]"
                              style={{ backgroundColor: currentColor.value }}
                            />
                            <div className="absolute left-5 right-5 top-11 h-24 rounded-[1.1rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_40%),linear-gradient(180deg,#fafcff_0%,#eff2ff_100%)]" />
                            <div className="absolute inset-x-8 top-18 text-center">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b3df5]">
                                SIS
                              </p>
                              <p className="mt-2 text-xs font-semibold text-slate-600">
                                {selectedGarment}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9fdcff]">
                              Design mode
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {mode === "upload"
                                ? "Upload"
                                : mode === "idea"
                                  ? "Describe"
                                  : mode === "template"
                                    ? "Template"
                                    : "AI"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9fdcff]">
                              Color
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {currentColor.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-[#10192f] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                            Pricing preview
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            Configurable later from pricing settings or admin.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRevisionCount((current) => current + 1)}
                          className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
                        >
                          Add revision
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                            Tier
                          </p>
                          <p className="mt-2 text-sm font-semibold">{tier.label}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                            Revisions
                          </p>
                          <p className="mt-2 text-sm font-semibold">{revisionCount} total</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                            Estimate
                          </p>
                          <p className="mt-2 text-sm font-semibold">${estimatedTotal}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 px-6 py-4 text-xs leading-6 text-slate-300">
                  Two design revisions are included free. Additional revisions can be priced later without locking the business into a permanent rule.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="bg-[#f4efff] text-[#0f172a]">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 sm:py-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5b3df5]">
                  Choose your creative experience
                </p>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  A short homepage. Clear paths into the deeper pages.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Each card below leads to a dedicated page so the homepage can stay focused while the brand still feels expansive.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {experienceCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-[1.7rem] border border-[#d9d0ff] bg-white p-5 shadow-[0_12px_30px_rgba(91,61,245,0.08)] transition hover:-translate-y-1 hover:border-[#9f8cff] hover:shadow-[0_20px_50px_rgba(91,61,245,0.12)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b3df5]">
                    Creative path
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                    {card.label}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{card.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#5b3df5]">
                    Explore page
                    <span className="transition group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="studio" className="bg-[#0d1324]">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9fdcff]">
                  SIS AI Design Studio
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  A real software product feel, not a contact form.
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300">
                  The studio preview shows the pieces customers need: prompt, upload, garment, color, revisions, and a live pricing snapshot.
                </p>
                <div className="mt-8 grid gap-3">
                  {[
                    ["Upload design", "Photo, logo, sketch, or inspiration image."],
                    ["Preview on garment", "See the concept on the selected item."],
                    ["Request revisions", "Keep the edit history visible."],
                    ["Add to cart", "Hand off to checkout when the design is ready."],
                  ].map(([label, text]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4"
                    >
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                        {label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-[0_26px_60px_rgba(6,10,22,0.35)]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-[#11192d] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                      Select garment
                    </p>
                    <div className="mt-4 grid gap-2">
                      {garments.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedGarment(item.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selectedGarment === item.id
                              ? "border-[#8b6cff] bg-[#1b2440] text-white"
                              : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <span className="block text-sm font-black uppercase tracking-[0.14em]">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5">
                            {item.detail}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-[#11192d] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                      Shirt color
                    </p>
                    <div className="mt-4 grid gap-2">
                      {colors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setSelectedColor(color.id)}
                          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                            selectedColor === color.id
                              ? "border-[#41d8ff] bg-[#1b2440] text-white"
                              : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-black uppercase tracking-[0.14em]">
                            {color.label}
                          </span>
                          <span
                            className="h-5 w-5 rounded-full border border-white/20"
                            style={{ backgroundColor: color.value }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-[#11192d] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                      Design style presets
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {stylePresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setPrompt((current) => `${current} Style: ${preset.toLowerCase()}.`)
                          }
                          className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-[#11192d] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9fdcff]">
                      Quantity
                    </p>
                    <input
                      className="mt-4 w-full accent-[#8b6cff]"
                      type="range"
                      min={1}
                      max={200}
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                    />
                    <div className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-200">
                      <span>{quantity} pieces</span>
                      <span>{tier.range}</span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-400">
                      Pricing stays quantity-based so larger orders get better per-item pricing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="bg-[#f4efff] text-[#0f172a]">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 sm:py-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5b3df5]">
                  Featured products and experiences
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  A fast-scroll strip of what customers buy next.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                This section keeps the homepage compact while still showing the breadth of the brand.
              </p>
            </div>

            <div className="mt-10 grid gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {featuredItems.map((item) => (
                <article
                  key={item.title}
                  className="min-w-[18rem] rounded-[1.7rem] border border-[#d9d0ff] bg-white p-5 shadow-[0_12px_30px_rgba(91,61,245,0.08)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b3df5]">
                    {item.tag}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{item.meta}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="story" className="bg-[#090d1a] text-white">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(65,216,255,0.2),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(139,108,255,0.24),transparent_30%),linear-gradient(180deg,#10182d_0%,#0b1120_100%)] p-6">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.04)_50%,rgba(255,255,255,0.04)_75%,transparent_75%)] bg-[length:22px_22px] opacity-20" />
                <div className="relative grid min-h-[24rem] place-items-center rounded-[1.5rem] border border-white/10 bg-white/6 p-6 text-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9fdcff]">
                      Dandelion motif
                    </p>
                    <h3 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">
                      Growth, hope, imagination.
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
                      The dandelion shows up as a symbol of ideas being released into the world and turning into something real.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9fdcff]">
                  Deleana&apos;s story and purpose
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  Keep the story real, warm, and clearly marked until final copy arrives.
                </h2>
                <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300">
                  SIS Custom Creations exists to help people celebrate meaningful moments, express creativity, and turn personal ideas into something they can hold, wear, share, and remember.
                </p>
                <div className="mt-8 grid gap-3">
                  {[
                    "Authentic, family-centered creative business",
                    "Premium presentation without feeling cold",
                    "A path for custom apparel, kits, and experiences",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-sm leading-7 text-slate-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#9fdcff]">
                  Placeholder story copy until the final Deleana narrative is provided.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/our-story"
                    className="inline-flex items-center justify-center rounded-full bg-[#8b6cff] px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#9d86ff]"
                  >
                    Read Our Story
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/6 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
                  >
                    Talk to SIS
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#f4efff] text-[#0f172a]">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5b3df5]">
                  How it works
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  Keep the buying path simple.
                </h2>
                <p className="mt-6 text-sm leading-7 text-slate-600">
                  Customers do not need to read a wall of copy before they understand the next step.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {processSteps.map((step, index) => (
                  <article
                    key={step}
                    className="rounded-[1.7rem] border border-[#d9d0ff] bg-white p-5 shadow-[0_12px_30px_rgba(91,61,245,0.08)]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b3df5]">
                      0{index + 1}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                      {step}
                    </h3>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 xl:grid-cols-3">
              {pricingTiers.map((tierItem) => (
                <article
                  key={tierItem.label}
                  className="rounded-[1.7rem] border border-[#d9d0ff] bg-white p-5 shadow-[0_12px_30px_rgba(91,61,245,0.08)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b3df5]">
                    {tierItem.range}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                    {tierItem.label}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {tierItem.note}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#090d1a] text-white">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-16 sm:px-7 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9fdcff]">
                Final conversion section
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                Your idea deserves to become something real.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sis-ai-design-studio"
                className="inline-flex items-center justify-center rounded-full bg-[#8b6cff] px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#9d86ff]"
              >
                Start Creating
              </Link>
              <Link
                href="/paint-parties"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/6 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
              >
                Book an Experience
              </Link>
              <Link
                href="/diy-kits"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/6 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
              >
                Shop DIY Kits
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
