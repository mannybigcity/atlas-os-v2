"use client";

/**
 * When a desk page throws, the owner gets a plain sentence and a retry, not a
 * blank screen. The server side has already reported it to the founder.
 */
export default function ClientDeskError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-[#071b42]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">The Lion’s Den</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Something on the desk did not load.</h1>
      <p className="mt-3 text-sm leading-6 text-[#33415c]">
        Nothing was sent and nothing was lost. The founder has been told. Try again, or go back to the desk.
      </p>
      <p className="mt-1 text-sm leading-6 text-[#5c6578]">
        Algo no cargó. No se envió ni se perdió nada. Inténtalo de nuevo o regresa al escritorio.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" onClick={() => reset()} type="button">
          Try again · Reintentar
        </button>
        <a className="rounded-full border border-[#d5d0c4] px-4 py-2 text-sm font-semibold text-[#071b42]" href="/client">
          Back to the desk · Volver
        </a>
      </div>
    </main>
  );
}
