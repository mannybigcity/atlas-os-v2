import type { HunterSearchFilters } from "@/server/hunter/filters";
import { emptyHunterSearchFilters } from "@/server/hunter/filters";
import type { HunterSearchFind } from "@/server/hunter/review";

export type HunterSearchState = {
  status: "idle" | "success" | "error";
  message: string | null;
  query: string | null;
  places: HunterSearchFind[];
  persistedCount: number;
  acceptedCount: number;
  tableMissing: boolean;
  rawCount: number;
  filters: HunterSearchFilters;
};

export const initialHunterSearchState: HunterSearchState = {
  status: "idle",
  message: null,
  query: null,
  places: [],
  persistedCount: 0,
  acceptedCount: 0,
  tableMissing: false,
  rawCount: 0,
  filters: emptyHunterSearchFilters,
};
