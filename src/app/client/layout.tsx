import type { ReactNode } from "react";

/**
 * Ask Atlas may poll the file queue for 90s before the silent OpenAI fallback.
 * The flag stays off, so this only raises the ceiling for /client server work.
 */
export const maxDuration = 120;

export default function ClientWorkspaceLayout({ children }: { children: ReactNode }) {
  return children;
}
