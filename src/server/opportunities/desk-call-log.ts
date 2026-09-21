import "server-only";

import { createClient } from "@/lib/supabase/server";
import { deskDateOnly, deskTimeZone } from "@/lib/desk-time";
import {
  buildDeskCallLogInsert,
  callsOnLocalDay,
  dailyCallGoalOrDefault,
  deskDayBounds,
  isMissingDeskCallLogTable,
  selectedCallLogDay,
  type DeskCallLogEntry,
} from "@/lib/lions-den/call-log";

type CallLogClient = { from: (table: string) => any };

export type AfeCallDesk = {
  timeZone: string;
  today: string;
  selectedDay: string;
  callsToday: number;
  goal: number;
  entries: DeskCallLogEntry[];
  ready: boolean;
  /** True when the call-log table is not on this database yet. */
  missing: boolean;
};

type CallLogRow = {
  id: string;
  organization_id: string;
  opportunity_id: string | null;
  prospect_name: string;
  note: string | null;
  logged_at: string;
};

function mapRow(row: CallLogRow): DeskCallLogEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    opportunityId: row.opportunity_id,
    prospectName: row.prospect_name,
    note: row.note,
    loggedAt: row.logged_at,
  };
}

async function readCallLogDay(supabase: CallLogClient, organizationId: string, day: string, timeZone: string) {
  const bounds = deskDayBounds(day, timeZone);
  if (!bounds) return { entries: [] as DeskCallLogEntry[], ready: true, missing: false };
  const { data, error } = await supabase
    .from("organization_desk_call_logs")
    .select("id, organization_id, opportunity_id, prospect_name, note, logged_at")
    .eq("organization_id", organizationId)
    .gte("logged_at", bounds.start.toISOString())
    .lt("logged_at", bounds.end.toISOString())
    .order("logged_at", { ascending: false })
    .limit(400);
  if (error) {
    const missing = isMissingDeskCallLogTable(error);
    if (!missing) console.error("Desk call log read failed", error);
    return { entries: [] as DeskCallLogEntry[], ready: false, missing };
  }
  const entries = callsOnLocalDay(((data ?? []) as CallLogRow[]).map(mapRow), day, timeZone);
  return { entries, ready: true, missing: false };
}

async function readDailyCallGoal(supabase: CallLogClient, organizationId: string) {
  const { data, error } = await supabase
    .from("organization_desk_settings")
    .select("daily_call_goal")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return dailyCallGoalOrDefault(null);
  return dailyCallGoalOrDefault((data as { daily_call_goal?: unknown }).daily_call_goal);
}

export async function getAfeCallDesk(organizationId: string, requestedDay?: string | null): Promise<AfeCallDesk> {
  const timeZone = deskTimeZone();
  const today = deskDateOnly(new Date(), timeZone);
  const selectedDay = selectedCallLogDay(requestedDay, new Date(), timeZone);
  const supabase = await createClient();
  const selected = readCallLogDay(supabase, organizationId, selectedDay, timeZone);
  const todayLog = selectedDay === today ? null : readCallLogDay(supabase, organizationId, today, timeZone);
  const [goal, selectedResult, todayResult] = await Promise.all([
    readDailyCallGoal(supabase, organizationId),
    selected,
    todayLog ?? Promise.resolve(null),
  ]);
  return {
    timeZone,
    today,
    selectedDay,
    callsToday: selectedDay === today ? selectedResult.entries.length : (todayResult?.entries.length ?? 0),
    goal,
    entries: selectedResult.entries,
    ready: selectedResult.ready && (todayResult?.ready ?? true),
    missing: selectedResult.missing || (todayResult?.missing ?? false),
  };
}

export async function appendDeskCallLog(
  supabase: CallLogClient,
  input: {
    organizationId: string;
    opportunityId: string;
    prospectName: string;
    note?: string | null;
    loggedAt: string;
  },
) {
  const row = buildDeskCallLogInsert(input);
  if (!row) return { ok: false as const, missing: false };
  const { error } = await supabase.from("organization_desk_call_logs").insert(row);
  if (!error) return { ok: true as const, missing: false };
  const missing = isMissingDeskCallLogTable(error);
  if (!missing) console.error("Desk call log append failed", error);
  return { ok: false as const, missing };
}
