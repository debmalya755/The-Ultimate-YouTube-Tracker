import { FormEvent, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
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
  from: "gemma" | "you";
  text: string;
}

function hours(mins: number) {
  return (mins / 60).toFixed(1);
}

function reply(q: string, ctx: Props): string {
  const t = q.trim().toLowerCase();
  const { profiles, chapters, channels, sessions, stats } = ctx;

  if (!t) return "Say something. I’ll keep it short.";

  if (/(hi|hello|hey|yo|namaste)/.test(t)) {
    return `Gemma 4, on-device. ${profiles.length} profile${profiles.length === 1 ? "" : "s"} on this machine. What do you need?`;
  }
  if (/who are you|what are you|gemma/.test(t)) {
    return "I’m Gemma 4 — added to this tracker as a local companion. No cloud, no API. I only see what this browser already stores.";
  }
  if (/password|lock|unlock/.test(t)) {
    return "The site passkey opens the gate. Each profile has its own password. Unlock lasts for this tab only.";
  }
  if (/account|sign up|email|resend/.test(t)) {
    return "There are no accounts here. No email, no phone. Just the gate, then profiles with their own passwords.";
  }
  if (/streak/.test(t)) {
    return stats.streak
      ? `Current streak ${stats.streak} day${stats.streak === 1 ? "" : "s"}. Best is ${stats.bestStreak}. ${stats.loggedToday ? "Today already counts." : "Log something today if you want it to hold."}`
      : "No streak yet. Log a session today to start one.";
  }
  if (/today|goal/.test(t)) {
    return `Today: ${hours(stats.todayMinutes)}h logged. Daily aim on this build is 3.0h.`;
  }
  if (/playlist/.test(t)) {
    return chapters.length
      ? `${chapters.length} playlist${chapters.length === 1 ? "" : "s"} across profiles. Open a profile to add more.`
      : "No playlists yet. Unlock a profile, then Add playlist.";
  }
  if (/channel/.test(t)) {
    return channels.length
      ? `${channels.length} channel${channels.length === 1 ? "" : "s"} stored inside profiles.`
      : "Channels live inside a profile, not on the home rail. Open a profile → Channel vault.";
  }
  if (/profile/.test(t)) {
    const names = profiles.slice(0, 5).map((p) => p.name).join(", ");
    return profiles.length
      ? `${profiles.length} profile${profiles.length === 1 ? "" : "s"}: ${names}${profiles.length > 5 ? "…" : ""}. Each one is a storehouse with its own password.`
      : "No profiles yet. Use Add profile and set a password for it.";
  }
  if (/session|log|watch|hour/.test(t)) {
    return sessions.length
      ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} on this device. ${hours(stats.total)}h accounted in total.`
      : "Nothing logged. Open a profile or tap +15m after you unlock it.";
  }
  if (/help|how|what can/.test(t)) {
    return "Ask me about profiles, passwords, channels, playlists, streak, or today’s hours. I don’t leave this browser.";
  }

  return "I only answer tracker questions from local data. Try: streak, profiles, playlists, password, today.";
}

function Mark() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
      <rect width="48" height="48" rx="24" fill="#101012" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="#e10600" strokeWidth="1.4" />
      <path d="M16 28c2.4-6 13.6-6 16 0" fill="none" stroke="#ededf0" strokeWidth="1.3" />
      <circle cx="19" cy="21" r="1.4" fill="#ededf0" />
      <circle cx="29" cy="21" r="1.4" fill="#ededf0" />
      <text x="24" y="41" textAnchor="middle" fill="#e10600" fontSize="5" fontFamily="monospace" letterSpacing="1.2">
        G4
      </text>
    </svg>
  );
}

export default function GemmaCompanion(ctx: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      id: "g0",
      from: "gemma",
      text: "Gemma 4 is on this site — local only. Ask about your profiles, streak, or how locks work.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);
  const greeting = useMemo(
    () =>
      ctx.stats.loggedToday
        ? "Hours already on the board today."
        : "No hours logged today yet.",
    [ctx.stats.loggedToday]
  );

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const you: Msg = { id: `y${Date.now()}`, from: "you", text };
    const gem: Msg = {
      id: `g${Date.now()}`,
      from: "gemma",
      text: reply(text, ctx),
    };
    setMsgs((m) => [...m, you, gem]);
    setInput("");
    requestAnimationFrame(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    });
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
            className="pointer-events-auto w-[min(92vw,380px)] overflow-hidden border border-bone/15 bg-ash/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md"
          >
            <div className="flex items-center gap-3 border-b border-bone/10 px-4 py-3">
              <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-blood/40">
                <Mark />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] tracking-[0.35em] text-blood uppercase">
                  On-site · local
                </p>
                <p className="font-display text-xl uppercase leading-none">Gemma 4</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Gemma 4"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/20 text-bone/60 hover:border-blood hover:text-bone"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="border-b border-bone/10 px-4 py-2 font-mono text-[9px] tracking-[0.25em] text-bone/35 uppercase">
              {greeting}
            </p>
            <div
              ref={scroller}
              className="max-h-72 space-y-3 overflow-y-auto px-4 py-4"
            >
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={m.from === "you" ? "ml-8 text-right" : "mr-6"}
                >
                  <p className="font-mono text-[8px] tracking-[0.3em] text-bone/30 uppercase">
                    {m.from === "you" ? "You" : "Gemma 4"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-bone/85">{m.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-bone/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Gemma 4…"
                className="min-w-0 flex-1 bg-transparent font-mono text-xs tracking-wide text-bone outline-none placeholder:text-bone/25"
              />
              <button
                type="submit"
                aria-label="Send"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bone text-carbon hover:bg-blood hover:text-bone"
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
        aria-label={open ? "Hide Gemma 4" : "Open Gemma 4"}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-bone/20 bg-ash shadow-[0_12px_40px_-12px_rgba(225,6,0,0.55)] transition-transform hover:-translate-y-0.5"
      >
        {open ? (
          <MessageCircle className="h-5 w-5 text-blood" strokeWidth={1.5} />
        ) : (
          <div className="h-14 w-14">
            <Mark />
          </div>
        )}
      </button>
    </div>
  );
}
