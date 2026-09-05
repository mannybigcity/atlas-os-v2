type HunterFunnelStripProps = {
  spanish: boolean;
};

export function HunterFunnelStrip({ spanish }: HunterFunnelStripProps) {
  const steps = spanish
    ? ["Buscar", "Revisar", "Aceptar", "Prospecto", "Seguimiento"]
    : ["Find", "Review", "Accept", "Prospect", "Follow-up"];

  return (
    <div className="mt-4 rounded-2xl border border-[#ece7d8] bg-[#fbfaf4] px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#071b42]">
        {steps.join(" → ")}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#33415c]">
        {spanish
          ? "HUNTER empieza el crecimiento. Tú aceptas. Atlas redacta el seguimiento. Tú apruebas el envío."
          : "HUNTER starts growth. You accept. Atlas drafts follow-up. You approve send."}
      </p>
    </div>
  );
}
