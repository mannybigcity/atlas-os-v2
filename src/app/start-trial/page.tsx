import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSiteLanguage } from "@/lib/site-language-server";
import { startTrial } from "@/server/auth/actions";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Comienza tu prueba gratis de 7 días | Atlas para emprendedores" : "Start Your 7-Day Free Trial | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Conoce el proceso de inscripción de siete días de prueba de Atlas sin tarjeta."
        : "Preview the no-card seven-day Atlas trial enrollment journey.",
    robots: { index: false, follow: false },
  };
}

const fields = [
  { name: "fullName", en: ["Full name", "Your name"], es: ["Nombre completo", "Tu nombre"], type: "text" },
  { name: "businessName", en: ["Business name", "Your business"], es: ["Nombre del negocio", "Tu negocio"], type: "text" },
  { name: "email", en: ["Email", "you@business.com"], es: ["Correo electrónico", "tu@negocio.com"], type: "email" },
  { name: "phone", en: ["Phone", "Your phone number"], es: ["Teléfono", "Tu número de teléfono"], type: "tel" },
] as const;

export default async function StartTrialPage({ searchParams }: { searchParams?: Promise<{ error?: string; status?: string }> }) {
  const params = await searchParams;
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        brand: "Atlas para emprendedores",
        title: "Comienza tu prueba gratis de 7 días.",
        description: "Obtén un espacio de trabajo inicial enfocado en prospectos, pipeline, seguimiento y próximas acciones.",
        bullets: ["✓ No necesitas tarjeta", "✓ Siete días para explorar el espacio de trabajo inicial", "✓ Actualiza después de siete días si Atlas es adecuado para tu negocio"],
        footnote: "Tu cuenta se crea solo después de enviar este formulario. Debes verificar tu correo antes de abrir el espacio de trabajo inicial.",
        enrollment: "Inscripción de prueba",
        formTitle: "Cuéntanos sobre tu negocio",
        formDescription: "Completa estos datos para preparar tu espacio de trabajo inicial.",
        message: params?.status === "check_email"
          ? "Revisa tu correo para confirmar tu dirección. Tu prueba de siete días comienza cuando se cree tu perfil después de la confirmación."
          : params?.error === "validation"
            ? "Completa todos los campos, acepta los términos y la política de privacidad, y confirma que ambas contraseñas coincidan."
            : params?.error === "weak_password"
              ? "Usa al menos 12 caracteres con mayúsculas, minúsculas, un número y un símbolo."
              : params?.error
                ? "No pudimos iniciar la prueba. Revisa tus datos e inténtalo otra vez."
                : null,
        businessType: "Tipo de negocio",
        businessTypePlaceholder: "Elige un tipo de negocio",
        growthGoal: "Meta principal de crecimiento",
        growthPlaceholder: "¿Qué te gustaría mejorar más en los próximos 90 días?",
        createPassword: "Crea una contraseña",
        confirmPassword: "Confirma la contraseña",
        consent: "Acepto los términos y la política de privacidad de Atlas.",
        terms: "términos",
        privacy: "política de privacidad",
        submit: "Comenzar mi prueba gratis de 7 días",
        noCard: "No necesitas tarjeta. Actualiza después de siete días si Atlas es adecuado para tu negocio.",
        options: [
          ["Contractor or home service", "Contratista o servicio para el hogar"],
          ["Professional service", "Servicio profesional"],
          ["Retail or ecommerce", "Comercio minorista o comercio electrónico"],
          ["Other small business", "Otro negocio pequeño"],
        ],
      }
    : {
        brand: "Atlas For Entrepreneurs",
        title: "Start your 7-day free trial.",
        description: "Get a focused starter workspace for leads, pipeline, follow-up, and next actions.",
        bullets: ["✓ No card required", "✓ Seven days to explore the starter workspace", "✓ Upgrade after seven days if Atlas is right for your business"],
        footnote: "Your account is created only after you submit this form. Email verification is required before the starter workspace opens.",
        enrollment: "Trial enrollment",
        formTitle: "Tell us about your business",
        formDescription: "Complete these details so your starter workspace can be prepared.",
        message: params?.status === "check_email"
          ? "Check your email to confirm your address. Your seven-day trial begins when your profile is created after confirmation."
          : params?.error === "validation"
            ? "Complete every field, accept the terms and privacy policy, and make sure both passwords match."
            : params?.error === "weak_password"
              ? "Use at least 12 characters with uppercase, lowercase, a number, and a symbol."
              : params?.error
                ? "We could not start the trial. Check your details and try again."
                : null,
        businessType: "Business type",
        businessTypePlaceholder: "Choose a business type",
        growthGoal: "Primary growth goal",
        growthPlaceholder: "What would you most like to improve in the next 90 days?",
        createPassword: "Create a password",
        confirmPassword: "Confirm password",
        consent: "I agree to the Atlas terms and privacy policy.",
        terms: "terms",
        privacy: "privacy policy",
        submit: "Start my 7-day free trial",
        noCard: "No card required. Upgrade after seven days if Atlas is right for your business.",
        options: [
          ["Contractor or home service", "Contractor or home service"],
          ["Professional service", "Professional service"],
          ["Retail or ecommerce", "Retail or ecommerce"],
          ["Other small business", "Other small business"],
        ],
      };

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#071b42]">
      <SiteHeader />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-20">
        <div className="self-start rounded-[2rem] bg-[#061631] p-7 text-white shadow-[0_1.5rem_3.5rem_rgba(6,27,82,.16)] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd068]">{copy.brand}</p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl font-black leading-[.95] tracking-[-.07em] sm:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/80">
            {copy.description}
          </p>
          <div className="mt-8 space-y-3 text-sm font-semibold text-blue-100">
            {copy.bullets.map((bullet) => <p key={bullet}>{bullet}</p>)}
          </div>
          <p className="mt-8 border-t border-white/15 pt-6 text-xs leading-6 text-blue-100/65">
            {copy.footnote}
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#dfe5ef] bg-white p-6 shadow-[0_1.5rem_3.5rem_rgba(6,27,82,.08)] sm:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">{copy.enrollment}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">{copy.formTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.formDescription}</p>
          </div>
          <form action={startTrial} className="mt-7 space-y-5">
            {copy.message ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">{copy.message}</div> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => {
                const [label, placeholder] = language === "es" ? field.es : field.en;

                return (
                <label className="block space-y-2" key={field.name}>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <input aria-label={label} className="assessment-field" name={field.name} placeholder={placeholder} required type={field.type} />
                </label>
                );
              })}
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">{copy.businessType}</span>
              <select aria-label={copy.businessType} className="assessment-field" defaultValue="" name="businessType" required>
                <option disabled value="">{copy.businessTypePlaceholder}</option>
                {copy.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">{copy.growthGoal}</span>
              <textarea aria-label={copy.growthGoal} className="assessment-field assessment-textarea" name="primaryGrowthGoal" placeholder={copy.growthPlaceholder} required />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">{copy.createPassword}</span><input autoComplete="new-password" className="assessment-field" minLength={12} name="password" required type="password" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">{copy.confirmPassword}</span><input autoComplete="new-password" className="assessment-field" minLength={12} name="confirmPassword" required type="password" /></label>
            </div>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input aria-label={copy.consent} className="mt-1 h-4 w-4 accent-[#1246a0]" name="consent" required type="checkbox" />
              <span>{language === "es" ? "Acepto los " : "I agree to the Atlas "}<Link className="font-semibold text-[#1246a0]" href="/terms">{copy.terms}</Link>{language === "es" ? " y la " : " and "}<Link className="font-semibold text-[#1246a0]" href="/privacy">{copy.privacy}</Link>{language === "es" ? " de Atlas." : "."}</span>
            </label>
            <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#f5b932] px-5 text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]" type="submit">
              {copy.submit}
            </button>
            <p className="text-center text-xs leading-5 text-slate-500">{copy.noCard}</p>
          </form>
        </div>
      </section>
    </main>
  );
}
