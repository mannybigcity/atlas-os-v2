import { FollowUpCopyButton } from "./follow-up-copy-button";

type InboundLeadLinkCardProps = {
  leadPageUrl: string;
  inboundCount: number;
  spanish: boolean;
};

/** Tells the owner where their customers can reach them, and how to spread that link. */
export function InboundLeadLinkCard({ leadPageUrl, inboundCount, spanish }: InboundLeadLinkCardProps) {
  return (
    <section className="rounded-[1.2rem] border border-[#d8c27a] bg-[#fff8e6] p-5" data-inbound-lead-card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
            {spanish ? "Tu página de clientes" : "Your lead page"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#071b42]">
            {spanish ? "Donde tus clientes te piden servicio" : "Where your customers ask you for service"}
          </h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {inboundCount} {spanish ? (inboundCount === 1 ? "recibido" : "recibidos") : "inbound"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#33415c]">
        {spanish
          ? "Pon este enlace en tu perfil de Google Business, en tu Instagram y en el mensaje que mandas cuando no puedes contestar. Cada solicitud aparece aquí como prospecto caliente, te llega por correo al instante y Amanda le confirma al cliente que lo llamarás."
          : "Put this link in your Google Business Profile, your Instagram bio, and the text you send when you cannot pick up. Every request lands here as a hot prospect, hits your email instantly, and Amanda sends the customer a receipt saying you will call."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          className="rounded-xl border border-[#d5d0c4] bg-white px-3 py-2 font-mono text-sm text-[#071b42] underline-offset-2 hover:underline"
          href={leadPageUrl}
          rel="noreferrer"
          target="_blank"
        >
          {leadPageUrl.replace(/^https?:\/\//, "")}
        </a>
        <FollowUpCopyButton spanish={spanish} text={leadPageUrl} />
      </div>
    </section>
  );
}
