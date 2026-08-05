"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendAssessmentNotification } from "@/server/notifications/resend";

const allowed = {
  customerSources: new Set([
    "referrals", "facebook", "instagram", "google", "website", "walk_ins",
    "networking", "repeat_customers", "paid_ads", "other",
  ]),
  challenges: new Set([
    "finding_customers", "getting_customers_to_buy", "not_enough_time",
    "too_much_manual_work", "hiring", "cash_flow", "marketing",
    "keeping_customers", "growing_the_business", "other",
  ]),
  evaluationAreas: new Set([
    "sales", "marketing", "operations", "customer_service", "pricing",
    "automation", "ai", "website", "branding", "hiring", "finance", "technology",
  ]),
  businessSizes: new Set(["just_me", "2_5", "6_15", "16_50", "50_plus"]),
  aiTools: new Set(["none", "chatgpt", "claude", "gemini", "copilot", "multiple"]),
  timing: new Set(["immediately", "30_days", "90_days", "exploring"]),
  monthlyLeadVolumes: new Set(["under_10", "10_25", "26_75", "76_plus", "not_sure"]),
  followUpSpeeds: new Set(["same_day", "1_2_days", "3_7_days", "when_remembered", "not_tracking"]),
  pilotBudgets: new Set(["under_500", "500_1500", "1500_3000", "3000_plus", "need_recommendation"]),
  contactPreferences: new Set(["phone", "email", "text"]),
};

function textValue(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function selectedValues(formData: FormData, name: string, choices: Set<string>) {
  return [...new Set(formData.getAll(name).map(String))].filter((value) => choices.has(value));
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (!url.hostname.includes(".")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export async function submitBusinessAssessment(formData: FormData) {
  // A human will never see this field. Bots commonly fill it.
  if (textValue(formData, "companyFax", 200)) {
    redirect("/assessment?status=received");
  }

  const businessDescription = textValue(formData, "businessDescription", 3000);
  const idealCustomer = textValue(formData, "idealCustomer", 1500);
  const customerSources = selectedValues(formData, "customerSources", allowed.customerSources);
  const biggestChallenge = textValue(formData, "biggestChallenge", 100);
  const ninetyDayGoal = textValue(formData, "ninetyDayGoal", 2000);
  const evaluationAreas = selectedValues(formData, "evaluationAreas", allowed.evaluationAreas);
  const businessSize = textValue(formData, "businessSize", 50);
  const aiTools = selectedValues(formData, "aiTools", allowed.aiTools);
  const improvementTiming = textValue(formData, "improvementTiming", 50);
  const monthlyLeadVolume = textValue(formData, "monthlyLeadVolume", 50);
  const followUpSpeed = textValue(formData, "followUpSpeed", 50);
  const pilotBudget = textValue(formData, "pilotBudget", 50);
  const preferredContactMethod = textValue(formData, "preferredContactMethod", 50);
  const contactName = textValue(formData, "contactName", 200);
  const contactEmail = textValue(formData, "contactEmail", 320).toLowerCase();
  const contactPhone = textValue(formData, "contactPhone", 50);
  const businessName = textValue(formData, "businessName", 250);
  const websiteInput = textValue(formData, "website", 500);
  const website = normalizeWebsite(websiteInput);
  const socialMedia = textValue(formData, "socialMedia", 1500);
  const consentToContact = formData.get("consentToContact") === "yes";

  const invalid =
    businessDescription.length < 10 ||
    idealCustomer.length < 3 ||
    customerSources.length === 0 ||
    !allowed.challenges.has(biggestChallenge) ||
    ninetyDayGoal.length < 5 ||
    evaluationAreas.length === 0 ||
    !allowed.businessSizes.has(businessSize) ||
    aiTools.length === 0 ||
    !allowed.timing.has(improvementTiming) ||
    !allowed.monthlyLeadVolumes.has(monthlyLeadVolume) ||
    !allowed.followUpSpeeds.has(followUpSpeed) ||
    !allowed.pilotBudgets.has(pilotBudget) ||
    !allowed.contactPreferences.has(preferredContactMethod) ||
    contactName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ||
    contactPhone.length < 7 ||
    businessName.length < 2 ||
    (websiteInput.length > 0 && !website) ||
    (socialMedia.length > 0 && socialMedia.length < 3) ||
    !consentToContact;

  if (invalid) {
    console.error("Assessment validation failed", {
      businessDescription: businessDescription.length >= 10,
      idealCustomer: idealCustomer.length >= 3,
      customerSources: customerSources.length > 0,
      biggestChallenge: allowed.challenges.has(biggestChallenge),
      ninetyDayGoal: ninetyDayGoal.length >= 5,
      evaluationAreas: evaluationAreas.length > 0,
      businessSize: allowed.businessSizes.has(businessSize),
      aiTools: aiTools.length > 0,
      improvementTiming: allowed.timing.has(improvementTiming),
      monthlyLeadVolume: allowed.monthlyLeadVolumes.has(monthlyLeadVolume),
      followUpSpeed: allowed.followUpSpeeds.has(followUpSpeed),
      pilotBudget: allowed.pilotBudgets.has(pilotBudget),
      preferredContactMethod: allowed.contactPreferences.has(preferredContactMethod),
      contactName: contactName.length >= 2,
      contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail),
      contactPhone: contactPhone.length >= 7,
      businessName: businessName.length >= 2,
      website: websiteInput.length === 0 || Boolean(website),
      socialMedia: socialMedia.length === 0 || socialMedia.length >= 3,
      consentToContact,
    });
    redirect("/assessment?error=missing_information");
  }

  const assessmentId = randomUUID();
  const submittedAt = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase.from("business_assessment_submissions").insert({
    id: assessmentId,
    business_description: businessDescription,
    ideal_customer: idealCustomer,
    customer_sources: customerSources,
    biggest_challenge: biggestChallenge,
    ninety_day_goal: ninetyDayGoal,
    evaluation_areas: evaluationAreas,
    business_size: businessSize,
    ai_tools: aiTools,
    improvement_timing: improvementTiming,
    monthly_lead_volume: monthlyLeadVolume,
    follow_up_speed: followUpSpeed,
    pilot_budget: pilotBudget,
    preferred_contact_method: preferredContactMethod,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    business_name: businessName,
    website,
    social_media: socialMedia || null,
    consent_to_contact: true,
    status: "new",
    source: "atlas_website",
  });

  if (error) {
    console.error("Business assessment submission failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/assessment?error=submit_failed");
  }

  await sendAssessmentNotification({
    id: assessmentId,
    businessName,
    contactName,
    contactEmail,
    contactPhone,
    businessDescription,
    idealCustomer,
    biggestChallenge,
    ninetyDayGoal,
    improvementTiming,
    website,
    socialMedia: socialMedia || null,
    createdAt: submittedAt,
  });

  redirect("/assessment?status=received");
}

