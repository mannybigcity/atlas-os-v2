"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MicahBusinessIntakeProps = {
  organizationId: string;
  businessName: string;
  city: string;
  phone: string;
  website: string;
  canEdit: boolean;
  spanish: boolean;
};

export function MicahBusinessIntake({
  organizationId,
  businessName,
  city,
  phone,
  website,
  canEdit,
  spanish,
}: MicahBusinessIntakeProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "ok" | "warn">("idle");
  const hasWebsite = website.trim().length > 0;

  async function build(form: HTMLFormElement) {
    if (!canEdit || pending) return;
    setPending(true);
    try {
      const formData = new FormData(form);
      formData.set("organizationId", organizationId);
      formData.set("businessName", businessName);
      const response = await fetch("/api/client/micah/business-cards", {
        method: "POST",
        headers: { accept: "application/json" },
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        status?: string;
        message?: string;
      } | null;
      const status = payload?.status;
      setTone(status === "success" ? "ok" : "warn");
      setMessage(
        payload?.message ||
          (spanish
            ? "No se guardaron tarjetas. Nada se publicó."
            : "No cards were saved. Nothing was posted."),
      );
      if (status === "success") router.refresh();
    } catch {
      setTone("warn");
      setMessage(
        spanish
          ? "No se pudieron crear las tarjetas. Escribe tus servicios e inténtalo otra vez. Nada se publicó."
          : "MICAH couldn't build cards. List your services and try again. Nothing was posted.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-[#071b42] bg-[#fffdf6] p-4"
      data-micah-intake="open"
      id="micah-business-intake"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
        {spanish ? "Tarjetas reales" : "Real cards"}
      </p>
      <h3 className="mt-1 text-xl font-semibold text-[#071b42]">
        {spanish
          ? "Estas tarjetas tienen que ser de tu negocio."
          : "These cards have to be about your business."}
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#33415c]">
        {spanish
          ? "MICAH no publica nada y no inventa servicios, precios ni reseñas. Si tienes sitio web, lo leemos una vez. Si no, escribe lo que sí vendes."
          : "MICAH does not post anything, and it will not invent services, prices, or reviews. If you have a website, we read the public page once. If you don't, list what you actually sell."}
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void build(event.currentTarget);
        }}
      >
        <label className="block text-sm font-semibold text-[#071b42]">
          {spanish ? "Sitio web (opcional)" : "Website (optional)"}
          <input
            className="mt-1 w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm font-normal text-[#071b42] outline-none focus:border-[#071b42]"
            data-micah-intake="website"
            defaultValue={website}
            disabled={!canEdit || pending}
            inputMode="url"
            name="website"
            placeholder="https://yourbusiness.com"
          />
        </label>
        <label className="block text-sm font-semibold text-[#071b42]">
          {spanish ? "Servicios, uno por línea" : "Services, one per line"}
          <textarea
            className="mt-1 min-h-28 w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm font-normal text-[#071b42] outline-none focus:border-[#071b42]"
            data-micah-intake="services"
            disabled={!canEdit || pending}
            name="services"
            placeholder={
              spanish
                ? "Casas de brincolín\nToboganes de agua\nPistas de obstáculos"
                : "Bounce houses\nWater slides\nObstacle courses"
            }
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[#071b42]">
            {spanish ? "Teléfono (opcional)" : "Phone (optional)"}
            <input
              className="mt-1 w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm font-normal text-[#071b42] outline-none focus:border-[#071b42]"
              defaultValue={phone}
              disabled={!canEdit || pending}
              name="phone"
              type="tel"
            />
          </label>
          <label className="block text-sm font-semibold text-[#071b42]">
            {spanish ? "Ciudad o zona" : "City or service area"}
            <input
              className="mt-1 w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm font-normal text-[#071b42] outline-none focus:border-[#071b42]"
              defaultValue={city}
              disabled={!canEdit || pending}
              name="city"
            />
          </label>
        </div>
        <label className="block text-sm font-semibold text-[#071b42]">
          {spanish ? "Oferta o precio real (opcional)" : "A real offer or price (optional)"}
          <input
            className="mt-1 w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm font-normal text-[#071b42] outline-none focus:border-[#071b42]"
            data-micah-intake="offer"
            disabled={!canEdit || pending}
            name="offer"
            placeholder={
              spanish
                ? "Solo si quieres que salga en una tarjeta"
                : "Only if you want it printed on a card"
            }
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            data-micah-intake="build"
            disabled={!canEdit || pending}
            type="submit"
          >
            {pending
              ? spanish
                ? "Armando borradores…"
                : "Building drafts…"
              : hasWebsite
                ? spanish
                  ? "Crear tarjetas de mi sitio"
                  : "Build cards from my website"
                : spanish
                  ? "Crear mis tarjetas"
                  : "Build my cards"}
          </button>
          <p className="text-xs leading-5 text-[#33415c]">
            {spanish
              ? "Quedan en borrador. Tú las descargas y publicas."
              : "They stay drafts. You download and post them."}
          </p>
        </div>
      </form>
      {message ? (
        <p
          className={`mt-3 rounded-2xl px-4 py-3 text-sm leading-6 ${
            tone === "ok" ? "bg-[#edf8ef] text-[#14532d]" : "bg-[#fff8e6] text-[#071b42]"
          }`}
          data-micah-intake-status={tone}
          role={tone === "ok" ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
