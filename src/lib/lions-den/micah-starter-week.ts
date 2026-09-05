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
    theme: "Monday Motivation",
    prompts: [
      { key: "design", label: "What are we designing today?" },
      { key: "message", label: "What's the message?" },
      { key: "vibe", label: "What's the vibe?" },
    ],
  },
  {
    day: 2,
    weekday: "Tuesday",
    theme: "Tip Tuesday",
    prompts: [{ key: "message", label: "What's one tip your customers need this week?" }],
  },
  {
    day: 3,
    weekday: "Wednesday",
    theme: "Wisdom Wednesday",
    prompts: [{ key: "message", label: "What truth or lesson should owners hear midweek?" }],
  },
  {
    day: 4,
    weekday: "Thursday",
    theme: "Throwback Thursday",
    prompts: [{ key: "message", label: "What win, before/after, or old job should we celebrate?" }],
  },
  {
    day: 5,
    weekday: "Friday",
    theme: "Feature Friday",
    prompts: [{ key: "message", label: "What offer, service, or proof do we spotlight?" }],
  },
  {
    day: 6,
    weekday: "Saturday",
    theme: "Community Saturday",
    prompts: [{ key: "message", label: "What local pride or neighbor shout-out fits?" }],
  },
  {
    day: 7,
    weekday: "Sunday",
    theme: "Sunday Rest / Prep",
    prompts: [
      { key: "message", label: "What should they rest from — and prep for Monday?" },
    ],
  },
] as const;

export type MicahStarterDay = (typeof MICAH_STARTER_DAYS)[number];

export const MICAH_BRAND_VOICES: Array<{
  id: Exclude<MicahBrandVoice, "faith">;
  label: string;
}> = [
  { id: "motivational", label: "Motivational" },
  { id: "friendly_local", label: "Friendly/local" },
  { id: "comical", label: "Comical" },
  { id: "straight", label: "Straight" },
];

export const MICAH_ONBOARDING_QUESTIONS = [
  {
    id: "name_city",
    question: "What's your business name and city?",
    demoSkip: false,
  },
  {
    id: "audience",
    question: "Who do you serve — and what do you want them to do after they see a post?",
    demoSkip: false,
  },
  {
    id: "voice",
    question: "Pick a voice: Motivational, Friendly/local, Comical, or Straight?",
    demoSkip: false,
  },
  {
    id: "faith",
    question: "Want faith/Christian language in your posts? Yes / No (default No).",
    demoSkip: true,
  },
  {
    id: "colors",
    question: "Brand colors — navy/gold OK, or send hex / a photo of your brand?",
    demoSkip: false,
  },
  {
    id: "logo",
    question: "Upload your logo file (paste as-is; never redraw).",
    demoSkip: false,
  },
  {
    id: "accounts",
    question: "Which accounts should I learn from? Facebook, Instagram, LinkedIn, TikTok — links or @handles.",
    demoSkip: false,
  },
  {
    id: "offer",
    question: "What's your main offer this week (one sentence)?",
    demoSkip: false,
  },
] as const;

export type MicahOnboardingQuestion = (typeof MICAH_ONBOARDING_QUESTIONS)[number];

export type MicahDayBrief = {
  day: number;
  design: string;
  message: string;
  vibe: string;
};

export type MicahBrandKit = {
  demeanor: MicahBrandVoice | null;
  faithLanguage: boolean;
  businessName: string;
  city: string;
  audience: string;
  weeklyOffer: string;
  navyGoldOk: boolean;
  primaryColor: string;
  secondaryColor: string;
  logoDataUri: string | null;
  brandPhotoDataUri: string | null;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
};

export function defaultMicahBrandKit(): MicahBrandKit {
  return {
    demeanor: null,
    faithLanguage: false,
    businessName: "",
    city: "",
    audience: "",
    weeklyOffer: "",
    navyGoldOk: true,
    primaryColor: MICAH_NAVY,
    secondaryColor: MICAH_GOLD,
    logoDataUri: null,
    brandPhotoDataUri: null,
    facebook: "",
    instagram: "",
    linkedin: "",
    tiktok: "",
  };
}

export function visibleMicahVoices(_demoDesk?: boolean) {
  return MICAH_BRAND_VOICES;
}

export function micahOnboardingSteps(demoDesk: boolean) {
  return MICAH_ONBOARDING_QUESTIONS.filter((item) => !(item.demoSkip && demoDesk));
}

export function isMicahBrandComplete(kit: MicahBrandKit) {
  return Boolean(kit.businessName.trim() && kit.demeanor);
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

export function parsePlainBrandText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
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
  kit?: MicahBrandKit;
  socials?: Pick<MicahBrandKit, "facebook" | "instagram" | "linkedin" | "tiktok">;
}) {
  const kit = input.kit;
  const lines = [
    "Build a 7-day MICAH week pack for the gallery. Copy/Download only. Never auto-post.",
    `Voice: ${input.demeanor}.`,
  ];
  if (kit?.businessName) {
    lines.push(`Business: ${kit.businessName}${kit.city ? ` in ${kit.city}` : ""}.`);
  }
  if (kit?.audience) lines.push(`Audience and action: ${kit.audience}.`);
  if (kit?.weeklyOffer) lines.push(`Main offer this week: ${kit.weeklyOffer}.`);
  if (kit?.faithLanguage) lines.push("Use faith/Christian language. This was an opt-in.");
  const handles = [
    (kit ?? input.socials)?.facebook ? `Facebook ${(kit ?? input.socials)?.facebook}` : "",
    (kit ?? input.socials)?.instagram ? `Instagram ${(kit ?? input.socials)?.instagram}` : "",
    (kit ?? input.socials)?.linkedin ? `LinkedIn ${(kit ?? input.socials)?.linkedin}` : "",
    (kit ?? input.socials)?.tiktok ? `TikTok ${(kit ?? input.socials)?.tiktok}` : "",
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
    "Copy/Download only. Never auto-post.",
  ].filter(Boolean);
  return parts.join(" ").slice(0, 1200);
}

export function brandKitFromMetadata(
  metadata?: Record<string, unknown> | null,
  logoDataUri?: string | null,
): MicahBrandKit | null {
  if (!isMicahBrandDraft(metadata)) return null;
  const demeanor = metadata?.micah_demeanor;
  const photo = String(metadata?.brand_photo ?? "");
  return {
    demeanor: MICAH_BRAND_VOICE_IDS.includes(demeanor as MicahBrandVoice)
      ? (demeanor as MicahBrandVoice)
      : null,
    faithLanguage: metadata?.faith_language === true,
    businessName: parsePlainBrandText(metadata?.business_name, 120),
    city: parsePlainBrandText(metadata?.city, 80),
    audience: parsePlainBrandText(metadata?.audience, 400),
    weeklyOffer: parsePlainBrandText(metadata?.weekly_offer, 240),
    navyGoldOk: metadata?.navy_gold_ok !== false,
    primaryColor: normalizeBrandColor(metadata?.primary_color, MICAH_NAVY),
    secondaryColor: normalizeBrandColor(metadata?.secondary_color, MICAH_GOLD),
    logoDataUri: logoDataUri?.startsWith("data:image/") ? logoDataUri : null,
    brandPhotoDataUri: photo.startsWith("data:image/") ? photo : null,
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
