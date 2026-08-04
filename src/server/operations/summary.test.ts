import assert from "node:assert/strict";
import test from "node:test";
import { summarizeOperations } from "./summary.ts";

test("summarizes open work and only verified settled cash", () => {
  const result = summarizeOperations({
    projects: [
      { status: "active" },
      { status: "completed" },
      { status: "archived" },
    ],
    missions: [
      { status: "in_progress" },
      { status: "blocked" },
      { status: "completed" },
    ],
    cashEntries: [
      {
        amountMinor: "12500",
        entryDirection: "inflow",
        paymentStatus: "settled",
        verificationStatus: "verified",
      },
      {
        amountMinor: "9000",
        entryDirection: "inflow",
        paymentStatus: "settled",
        verificationStatus: "unverified",
      },
      {
        amountMinor: "2500",
        entryDirection: "outflow",
        paymentStatus: "refunded",
        verificationStatus: "verified",
      },
    ],
  });

  assert.deepEqual(result, {
    activeProjectCount: 1,
    openMissionCount: 2,
    unverifiedCashEntryCount: 1,
    verifiedSettledInflowMinor: "12500",
    verifiedSettledOutflowMinor: "2500",
  });
});

test("empty operations stay empty and truthful", () => {
  assert.deepEqual(
    summarizeOperations({ projects: [], missions: [], cashEntries: [] }),
    {
      activeProjectCount: 0,
      openMissionCount: 0,
      unverifiedCashEntryCount: 0,
      verifiedSettledInflowMinor: "0",
      verifiedSettledOutflowMinor: "0",
    },
  );
});
