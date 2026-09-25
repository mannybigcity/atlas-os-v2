"use client";

import { useActionState } from "react";
import {
  createSignScoutDeviceToken,
  revokeSignScoutDeviceToken,
  type SignScoutDeviceTokenView,
  type SignScoutTokenCreateState,
} from "@/server/signscout/tokens";
import { LD_CHIP } from "@/lib/lions-den/desk-chips";

const initialCreate: SignScoutTokenCreateState = { token: null, error: null };

type SignScoutTokenPanelProps = {
  organizationId: string;
  tokens: SignScoutDeviceTokenView[];
  setupRequired: boolean;
  migration: string;
  spanish: boolean;
};

function formatWhen(value: string | null, spanish: boolean) {
  if (!value) return spanish ? "Nunca" : "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(spanish ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SignScoutTokenPanel({
  organizationId,
  tokens,
  setupRequired,
  migration,
  spanish,
}: SignScoutTokenPanelProps) {
  const [created, createToken, creating] = useActionState(createSignScoutDeviceToken, initialCreate);

  return (
    <section className="ld-panel" id="signscout-tokens" data-signscout-tokens>
      <div className="ld-panel-head">
        <p>SignScout</p>
      </div>
      <div className="ld-panel-body">
        <h2 className="text-xl font-semibold text-[#071b42]">
          {spanish ? "Dispositivos de SignScout" : "SignScout devices"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5c6578]">
          {spanish
            ? "Crea un token para el teléfono que usa SignScout. Atlas lo muestra una sola vez y guarda solo un hash. Un lead enviado llega a la pila de revisión de HUNTER y no es un prospecto hasta que lo aceptes. Atlas no envía correos, llamadas ni SMS."
            : "Create a token for the phone running SignScout. Atlas shows it once and stores only a hash. A sent lead lands in the HUNTER review pile and is not a Prospect until you accept it. Atlas does not email, call, or text anyone."}
        </p>

        {setupRequired ? (
          <p className="mt-4 rounded-md border border-[#e9d9a6] bg-[#fff8e6] px-3 py-2 text-sm text-[#5c4a12]">
            {spanish ? "Fundador: ejecuta " : "Founder: apply "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs">{migration}</code>
            {spanish
              ? " en el editor SQL de Supabase. Este archivo no se aplica solo."
              : " in the Supabase SQL editor. This file is not applied automatically."}
          </p>
        ) : null}

        <form action={createToken} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label className="block flex-1 text-sm font-semibold text-[#071b42]">
            {spanish ? "Nombre del dispositivo" : "Device name"}
            <input
              className="mt-1 w-full rounded-md border border-[#d8c27a] bg-white px-3 py-2 text-sm font-medium"
              maxLength={80}
              name="label"
              placeholder={spanish ? "Teléfono de Manny" : "Manny's phone"}
              required
            />
          </label>
          <button
            className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={creating}
            type="submit"
          >
            {spanish ? "Crear token" : "Create token"}
          </button>
        </form>

        {created.error ? (
          <p className="mt-3 text-sm font-medium text-[#8a2a2a]" role="alert">
            {created.error}
          </p>
        ) : null}

        {created.token ? (
          <div className="mt-4 rounded-md border border-[#d8c27a] bg-[#fff8e6] p-3" data-signscout-token-once>
            <p className="text-sm font-semibold text-[#071b42]">
              {spanish
                ? "Copia este token ahora. Atlas no lo volverá a mostrar."
                : "Copy this token now. Atlas will not show it again."}
            </p>
            <p className="mt-1 text-xs text-[#5c6578]">
              {spanish
                ? "Pégalo en SignScout → Ajustes. No lo subas a git ni lo pongas en el build."
                : "Paste it into SignScout → Settings. Do not commit it or bake it into a build."}
            </p>
            <input
              aria-label={spanish ? "Token de SignScout" : "SignScout device token"}
              className="mt-2 w-full rounded-md border border-[#d8c27a] bg-white px-3 py-2 font-mono text-xs"
              readOnly
              value={created.token}
            />
            <button
              className={`mt-2 ${LD_CHIP}`}
              onClick={() => {
                void navigator.clipboard.writeText(created.token ?? "");
              }}
              type="button"
            >
              {spanish ? "Copiar" : "Copy"}
            </button>
          </div>
        ) : null}

        {tokens.length ? (
          <ul className="mt-5 divide-y divide-[#ece7d8] border-t border-[#ece7d8]">
            {tokens.map((token) => (
              <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" key={token.id}>
                <div>
                  <p className="font-semibold text-[#071b42]">{token.label}</p>
                  <p className="text-xs text-[#5c6578]">
                    {spanish ? "Creado" : "Created"} {formatWhen(token.createdAt, spanish)}
                    {" · "}
                    {spanish ? "Último uso" : "Last used"} {formatWhen(token.lastUsedAt, spanish)}
                    {token.revokedAt
                      ? ` · ${spanish ? "Revocado" : "Revoked"} ${formatWhen(token.revokedAt, spanish)}`
                      : ""}
                  </p>
                </div>
                {token.revokedAt ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">
                    {spanish ? "Revocado" : "Revoked"}
                  </span>
                ) : (
                  <form action={revokeSignScoutDeviceToken}>
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="tokenId" type="hidden" value={token.id} />
                    <button className={LD_CHIP} type="submit">
                      {spanish ? "Revocar" : "Revoke"}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[#5c6578]">
            {spanish ? "Todavía no hay dispositivos." : "No devices yet."}
          </p>
        )}
      </div>
    </section>
  );
}
