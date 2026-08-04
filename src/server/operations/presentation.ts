export type OperationsSurfaceState = "connected" | "empty" | "needs-input";

export function getOperationsSurfaceState(
  setupRequired: boolean,
  recordCount: number,
): OperationsSurfaceState {
  if (setupRequired) return "needs-input";
  return recordCount > 0 ? "connected" : "empty";
}

export function formatMinorAmount(amountMinor: string, currency: string) {
  const label = currency.trim().toUpperCase() || "USD";

  try {
    const minor = BigInt(amountMinor);
    const sign = minor < BigInt(0) ? "-" : "";
    const absolute = minor < BigInt(0) ? -minor : minor;
    const major = absolute / BigInt(100);
    const cents = absolute % BigInt(100);
    const groupedMajor = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return `${label} ${sign}${groupedMajor}.${cents.toString().padStart(2, "0")}`;
  } catch {
    return `${label} unavailable`;
  }
}
