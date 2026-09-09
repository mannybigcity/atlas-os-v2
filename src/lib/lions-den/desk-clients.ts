import { isTrialSampleOpportunity } from "./trial-samples.ts";

export type DeskClient = {
  id: string;
  displayName: string;
  businessName: string | null;
  contactName?: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sourceLabel: string | null;
  lastDate: string | null;
  invoiceTotal: number | null;
  paymentTotal: number | null;
  createdAt: string;
  /** True for the example win Atlas seeds into a trial desk. */
  sample?: boolean;
};

export function wonOpportunityToDeskClient(row: {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceLabel: string | null;
  researchSummary: string;
  createdAt: string;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}): DeskClient {
  const notes = row.researchSummary.replace(/\s+/g, " ").trim();
  return {
    id: row.id,
    displayName: row.name,
    businessName: null,
    contactName: row.contactName,
    email: row.contactEmail,
    phone: row.contactPhone,
    notes: notes || null,
    sourceLabel: row.sourceLabel,
    lastDate: null,
    invoiceTotal: null,
    paymentTotal: null,
    createdAt: row.createdAt,
    sample: isTrialSampleOpportunity(row),
  };
}

export function countWonOpportunities(
  opportunities: Array<{ stage?: string | null }>,
) {
  return opportunities.filter((item) => item.stage === "won").length;
}
