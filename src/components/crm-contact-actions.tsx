type ContactActionsProps = {
  email: string | null;
  phone: string | null;
  businessName: string;
  size?: "sm" | "md";
};

function telHref(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : null;
}

function smsHref(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `sms:${digits}` : null;
}

function mailHref(email: string, businessName: string) {
  const subject = encodeURIComponent(`Atlas · next step for ${businessName}`);
  return `mailto:${email}?subject=${subject}`;
}

// Device-native call, email, and text links. They open the phone dialer or
// mail client; Atlas itself never sends anything from these buttons.
export function CrmContactActions({ businessName, email, phone, size = "sm" }: ContactActionsProps) {
  const base =
    size === "sm"
      ? "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
      : "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition";
  const enabled = `${base} border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:text-blue-700`;
  const disabled = `${base} cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-400`;
  const tel = phone ? telHref(phone) : null;
  const sms = phone ? smsHref(phone) : null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Contact actions">
      {tel ? (
        <a className={enabled} href={tel}>
          <span aria-hidden>☏</span> Call
        </a>
      ) : (
        <span className={disabled} title="No phone number on record">
          <span aria-hidden>☏</span> Call
        </span>
      )}
      {email ? (
        <a className={enabled} href={mailHref(email, businessName)}>
          <span aria-hidden>✉</span> Email
        </a>
      ) : (
        <span className={disabled} title="No email on record">
          <span aria-hidden>✉</span> Email
        </span>
      )}
      {sms ? (
        <a className={enabled} href={sms}>
          <span aria-hidden>▤</span> Text
        </a>
      ) : (
        <span className={disabled} title="No phone number on record">
          <span aria-hidden>▤</span> Text
        </span>
      )}
    </div>
  );
}
