import { FormEvent, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, Send, X } from "lucide-react";
import type { Chapter, Profile, Session, YtChannel } from "../hooks/useProfiles";

const EASE = [0.16, 1, 0.3, 1] as const;

interface StatsSlice {
  streak: number;
  bestStreak: number;
  total: number;
  todayMinutes: number;
  loggedToday: boolean;
}

interface Props {
  profiles: Profile[];
  chapters: Chapter[];
  channels: YtChannel[];
  sessions: Session[];
  stats: StatsSlice;
}

interface Msg {
  id: string;
  from: "assistant" | "you";
  text: string;
}

function hours(mins: number) {
  return (mins / 60).toFixed(1);
}

function snapshot(ctx: Props) {
  const names = ctx.profiles.map((p) => p.name).slice(0, 12).join(", ");
  const plays = ctx.chapters.map((c) => c.name).slice(0, 12).join(", ");
  const chans = ctx.channels.map((c) => c.name).slice(0, 12).join(", ");
  return [
    `profiles (${ctx.profiles.length}): ${names || "none"}`,
    `channels (${ctx.channels.length}): ${chans || "none"}`,
    `playlists (${ctx.chapters.length}): ${plays || "none"}`,
    `sessions: ${ctx.sessions.length}; total ${hours(ctx.stats.total)}h; today ${hours(ctx.stats.todayMinutes)}h`,
    `streak ${ctx.stats.streak} (best ${ctx.stats.bestStreak}); loggedToday=${ctx.stats.loggedToday}`,
  ].join("\n");
}

export default function GemmaCompanion(ctx: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      id: "a0",
      from: "assistant",
      text: "Paste a YouTube link and I’ll summarise it. Or ask about your profiles, playlists, and hours. This uses Gemini — free tier, not a fake local script.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);
  const context = useMemo(() => snapshot(ctx), [ctx]);

  const push = (m: Msg) => {
    setMsgs((cur) => [...cur, m]);
    requestAnimationFrame(() => {
      scroller.current?.scrollTo({
        top: scroller.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = [
      ...msgs.filter((m) => m.id !== "a0"),
      { id: `y${Date.now()}`, from: "you" as const, text },
    ];
    push(history[history.length - 1]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: history.map((m) => ({
            role: m.from === "you" ? "user" : "model",
            text: m.text,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      push({
        id: `a${Date.now()}`,
        from: "assistant",
        text:
          data.text ||
          data.error ||
          "No reply. Add GEMINI_API_KEY on Vercel (free Google AI Studio key).",
      });
    } catch {
      push({
        id: `a${Date.now()}`,
        from: "assistant",
        text: "Network error reaching the chat function.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="pointer-events-auto w-[min(92vw,400px)] overflow-hidden border border-bone/15 bg-ash/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-bone/10 px-4 py-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.35em] text-blood uppercase">
                  Talk · summarise
                </p>
                <p className="font-display text-xl uppercase leading-none">Ask</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/20 text-bone/60 hover:border-blood hover:text-bone"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <div
              ref={scroller}
              className="max-h-80 space-y-3 overflow-y-auto px-4 py-4"
            >
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={m.from === "you" ? "ml-8 text-right" : "mr-4"}
                >
                  <p className="font-mono text-[8px] tracking-[0.3em] text-bone/30 uppercase">
                    {m.from === "you" ? "You" : "Ask"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-bone/85">
                    {m.text}
                  </p>
                </div>
              ))}
              {busy && (
                <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] text-bone/40 uppercase">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blood" />
                  Watching / thinking
                </p>
              )}
            </div>
            <form
              onSubmit={send}
              className="flex items-center gap-2 border-t border-bone/10 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask, or paste a YouTube URL…"
                className="min-w-0 flex-1 bg-transparent font-mono text-xs tracking-wide text-bone outline-none placeholder:text-bone/25"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bone text-carbon hover:bg-blood hover:text-bone disabled:opacity-35"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide Ask" : "Open Ask"}
        className="pointer-events-auto flex h-14 items-center gap-2 rounded-full border border-bone/20 bg-ash px-4 font-mono text-[9px] tracking-[0.35em] text-bone uppercase shadow-[0_12px_40px_-12px_rgba(225,6,0,0.55)] hover:-translate-y-0.5"
      >
        Ask
      </button>
    </div>
  );
}
