export type OperationsSummaryInput = {
  projects: Array<{ status: string }>;
  missions: Array<{ status: string }>;
  cashEntries: Array<{
    amountMinor: string;
    entryDirection: "inflow" | "outflow";
    paymentStatus: string;
    verificationStatus: string;
  }>;
};

export type OperationsSummary = {
  activeProjectCount: number;
  openMissionCount: number;
  unverifiedCashEntryCount: number;
  verifiedSettledInflowMinor: string;
  verifiedSettledOutflowMinor: string;
};

export function summarizeOperations(
  snapshot: OperationsSummaryInput,
): OperationsSummary {
  const activeProjectCount = snapshot.projects.filter((project) =>
    ["planned", "active", "on_hold"].includes(project.status),
  ).length;
  const openMissionCount = snapshot.missions.filter((mission) =>
    ["planned", "ready", "in_progress", "blocked"].includes(mission.status),
  ).length;
  const unverifiedCashEntryCount = snapshot.cashEntries.filter(
    (entry) => entry.verificationStatus !== "verified",
  ).length;

  const verifiedSettledEntries = snapshot.cashEntries.filter(
    (entry) =>
      entry.verificationStatus === "verified" &&
      ["settled", "refunded"].includes(entry.paymentStatus),
  );

  return {
    activeProjectCount,
    openMissionCount,
    unverifiedCashEntryCount,
    verifiedSettledInflowMinor: sumMinor(
      verifiedSettledEntries
      .filter((entry) => entry.entryDirection === "inflow")
      .map((entry) => entry.amountMinor),
    ),
    verifiedSettledOutflowMinor: sumMinor(
      verifiedSettledEntries
      .filter((entry) => entry.entryDirection === "outflow")
      .map((entry) => entry.amountMinor),
    ),
  };
}

function sumMinor(values: string[]) {
  return values.reduce(
    (total, value) => (BigInt(total) + BigInt(value)).toString(),
    "0",
  );
}
