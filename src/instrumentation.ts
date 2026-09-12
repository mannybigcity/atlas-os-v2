import type { Instrumentation } from "next";

/**
 * Next calls this for every uncaught server error: pages, server actions,
 * route handlers. It is the one place that guarantees the founder hears about
 * a broken desk without each action remembering to report.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportDeskError } = await import("@/server/observability/report-error");
  await reportDeskError(`${context.routeType}:${context.routePath || request.path}`, error, {
    method: request.method,
    path: request.path,
    routerKind: context.routerKind,
    renderSource: context.renderSource ?? null,
    revalidateReason: context.revalidateReason ?? null,
  });
};
