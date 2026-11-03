import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Lock, Radio, Repeat } from "lucide-react";
import Grain from "./Grain";
import BrandMark from "./BrandMark";
import Clocks from "./Clocks";
import YoutubeTracker from "./YoutubeTracker";
import SubscriptionsTracker from "./SubscriptionsTracker";

const EASE = [0.16, 1, 0.3, 1] as const;

type Desk = "hub" | "youtube" | "subs";

const TRACKERS = [
  {
    id: "youtube" as const,
    kicker: "01",
    name: "The Ultimate YouTube Tracker",
    blurb: "Channels and playlists. Fetch titles, thumbs, and channel photos.",
    icon: Radio,
  },
  {
    id: "subs" as const,
    kicker: "02",
    name: "Subscriptions Tracker",
    blurb: "What you pay for, how often, and when the next charge hits.",
    icon: Repeat,
  },
];

export default function OsShell({ onRelock }: { onRelock: () => void }) {
  const [desk, setDesk] = useState<Desk>("hub");

  return (
    <div className="relative min-h-dvh bg-carbon text-bone">
      <Grain />
      <nav className="fixed inset-x-0 top-0 z-[60] border-b border-bone/10 bg-carbon/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-5 md:px-12">
          <div className="flex items-center gap-4">
            {desk !== "hub" && (
              <button
                type="button"
                onClick={() => setDesk("hub")}
                aria-label="All trackers"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 text-bone/70 hover:border-blood hover:text-bone"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setDesk("hub")}
                className="text-left font-display text-3xl uppercase leading-none tracking-[0.08em] md:text-4xl"
              >
                <BrandMark />
              </button>
              <Clocks />
            </div>
          </div>
          <button
            type="button"
            onClick={onRelock}
            title="Lock session"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 text-bone/60 hover:border-blood hover:text-bone"
          >
            <Lock className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      <div className="pt-[7.5rem]">
        <AnimatePresence mode="wait">
          {desk === "hub" && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="px-6 pb-24 md:px-12"
            >
              <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
                Trackers
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,8vw,6.5rem)] uppercase leading-[0.92]">
                Pick a desk
              </h1>
              <p className="mt-6 max-w-xl font-body text-bone/55">
                DEB OS v0 is a multi-tracker system. More desks will land here
                later. Two are live now.
              </p>
              <div className="mt-14 grid gap-4 md:grid-cols-2">
                {TRACKERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDesk(t.id)}
                    className="group border border-bone/15 bg-ash/40 p-8 text-left transition-colors hover:border-blood"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] tracking-[0.4em] text-bone/35 uppercase">
                        {t.kicker}
                      </span>
                      <t.icon
                        className="h-5 w-5 text-bone/35 group-hover:text-blood"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h2 className="mt-8 font-display text-3xl uppercase leading-[0.95] md:text-4xl">
                      {t.name}
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-bone/50">
                      {t.blurb}
                    </p>
                    <p className="mt-10 font-mono text-[9px] tracking-[0.35em] text-blood uppercase">
                      Open →
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {desk === "youtube" && (
            <motion.div
              key="yt"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <YoutubeTracker />
            </motion.div>
          )}
          {desk === "subs" && (
            <motion.div
              key="subs"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <SubscriptionsTracker />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
