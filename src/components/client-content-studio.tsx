import { MicahWeekGallery } from "@/components/micah-week-gallery";
import {
  readOfficialAtlasLogoDataUri,
  selectMicahWeekGallery,
} from "@/server/content-studio/gallery-art";
import type { ContentStudio } from "@/server/content-studio/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

type ClientContentStudioProps = {
  organizationId: string;
  canReview: boolean;
  demoDesk?: boolean;
  studio: ContentStudio;
};

export async function ClientContentStudio({
  organizationId,
  canReview,
  demoDesk = false,
  studio,
}: ClientContentStudioProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const cards = selectMicahWeekGallery(studio.drafts, {
    demoDesk,
    logoDataUri: readOfficialAtlasLogoDataUri(),
  });

  return (
    <section
      className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5"
      id="content-studio"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            MICAH
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
            {spanish ? "7 tarjetas de la semana" : "This week's 7 day-cards"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Cada tarjeta tiene un gráfico descargable y un texto que puedes copiar. MICAH no publica en Facebook ni Instagram. El calendario de citas está en Calendario."
              : "Each card has a downloadable navy/gold graphic and a caption you can copy. MICAH does not post to Facebook or Instagram. Appointments stay on Calendar."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]">
            {cards.length} {spanish ? "días" : "day-cards"}
          </span>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "Todavía no hay una semana. Pídele a Atlas un paquete de 7 días. MICAH preguntará la voz una vez y no publicará nada."
            : "Nothing in it yet. Ask Talk to Atlas for a 7-day week pack. MICAH will ask for a voice once and will not post anything."}
        </p>
      ) : (
        <MicahWeekGallery
          canReview={canReview}
          cards={cards}
          organizationId={organizationId}
          spanish={spanish}
        />
      )}
    </section>
  );
}
