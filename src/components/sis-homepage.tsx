"use client";

import Image from "next/image";
import Link from "next/link";
import { SisHeader } from "@/components/sis-shell";

const asset = (name: string) => `/sis-real/${name}`;

const values = [
  {
    title: "Create",
    text: "Meaningful pieces, experiences, and memories people can hold onto.",
  },
  {
    title: "Connect",
    text: "Hands-on moments that bring families, teams, friends, and groups closer.",
  },
  {
    title: "Celebrate",
    text: "Personalized work for birthdays, schools, churches, teams, and milestones.",
  },
];

const services = [
  {
    title: "Splatter Paint Parties",
    label: "Messy memories",
    text: "A colorful mobile experience with setup, supplies, and cleanup handled.",
    image: asset("Splatter-Paint-Party-02.jpg"),
  },
  {
    title: "Adult Paint Parties",
    label: "Ladies nights and groups",
    text: "Guided sign parties for girls nights, showers, teams, churches, and homes.",
    image: asset("sign-party-05.jpg"),
  },
  {
    title: "DIY Kit Club",
    label: "Create at home",
    text: "Seasonal kits with prepared wood pieces, paint, brushes, and instructions.",
    image: asset("DIY-KITS-03.jpg"),
  },
];

const workCards = [
  {
    title: "Private events, ladies' nights, seasonal workshops, couples events, and mobile creative gatherings.",
    label: "Workshops",
    image: asset("sign-party-03.jpg"),
  },
  {
    title: "Sign painting, canvas nights, wood rounds, birthday themes, and confidence-building creativity.",
    label: "Paint parties",
    image: asset("kids-classes-03.jpg"),
  },
  {
    title: "Bright, joyful experiences for kids, teens, families, schools, and team-building groups.",
    label: "Kids and groups",
    image: asset("Splatter-Paint-Party-01.jpg"),
  },
  {
    title: "Personalized signs, home decor, gifts, seasonal products, acrylic designs, and meaningful keepsakes.",
    label: "Custom creations",
    image: asset("custom-signs-05.jpg"),
  },
  {
    title: "Professional shirts, hats, uniforms, team apparel, school spirit wear, and branded goods for organizations.",
    label: "Apparel",
    image: asset("Custom-apparel-01.jpg"),
  },
  {
    title: "Kids kits, adult kits, family kits, seasonal collections, classroom fun, and take-home creativity.",
    label: "DIY kits",
    image: asset("DIY-KITS-01.jpg"),
  },
];

const gallery = [
  asset("custom-signs-14.jpg"),
  asset("SIS_Logo_Facebook.png"),
  asset("Custom-Hats-01.jpg"),
  asset("DIY-KITS-15.jpg"),
  asset("sign-party-09.jpg"),
  asset("Splatter-Paint-Party-04.jpg"),
  asset("custom-signs-01.jpg"),
];

export function SisHomepage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f5fb] text-[#21182e]">
      <DandelionBackdrop />
      <SisHeader variant="home" />

      <main className="relative z-10">
        <HeroSection />
        <WhySection />
        <ValuesSection />
        <CalendarSection />
        <PremiumWorkSection />
        <InquirySection />
        <GallerySection />
        <AboutSection />
        <FinalCta />
      </main>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="px-4 pb-14 pt-8 sm:px-6 lg:pb-20">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.72fr_1fr]">
        <GlassPanel className="bg-[#5b5871]/92 p-5 text-white shadow-[0_24px_70px_rgba(73,62,104,0.28)] sm:p-7">
          <div className="relative aspect-square w-full overflow-hidden rounded-[1.45rem] bg-white/95">
            <Image
              src={asset("fresh-official-logo.png")}
              alt="SIS Custom Creations logo"
              fill
              priority
              sizes="(min-width: 1024px) 330px, 90vw"
              className="object-contain p-8"
            />
          </div>
          <h1 className="mt-6 font-display text-5xl font-black leading-[0.88] sm:text-6xl">
            SIS Custom Creations
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/84">
            Creative experiences and custom products made to bring families,
            friends, teams, and communities together.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="#inquiry" className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#44315d]">
              Book an experience
            </Link>
            <Link href="#gallery" className="rounded-full bg-[#ff7d8f] px-4 py-2 text-xs font-black text-white">
              View the work
            </Link>
          </div>
          <p className="mt-5 rounded-2xl bg-white/12 p-3 text-xs leading-5 text-white/76">
            Bring SIS to your next party, school event, fundraiser, team night,
            or custom apparel order.
          </p>
        </GlassPanel>

        <GlassPanel className="overflow-hidden p-3 shadow-[0_24px_70px_rgba(73,62,104,0.18)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-[#d8eef5]">
            <Image
              src={asset("Deleana-painted-hands.jpg")}
              alt="Deleana with paint on her hands"
              fill
              priority
              sizes="(min-width: 1024px) 610px, 94vw"
              className="object-cover"
            />
            <div className="absolute bottom-3 right-3 rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-black text-[#44315d] backdrop-blur">
              Create. Connect. Celebrate.
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section id="story" className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-black uppercase text-[#6c68c8]">My why</p>
        <h2 className="mx-auto mt-2 max-w-2xl text-center font-display text-4xl font-black leading-[0.94] sm:text-5xl">
          &ldquo;My family is the reason behind everything I do.&rdquo;
        </h2>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.76fr]">
          <GlassPanel className="p-6 sm:p-8">
            <p className="text-sm leading-7 text-[#5e5668]">
              I am a wife, mom, and grandmother. I believe every gift, party,
              and handmade moment has the chance to become part of a family
              story.
            </p>
            <p className="mt-4 text-sm leading-7 text-[#5e5668]">
              SIS Custom Creations began as a way to build something meaningful
              for my own family and grew into a place where people can slow
              down, laugh, create, and leave with something personal.
            </p>
            <p className="mt-4 text-sm leading-7 text-[#5e5668]">
              That is why SIS is not just about shirts, signs, paint, or
              products. It is about connection, memory, and celebrating the
              people God places in front of us.
            </p>
          </GlassPanel>

          <GlassPanel className="overflow-hidden p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem]">
              <Image
                src={asset("RamFam_Family_pic.jpg")}
                alt="Deleana's family"
                fill
                sizes="(min-width: 1024px) 360px, 90vw"
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <p className="text-xs font-black uppercase text-[#6c68c8]">Family</p>
              <p className="mt-2 font-display text-2xl font-black leading-7">
                Create meaningful experiences, bring people together, make
                lasting memories, and build a legacy.
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}

function ValuesSection() {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
        {values.map((value, index) => (
          <GlassPanel key={value.title} className="p-5">
            <div className="mb-3 grid h-5 w-5 place-items-center rounded-full bg-[#6c68c8] text-xs font-black text-white">
              {index + 1}
            </div>
            <h3 className="font-display text-2xl font-black">{value.title}</h3>
            <p className="mt-2 text-xs leading-5 text-[#6b6473]">{value.text}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}

function CalendarSection() {
  return (
    <section id="experiences" className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-black uppercase text-[#6c68c8]">
          Ready for a good time
        </p>
        <h2 className="mx-auto mt-2 max-w-3xl text-center font-display text-4xl font-black leading-[0.94] sm:text-5xl">
          Let&rsquo;s put something joyful on the calendar.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-[#6b6473]">
          SIS experiences feel like your group, your theme, and your people. We
          bring the prep, supplies, setup, and creative help.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {services.map((service) => (
            <GlassPanel key={service.title} className="overflow-hidden p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem]">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(min-width: 768px) 30vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-[11px] font-black uppercase text-[#6c68c8]">{service.label}</p>
                <h3 className="mt-2 font-display text-2xl font-black leading-7">{service.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#6b6473]">{service.text}</p>
                <Link href="#inquiry" className="mt-4 inline-flex rounded-full bg-[#6c68c8] px-4 py-2 text-xs font-black text-white">
                  Request a party
                </Link>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  );
}

function PremiumWorkSection() {
  return (
    <section id="work" className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-black uppercase text-[#6c68c8]">Premium handmade work</p>
        <h2 className="mx-auto mt-2 max-w-3xl text-center font-display text-4xl font-black leading-[0.94] sm:text-5xl">
          Premium handmade work with real memory behind it.
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workCards.map((card) => (
            <GlassPanel key={card.title} className="overflow-hidden p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem]">
                <Image
                  src={card.image}
                  alt={card.label}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-[11px] font-black uppercase text-[#6c68c8]">{card.label}</p>
                <p className="mt-2 text-sm font-black leading-5 text-[#21182e]">{card.title}</p>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  );
}

function InquirySection() {
  return (
    <section id="inquiry" className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase text-[#6c68c8]">Tell us what you need</p>
          <h2 className="mt-2 max-w-sm font-display text-4xl font-black leading-[0.94] sm:text-5xl">
            Tell us what you have in mind.
          </h2>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-[#5e5668]">
            <li>Experience type or product needed</li>
            <li>Date, quantity, group count, and location</li>
            <li>Theme, colors, personalization, and occasion</li>
          </ul>
        </div>

        <GlassPanel className="p-5 sm:p-6">
          <form className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" />
              <Field label="Email" type="email" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone" />
              <Field label="Experience wanted" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preferred date" />
              <Field label="Guest count / quantity" />
            </div>
            <label className="grid gap-1 text-xs font-black text-[#4a4055]">
              What should SIS help you create?
              <textarea className="min-h-28 rounded-2xl border border-[#ded8ea] bg-white/86 p-3 text-sm font-medium outline-none focus:border-[#6c68c8]" />
            </label>
            <button type="button" className="rounded-full bg-[#8fb9f6] px-5 py-3 text-sm font-black text-[#21182e]">
              Send My Request
            </button>
          </form>
        </GlassPanel>
      </div>
    </section>
  );
}

function GallerySection() {
  return (
    <section id="gallery" className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-display text-4xl font-black sm:text-5xl">Gallery</h2>
        <div className="mt-8 grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] md:grid-cols-3">
          {gallery.map((src, index) => (
            <div
              key={src}
              className={`relative overflow-hidden rounded-[1.35rem] shadow-[0_18px_50px_rgba(73,62,104,0.18)] ${
                index === 0 ? "row-span-2" : ""
              } ${index === 4 ? "col-span-2" : ""}`}
            >
              <Image
                src={src}
                alt="SIS Custom Creations gallery"
                fill
                sizes="(min-width: 768px) 30vw, 46vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.74fr_1fr] lg:items-center">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[1.6rem] shadow-[0_24px_70px_rgba(73,62,104,0.18)]">
          <Image
            src={asset("Deleana-08.jpg")}
            alt="Deleana at a creative event"
            fill
            sizes="(min-width: 1024px) 360px, 90vw"
            className="object-cover"
          />
        </div>
        <GlassPanel className="p-7 sm:p-9">
          <p className="text-xs font-black uppercase text-[#6c68c8]">About SIS</p>
          <h2 className="mt-2 font-display text-4xl font-black leading-[0.94] sm:text-5xl">
            A small business built to help people slow down and create together.
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#5e5668]">
            SIS is a mobile studio with signs, paint parties, DIY kits, custom
            apparel, and creative products for everyday families and meaningful
            moments. The heart is simple: make it personal, make it joyful, and
            make it easy for people to gather.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#5e5668]">
            The website should feel like Deleana: warm, practical, faith-rooted,
            family-centered, and full of proof that real people love what SIS
            brings to the room.
          </p>
        </GlassPanel>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="contact" className="px-4 py-16 sm:px-6 lg:py-24">
      <GlassPanel className="mx-auto max-w-3xl p-8 text-center shadow-[0_28px_80px_rgba(73,62,104,0.2)] sm:p-10">
        <p className="text-xs font-black uppercase text-[#6c68c8]">Contact</p>
        <h2 className="mt-2 font-display text-4xl font-black leading-[0.94] sm:text-5xl">
          Ready to create, connect, and celebrate?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#5e5668]">
          Start with the project, date, theme, or group. SIS can help shape the
          right experience from there.
        </p>
        <a href="mailto:hello@siscustomcreations.com" className="mt-6 inline-flex rounded-full bg-[#6c68c8] px-6 py-3 text-sm font-black text-white">
          Send SIS a note
        </a>
      </GlassPanel>
    </section>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="grid gap-1 text-xs font-black text-[#4a4055]">
      {label}
      <input
        type={type}
        className="rounded-full border border-[#ded8ea] bg-white/86 px-4 py-3 text-sm font-medium outline-none focus:border-[#6c68c8]"
      />
    </label>
  );
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[1.75rem] border border-white/78 bg-white/72 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function DandelionBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f9f7fb_0%,#f6eff8_42%,#f9f6f2_100%)]" />
      <div className="absolute left-[-18rem] top-24 h-[34rem] w-[34rem] rounded-full bg-[#dfeeff]/70 blur-3xl" />
      <div className="absolute right-[-14rem] top-72 h-[32rem] w-[32rem] rounded-full bg-[#eadfff]/80 blur-3xl" />
      <div className="absolute bottom-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#fff2f2]/80 blur-3xl" />
      <Image
        src={asset("dandelion-corner-left.png")}
        alt=""
        width={720}
        height={720}
        className="absolute -left-48 top-20 opacity-30"
      />
      <Image
        src={asset("dandelion-corner-right.png")}
        alt=""
        width={720}
        height={720}
        className="absolute -right-48 top-[42rem] opacity-30"
      />
      <Image
        src={asset("dandelion-corner-left.png")}
        alt=""
        width={720}
        height={720}
        className="absolute -left-52 top-[86rem] opacity-24"
      />
      <Image
        src={asset("dandelion-corner-right.png")}
        alt=""
        width={720}
        height={720}
        className="absolute -right-52 top-[130rem] opacity-24"
      />
    </div>
  );
}
