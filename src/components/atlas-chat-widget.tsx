"use client";

import { useActionState, useEffect, useState } from "react";
import { askAtlasPreview } from "@/server/atlas-chat/actions";

type ChatState = {
  ok: boolean;
  error?: string;
  assessmentCta?: boolean;
  response?: {
    answer: string;
    nextSteps: string[];
    followUpQuestion: string;
  };
};

const initialState: ChatState = { ok: false };
const CHAT_LIMIT = 3;
const CHAT_SESSION_KEY = "atlas_preview_chat_session_id";
const CHAT_COUNT_KEY = "atlas_preview_chat_count";
const CHAT_RESET_KEY = "atlas_preview_chat_reset_at";

export function AtlasChatWidget() {
  const [sessionId, setSessionId] = useState("");
  const [pagePath, setPagePath] = useState("/");
  const [isLimited, setIsLimited] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (_prevState: ChatState, formData: FormData) => askAtlasPreview(formData),
    initialState,
  );
  const showAssessmentCta = isLimited || state.assessmentCta === true;

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPagePath(window.location.pathname || "/");

    let storedSessionId = window.localStorage.getItem(CHAT_SESSION_KEY);
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      window.localStorage.setItem(CHAT_SESSION_KEY, storedSessionId);
    }
    setSessionId(storedSessionId);

    const now = Date.now();
    const resetAt = Number(window.localStorage.getItem(CHAT_RESET_KEY) ?? "0");

    if (!Number.isFinite(resetAt) || resetAt <= now) {
      window.localStorage.setItem(CHAT_COUNT_KEY, "0");
      window.localStorage.setItem(CHAT_RESET_KEY, String(now + 24 * 60 * 60 * 1000));
      setIsLimited(false);
      return;
    }

    const count = Number(window.localStorage.getItem(CHAT_COUNT_KEY) ?? "0");
    setIsLimited(Number.isFinite(count) && count >= CHAT_LIMIT);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.ok || !sessionId) return;

    const now = Date.now();
    const resetAt = Number(window.localStorage.getItem(CHAT_RESET_KEY) ?? "0");
    const nextResetAt =
      !Number.isFinite(resetAt) || resetAt <= now
        ? now + 24 * 60 * 60 * 1000
        : resetAt;
    const currentCount = Number(window.localStorage.getItem(CHAT_COUNT_KEY) ?? "0");
    const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;

    window.localStorage.setItem(CHAT_RESET_KEY, String(nextResetAt));
    window.localStorage.setItem(CHAT_COUNT_KEY, String(nextCount));
    setIsLimited(nextCount >= CHAT_LIMIT);
  }, [state.ok, sessionId]);

  return (
    <div className="mt-8 rounded-[1.5rem] border border-[#dce6f5] bg-white p-4 shadow-sm sm:p-5">
      <form action={formAction} className="space-y-4">
        <label
          className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]"
          htmlFor="atlas-chat"
        >
          Chat with Atlas
        </label>
        <textarea
          id="atlas-chat"
          name="prompt"
          className="min-h-32 w-full resize-none rounded-2xl border border-[#cbd8ec] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-[#071b42] outline-none transition placeholder:text-slate-400 focus:border-[#1246a0] disabled:cursor-not-allowed disabled:bg-[#f3f6fb]"
          placeholder="What can Atlas and the team build for you today? A new business? Help with sales and marketing?"
          rows={5}
          disabled={!sessionId || isLimited || isPending}
        />
        <input name="sessionId" type="hidden" value={sessionId} />
        <input name="pagePath" type="hidden" value={pagePath} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-full bg-[#1246a0] px-7 py-4 text-center text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#0a2f78] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!sessionId || isPending || isLimited}
            type="submit"
          >
            {isLimited
              ? "Limit reached"
              : isPending
                ? "Thinking..."
                : !sessionId
                  ? "Loading..."
                  : "Ask Atlas"}
          </button>
          <a
            className="rounded-full border-2 border-[#d9a522] bg-white px-7 py-4 text-center text-sm font-black text-[#16325c] hover:bg-[#fff9e8]"
            href="/assessment"
          >
            Start free assessment
          </a>
        </div>
      </form>

      <div className="mt-5 rounded-2xl border border-[#dce6f5] bg-[#f8fbff] p-4">
        {state.ok && state.response ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]">
                Atlas reply
              </p>
              <p className="mt-3 text-sm leading-7 text-[#071b42]">
                {state.response.answer}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]">
                Next steps
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#16325c]">
                {state.response.nextSteps.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 text-[#167151]">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]">
                Follow-up question
              </p>
              <p className="mt-2 text-sm leading-6 text-[#071b42]">
                {state.response.followUpQuestion}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            Ask Atlas a real business question. We&apos;ll reply with a simple next move.
          </p>
        )}

        {state.ok === false && state.error ? (
          <p
            className={`mt-4 text-sm font-semibold ${
              state.assessmentCta ? "text-[#16325c]" : "text-[#b42318]"
            }`}
          >
            {state.error}
          </p>
        ) : null}

        {isLimited ? (
          <p className="mt-4 text-sm font-semibold text-[#8b5d00]">
            Your free preview is complete. Continue with the assessment for a plan built around your business.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Public preview is capped to keep costs low. The paid dashboard can go deeper.
          </p>
        )}

        {showAssessmentCta ? (
          <a
            className="mt-4 inline-flex rounded-full bg-[#f5bd2e] px-6 py-3 text-sm font-black text-[#071b42] shadow-sm transition hover:bg-[#ffd05a]"
            href="/assessment"
          >
            Start my free assessment
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#1246a0]">
          New business
        </span>
        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#1246a0]">
          Sales help
        </span>
        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#1246a0]">
          Marketing
        </span>
      </div>
    </div>
  );
}
