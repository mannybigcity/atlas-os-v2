import type { GooglePlaceProspect } from "@/server/integrations/google-places";

export type HunterSearchState = {
  status: "idle" | "success" | "error";
  message: string | null;
  query: string | null;
  places: GooglePlaceProspect[];
  persistedCount: number;
};

export const initialHunterSearchState: HunterSearchState = {
  status: "idle",
  message: null,
  query: null,
  places: [],
  persistedCount: 0,
};
