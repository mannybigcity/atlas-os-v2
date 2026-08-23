"use client";

import { useEffect, useState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import { createClient } from "@/lib/supabase/browser";

type Enrollment = { id: string; qrCode: string };

export function AtlasMfaEnrollment() {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (error) { setStatus(spanish ? "No se pudo comprobar el estado de MFA. Actualiza la página e inténtalo de nuevo." : "Unable to check MFA status. Refresh and try again."); return; }
      setStatus(data.currentLevel === "aal2" ? spanish ? "MFA está activo en esta sesión." : "MFA is active for this session." : spanish ? "MFA todavía no está activo." : "MFA is not active yet.");
    });
  }, [spanish]);

  async function startEnrollment() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Atlas Authenticator" });
    setBusy(false);
    if (error || !data.totp) { setStatus(error?.message ?? (spanish ? "No se pudo iniciar la inscripción de MFA." : "Could not start MFA enrollment.")); return; }
    setEnrollment({ id: data.id, qrCode: data.totp.qr_code });
    setStatus(spanish ? "Escanea el código QR con tu aplicación de autenticación y escribe el código de seis dígitos." : "Scan the QR code with your authenticator app, then enter its six-digit code.");
  }

  async function verify() {
    if (!enrollment || !/^\d{6}$/.test(code)) { setStatus(spanish ? "Escribe el código de seis dígitos de tu aplicación de autenticación." : "Enter the six-digit code from your authenticator app."); return; }
    setBusy(true);
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.id });
    if (challenge.error) { setBusy(false); setStatus(challenge.error.message); return; }
    const result = await supabase.auth.mfa.verify({ factorId: enrollment.id, challengeId: challenge.data.id, code });
    setBusy(false);
    if (result.error) { setStatus(result.error.message); return; }
    setEnrollment(null); setCode(""); setStatus(spanish ? "MFA está activo. Tu cuenta de Atlas ahora requiere el autenticador cuando se solicite." : "MFA is active. Your Atlas account now requires your authenticator when challenged.");
  }

  return <section className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">{spanish ? "Seguridad de la cuenta" : "Account security"}</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-slate-950">{spanish ? "Configurar MFA con autenticador" : "Set up authenticator MFA"}</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">{spanish ? "Usa una aplicación de autenticación como 1Password, Authy, Google Authenticator o Apple Passwords. Mantén un segundo dispositivo inscrito cuando sea posible." : "Use an authenticator app such as 1Password, Authy, Google Authenticator, or Apple Passwords. Keep a second enrolled device where possible."}</p>
    {!enrollment ? <button className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={startEnrollment} type="button">{busy ? spanish ? "Iniciando…" : "Starting…" : spanish ? "Configurar MFA" : "Set up MFA"}</button> : <div className="mt-6 space-y-4"><img alt={spanish ? "Código QR de MFA de Atlas" : "Atlas MFA QR code"} className="h-52 w-52 rounded-xl border border-slate-200 bg-white p-3" src={enrollment.qrCode} /><label className="block text-sm font-semibold text-slate-700">{spanish ? "Código del autenticador" : "Authenticator code"}<input autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} value={code} /></label><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={verify} type="button">{busy ? spanish ? "Verificando…" : "Verifying…" : spanish ? "Verificar MFA" : "Verify MFA"}</button></div>}
    <p aria-live="polite" className="mt-5 text-sm leading-6 text-slate-600">{status || (spanish ? "Comprobando la seguridad de la cuenta…" : "Checking account security…")}</p>
  </section>;
}
