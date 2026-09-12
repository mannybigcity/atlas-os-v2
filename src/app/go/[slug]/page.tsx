import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { inboundLeadStatusCopy } from "@/lib/lions-den/inbound-leads";
import { getLeadPageOrganization } from "@/server/leads/queries";
import { submitInboundLead } from "@/server/leads/actions";

export const dynamic = "force-dynamic";

type LeadPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string; lead?: string }>;
};

export async function generateMetadata({ params }: LeadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const organization = await getLeadPageOrganization(slug);
  return {
    title: organization ? `Request service | ${organization.name}` : "Request service",
    robots: { index: false, follow: false },
  };
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-base text-[#071b42] focus:border-[#071b42] focus:outline-none";
const labelClass = "block text-sm font-semibold text-[#071b42]";

export default async function LeadPage({ params, searchParams }: LeadPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const spanish = query?.lang === "es";
  const organization = await getLeadPageOrganization(slug);
  if (!organization) notFound();

  const status = inboundLeadStatusCopy(query?.lead, spanish);
  const sent = query?.lead === "sent";

  return (
    <main className="min-h-screen bg-[#fbfaf4] px-4 py-10 text-[#071b42] sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a6a12]">
          {spanish ? "Solicitar servicio" : "Request service"}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{organization.name}</h1>
        <p className="mt-3 text-base leading-7 text-[#33415c]">
          {spanish
            ? "Cuéntanos qué necesitas y te llamamos. Sin cuentas, sin esperas."
            : "Tell us what you need and we will call you back. No account, no waiting on hold."}
        </p>

        {status ? (
          <p
            className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
              sent ? "border-[#d8c27a] bg-[#fff8e6]" : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
            data-lead-status={query?.lead}
          >
            {status}
          </p>
        ) : null}

        {sent ? (
          <p className="mt-4 text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Si es una emergencia, llama directamente. Tu solicitud ya está en manos del equipo."
              : "If this is an emergency, call directly. Your request is already with the team."}
          </p>
        ) : (
          <form action={submitInboundLead} className="mt-8 space-y-4 rounded-[1.4rem] border border-[#d5d0c4] bg-white p-5 sm:p-6">
            <input name="slug" type="hidden" value={organization.slug} />
            <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
            <div aria-hidden="true" className="hidden">
              <label>
                Company
                <input autoComplete="off" name="company" tabIndex={-1} type="text" />
              </label>
            </div>

            <label className={labelClass}>
              {spanish ? "Tu nombre" : "Your name"}
              <input autoComplete="name" className={fieldClass} maxLength={180} minLength={2} name="name" required type="text" />
            </label>
            <label className={labelClass}>
              {spanish ? "Teléfono para llamarte" : "Phone number to call you back"}
              <input
                autoComplete="tel"
                className={fieldClass}
                inputMode="tel"
                maxLength={80}
                name="phone"
                placeholder="(713) 555-0100"
                required
                type="tel"
              />
            </label>
            <label className={labelClass}>
              {spanish ? "¿Qué necesitas?" : "What do you need?"}
              <textarea
                className={fieldClass}
                maxLength={2000}
                minLength={10}
                name="problem"
                placeholder={
                  spanish
                    ? "Ej. Gotera bajo el fregadero de la cocina, empezó hoy."
                    : "e.g. Leak under the kitchen sink, started this morning."
                }
                required
                rows={4}
              />
            </label>
            <label className={labelClass}>
              {spanish ? "Dirección (opcional)" : "Address (optional)"}
              <input autoComplete="street-address" className={fieldClass} maxLength={500} name="address" type="text" />
            </label>
            <label className={labelClass}>
              {spanish ? "Correo (opcional, para confirmarte)" : "Email (optional, for a confirmation)"}
              <input autoComplete="email" className={fieldClass} maxLength={320} name="email" type="email" />
            </label>

            <button
              className="w-full rounded-full bg-[#071b42] px-5 py-3.5 text-base font-bold text-white transition hover:bg-[#0a2a5c]"
              type="submit"
            >
              {spanish ? "Enviar y que me llamen" : "Send it and call me back"}
            </button>
            <p className="text-xs leading-5 text-[#5c6578]">
              {spanish
                ? `Tu información va solo a ${organization.name}. Sin listas de correo.`
                : `Your details go only to ${organization.name}. No mailing lists.`}
            </p>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-[#9aa3b5]">
          <a className="underline" href={`/go/${organization.slug}?lang=${spanish ? "en" : "es"}`}>
            {spanish ? "English" : "Español"}
          </a>
        </p>
      </div>
    </main>
  );
}
