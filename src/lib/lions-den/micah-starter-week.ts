export const MICAH_NAVY = "#071b42";
export const MICAH_GOLD = "#f5b932";
export const MICAH_TALK_EVENT = "micah-talk-to-atlas";
export const MICAH_BRAND_VOICE_IDS = [
  "motivational",
  "friendly_local",
  "comical",
  "straight",
  "faith",
] as const;

export type MicahBrandVoice = (typeof MICAH_BRAND_VOICE_IDS)[number];

export const MICAH_STARTER_DAYS = [
  {
    day: 1,
    weekday: "Monday",
    theme: "Mon Motivation",
    themeEs: "Lunes motivación",
    hint: "A short lift for the week.",
    hintEs: "Un ánimo corto para la semana.",
  },
  {
    day: 2,
    weekday: "Tuesday",
    theme: "Tip Tuesday",
    themeEs: "Martes de consejo",
    hint: "One useful tip the shop can stand behind.",
    hintEs: "Un consejo útil que el negocio puede respaldar.",
  },
  {
    day: 3,
    weekday: "Wednesday",
    theme: "Wisdom Wednesday",
    themeEs: "Miércoles de oficio",
    hint: "A plain lesson from the work.",
    hintEs: "Una lección clara del oficio.",
  },
  {
    day: 4,
    weekday: "Thursday",
    theme: "Throwback Thursday",
    themeEs: "Jueves de recuerdos",
    hint: "A job, crew, or customer moment worth keeping.",
    hintEs: "Un trabajo, equipo o cliente que vale recordar.",
  },
  {
    day: 5,
    weekday: "Friday",
    theme: "Feature Friday",
    themeEs: "Viernes de destaque",
    hint: "The offer or service you want seen.",
    hintEs: "La oferta o el servicio que quieres mostrar.",
  },
  {
    day: 6,
    weekday: "Saturday",
    theme: "Community Saturday",
    themeEs: "Sábado de comunidad",
    hint: "Neighbors, events, or local thanks.",
    hintEs: "Vecinos, eventos o un gracias local.",
  },
  {
    day: 7,
    weekday: "Sunday",
    theme: "Sunday Rest/Prep",
    themeEs: "Domingo: descanso o prep",
    hint: "Close the week or set Monday up.",
    hintEs: "Cierra la semana o deja listo el lunes.",
  },
] as const;

export type MicahStarterDay = (typeof MICAH_STARTER_DAYS)[number];

export const MICAH_BRAND_VOICES: Array<{
  id: MicahBrandVoice;
  label: string;
  labelEs: string;
  optIn?: boolean;
}> = [
  { id: "motivational", label: "Motivational", labelEs: "Motivacional" },
  { id: "friendly_local", label: "Friendly/local", labelEs: "Amable/local" },
  { id: "comical", label: "Comical", labelEs: "Cómico" },
  { id: "straight", label: "Straight", labelEs: "Directo" },
  { id: "faith", label: "Faith", labelEs: "Fe", optIn: true },
];

export type MicahDayBrief = {
  day: number;
  design: string;
  message: string;
  vibe: string;
};

export type MicahBrandKit = {
  demeanor: MicahBrandVoice | null;
  primaryColor: string;
  secondaryColor: string;
  logoDataUri: string | null;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
};

export function defaultMicahBrandKit(): MicahBrandKit {
  return {
    demeanor: null,
    primaryColor: MICAH_NAVY,
    secondaryColor: MICAH_GOLD,
    logoDataUri: null,
    facebook: "",
    instagram: "",
    linkedin: "",
    tiktok: "",
  };
}

export function visibleMicahVoices(demoDesk: boolean) {
  return demoDesk
    ? MICAH_BRAND_VOICES.filter((voice) => voice.id !== "faith")
    : MICAH_BRAND_VOICES;
}

export function isMicahBrandDraft(metadata?: Record<string, unknown> | null) {
  return metadata?.brand_setup === true;
}

export function normalizeBrandColor(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function parseSocialHandle(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

export function parseMicahDayBriefs(formData: FormData): MicahDayBrief[] {
  return MICAH_STARTER_DAYS.map((item) => ({
    day: item.day,
    design: String(formData.get(`day-${item.day}-design`) ?? "").trim().slice(0, 160),
    message: String(formData.get(`day-${item.day}-message`) ?? "").trim().slice(0, 200),
    vibe: String(formData.get(`day-${item.day}-vibe`) ?? "").trim().slice(0, 120),
  }));
}

export function composeMicahWeekBuildPrompt(input: {
  demeanor: MicahBrandVoice;
  briefs?: MicahDayBrief[];
  focusDay?: number | null;
  socials?: Pick<MicahBrandKit, "facebook" | "instagram" | "linkedin" | "tiktok">;
}) {
  const lines = [
    "Build a 7-day MICAH week pack for the gallery. Do not post or schedule.",
    `Voice: ${input.demeanor}.`,
  ];
  const handles = [
    input.socials?.facebook ? `Facebook ${input.socials.facebook}` : "",
    input.socials?.instagram ? `Instagram ${input.socials.instagram}` : "",
    input.socials?.linkedin ? `LinkedIn ${input.socials.linkedin}` : "",
    input.socials?.tiktok ? `TikTok ${input.socials.tiktok}` : "",
  ].filter(Boolean);
  if (handles.length) {
    lines.push(`Social accounts to learn from (store only, do not scrape or log in): ${handles.join("; ")}.`);
  }

  const focus = MICAH_STARTER_DAYS.find((item) => item.day === input.focusDay);
  if (focus) {
    lines.push(`Lead with ${focus.theme}.`);
  }

  for (const day of MICAH_STARTER_DAYS) {
    const brief = input.briefs?.find((item) => item.day === day.day);
    const parts = [
      brief?.design ? `designing ${brief.design}` : "",
      brief?.message ? `message ${brief.message}` : "",
      brief?.vibe ? `vibe ${brief.vibe}` : "",
    ].filter(Boolean);
    lines.push(parts.length ? `${day.theme}: ${parts.join("; ")}.` : `${day.theme}.`);
  }

  return lines.join(" ").slice(0, 1200);
}

export function composeMicahTalkPrompt(input: {
  theme: string;
  design?: string;
  message?: string;
  vibe?: string;
}) {
  const parts = [
    `Ask MICAH for ${input.theme} as a gallery draft.`,
    input.design ? `What we are designing: ${input.design}.` : "",
    input.message ? `Message: ${input.message}.` : "",
    input.vibe ? `Vibe: ${input.vibe}.` : "",
    "Do not post or schedule.",
  ].filter(Boolean);
  return parts.join(" ").slice(0, 1200);
}

export function brandKitFromMetadata(
  metadata?: Record<string, unknown> | null,
  logoDataUri?: string | null,
): MicahBrandKit | null {
  if (!isMicahBrandDraft(metadata)) return null;
  const demeanor = metadata?.micah_demeanor;
  return {
    demeanor: MICAH_BRAND_VOICE_IDS.includes(demeanor as MicahBrandVoice)
      ? (demeanor as MicahBrandVoice)
      : null,
    primaryColor: normalizeBrandColor(metadata?.primary_color, MICAH_NAVY),
    secondaryColor: normalizeBrandColor(metadata?.secondary_color, MICAH_GOLD),
    logoDataUri: logoDataUri?.startsWith("data:image/") ? logoDataUri : null,
    facebook: parseSocialHandle(metadata?.facebook),
    instagram: parseSocialHandle(metadata?.instagram),
    linkedin: parseSocialHandle(metadata?.linkedin),
    tiktok: parseSocialHandle(metadata?.tiktok),
  };
}

export function askMicahTalk(prompt: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MICAH_TALK_EVENT, { detail: { prompt } }));
  document.getElementById("atlas-staff-prompt")?.focus();
}
