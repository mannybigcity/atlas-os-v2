export type AtlasStaffRole = "atlas" | "hunter" | "micah" | "david";

export function staffHandoffLine(role: AtlasStaffRole | null) {
  if (role === "hunter") return "Handed to HUNTER.";
  if (role === "micah") return "Handed to MICAH.";
  if (role === "david") return "Handed to DAVID.";
  return null;
}

export function withStaffHandoff(role: AtlasStaffRole | null, answer: string) {
  const line = staffHandoffLine(role);
  if (!line || !answer) return answer;
  if (answer.startsWith(line)) return answer;
  return `${line} ${answer}`.slice(0, 1600);
}
