import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type BusinessAssessment = {
  id: string;
  businessDescription: string;
  idealCustomer: string;
  customerSources: string[];
  biggestChallenge: string;
  ninetyDayGoal: string;
  evaluationAreas: string[];
  businessSize: string;
  aiTools: string[];
  improvementTiming: string;
  monthlyLeadVolume: string;
  followUpSpeed: string;
  pilotBudget: string;
  preferredContactMethod: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessName: string;
  website: string | null;
  socialMedia: string | null;
  status: "new" | "contacted" | "qualified" | "not_a_fit" | "converted";
  createdAt: string;
  updatedAt: string;
};

type BusinessAssessmentRow = {
  id: string;
  business_description: string;
  ideal_customer: string;
  customer_sources: string[];
  biggest_challenge: string;
  ninety_day_goal: string;
  evaluation_areas: string[];
  business_size: string;
  ai_tools: string[];
  improvement_timing: string;
  monthly_lead_volume: string;
  follow_up_speed: string;
  pilot_budget: string;
  preferred_contact_method: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  business_name: string;
  website: string | null;
  social_media: string | null;
  status: BusinessAssessment["status"];
  created_at: string;
  updated_at: string;
};

export async function getBusinessAssessments(): Promise<
  WorkspaceQueryResult<BusinessAssessment[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_assessment_submissions")
    .select(
      "id, business_description, ideal_customer, customer_sources, biggest_challenge, ninety_day_goal, evaluation_areas, business_size, ai_tools, improvement_timing, monthly_lead_volume, follow_up_speed, pilot_budget, preferred_contact_method, contact_name, contact_email, contact_phone, business_name, website, social_media, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { data: [], setupRequired: true, error: error.message };
  }

  return {
    data: ((data ?? []) as BusinessAssessmentRow[]).map((row) => ({
      id: row.id,
      businessDescription: row.business_description,
      idealCustomer: row.ideal_customer,
      customerSources: row.customer_sources,
      biggestChallenge: row.biggest_challenge,
      ninetyDayGoal: row.ninety_day_goal,
      evaluationAreas: row.evaluation_areas,
      businessSize: row.business_size,
      aiTools: row.ai_tools,
      improvementTiming: row.improvement_timing,
      monthlyLeadVolume: row.monthly_lead_volume,
      followUpSpeed: row.follow_up_speed,
      pilotBudget: row.pilot_budget,
      preferredContactMethod: row.preferred_contact_method,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      businessName: row.business_name,
      website: row.website,
      socialMedia: row.social_media,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    setupRequired: false,
    error: null,
  };
}
