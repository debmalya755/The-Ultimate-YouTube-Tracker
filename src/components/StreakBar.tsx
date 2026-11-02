import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export interface StreakDay {
  key: string;
  date: Date;
  minutes: number;
}

interface Props {
  streak: number;
  bestStreak: number;
  days: StreakDay[];
  loggedToday: boolean;
  dailyGoal: number;
  /** delays the entrance so it can follow the hero headline */
  delay?: number;
}

/**
 * Unboxed streak readout — deliberately has no panel/border so it reads as
 * part of the hero rather than a card sitting on top of it.
 */
export default function StreakBar({
  streak,
  bestStreak,
  days,
  loggedToday,
  dailyGoal,
  delay = 1.5,
}: Props) {
  const alive = streak > 0;

  return (
    <motion.div
      className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.9, ease: EASE }}
    >
      {/* current streak */}
      <div className="flex items-end gap-3">
        <Flame
          className={`mb-1.5 h-7 w-7 ${alive ? "text-blood" : "text-bone/20"}`}
          strokeWidth={1.4}
          fill={alive ? "currentColor" : "none"}
          fillOpacity={alive ? 0.22 : 0}
        />
        <div>
          <p className="font-display text-[clamp(2.6rem,7vw,4.4rem)] leading-[0.85] tabular-nums">
            {streak}
            <span className="ml-2 font-mono text-[10px] tracking-[0.3em] text-blood">
              {streak === 1 ? "DAY" : "DAYS"}
            </span>
          </p>
          <p className="mt-2 font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase">
            Current streak
          </p>
        </div>
      </div>

      {/* last 7 days */}
      <div>
        <div className="flex items-end gap-2">
          {days.map((d, i) => {
            const hit = d.minutes >= dailyGoal;
            const active = d.minutes > 0;
            const isToday = i === days.length - 1;
            return (
              <div key={d.key} className="flex flex-col items-center gap-2">
                <motion.span
                  title={`${d.date.toDateString()} — ${d.minutes} min`}
                  className={`block h-8 w-5 rounded-sm ${
                    hit
                      ? "bg-blood"
                      : active
                        ? "bg-bone/70"
                        : "border border-bone/15 bg-transparent"
                  } ${isToday && !active ? "border-blood/50" : ""}`}
                  initial={{ scaleY: 0.3, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{
                    delay: delay + 0.25 + i * 0.05,
                    duration: 0.5,
                    ease: EASE,
                  }}
                  style={{ originY: 1 }}
                />
                <span
                  className={`font-mono text-[9px] uppercase ${
                    isToday ? "text-bone/70" : "text-bone/25"
                  }`}
                >
                  {INITIALS[d.date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* best + today status */}
      <div className="space-y-2">
        <p className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase">
          Best <span className="text-bone">{bestStreak}</span>{" "}
          {bestStreak === 1 ? "day" : "days"}
        </p>
        <p
          className={`flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] uppercase ${
            loggedToday ? "text-bone/60" : "text-blood"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              loggedToday ? "bg-bone/50" : "animate-blink bg-blood"
            }`}
          />
          {loggedToday
            ? "Watched today"
            : alive
              ? "Watch today to keep it"
              : "Start your watch streak"}
        </p>
      </div>
    </motion.div>
  );
}
