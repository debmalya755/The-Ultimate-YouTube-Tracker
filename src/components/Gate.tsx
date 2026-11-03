import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Lock, LockOpen } from "lucide-react";
import Grain from "./Grain";
import Montage from "./Montage";
import { PASSKEY, SHOTS } from "../data/shots";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ---------------------------------- timecode ---------------------------------- */
/* writes straight to the DOM — no React re-render 24x per second */
function Timecode({
  running,
  className,
}: {
  running: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const p = (n: number) => String(n).padStart(2, "0");
    const id = setInterval(() => {
      if (!ref.current) return;
      const frames = Math.floor((Date.now() - t0) / (1000 / 24));
      ref.current.textContent = `${p(Math.floor(frames / 86400))}:${p(
        Math.floor(frames / 1440) % 60
      )}:${p(Math.floor(frames / 24) % 60)}:${p(frames % 24)}`;
    }, 42);
    return () => clearInterval(id);
  }, [running]);
  return (
    <span ref={ref} className={className}>
      00:00:00:00
    </span>
  );
}

/* ---------------------------------- hud bits ---------------------------------- */
const hudText = "font-mono text-[10px] tracking-[0.3em] text-bone/50 uppercase";

function Corner({ className }: { className: string }) {
  return (
    <div
      className={`pointer-events-none absolute h-5 w-5 border-bone/25 ${className}`}
    />
  );
}

/* ------------------------------------ gate ------------------------------------ */
export default function Gate({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  useEffect(() => {
    try {
      localStorage.removeItem("debos.godmode.v1");
    } catch {
      /* ignore */
    }
  }, []);

  const [value, setValue] = useState("");
  const [scene, setScene] = useState(0);
  const [status, setStatus] = useState<"idle" | "denied" | "granted">("idle");
  const [denials, setDenials] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const granted = status === "granted";

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 1600);
    return () => clearTimeout(t);
  }, []);

  // hold the "granted" frame, then hand off to the site
  useEffect(() => {
    if (!granted) return;
    const t = setTimeout(() => onUnlock(), 2400);
    return () => clearTimeout(t);
  }, [granted, onUnlock]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (granted) return;
    if (value.trim().toUpperCase() === PASSKEY) {
      setStatus("granted");
    } else {
      setStatus("denied");
      setDenials((d) => d + 1);
      setValue("");
      window.setTimeout(() => setStatus((s) => (s === "denied" ? "idle" : s)), 1100);
      inputRef.current?.focus();
    }
  };

  const shot = SHOTS[scene];

  const reveal = {
    hidden: { y: "115%" },
    show: (i: number) => ({
      y: 0,
      transition: { duration: 1.1, ease: EASE, delay: 0.9 + i * 0.12 },
    }),
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-carbon text-bone">
      {/* ---- zooming film layer ---- */}
      <motion.div
        className="absolute inset-0"
        animate={granted ? { scale: 1.4, opacity: 0.6 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 2.1, ease: EASE, delay: 0.45 }}
      >
        <Montage frozen={granted} onScene={setScene} />
      </motion.div>

      {/* exposure flash on unlock */}
      {granted && (
        <motion.div
          className="absolute inset-0 z-[55] bg-bone"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.8, times: [0, 0.12, 1] }}
        />
      )}

      {/* slow scan sweep */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div
          className="animate-scan absolute left-0 top-0 h-[14vh] w-full bg-gradient-to-b from-transparent via-bone/[0.04] to-transparent will-change-transform"
          style={{ animationDuration: "9s" }}
        />
      </div>

      {/* ---- camera hud ---- */}
      <motion.div
        className="absolute inset-0 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: granted ? 0 : 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        {/* viewfinder corners */}
        <Corner className="left-6 top-24 border-l border-t md:left-10 md:top-28" />
        <Corner className="right-6 top-24 border-r border-t md:right-10 md:top-28" />
        <Corner className="bottom-24 left-6 border-b border-l md:bottom-28 md:left-10" />
        <Corner className="bottom-24 right-6 border-b border-r md:bottom-28 md:right-10" />

        {/* top left — rec + timecode */}
        <div className={`absolute left-6 top-[92px] md:left-10 md:top-[100px] ${hudText} flex items-center gap-3`}>
          <span className="flex items-center gap-2 text-blood">
            <span className="animate-blink inline-block h-1.5 w-1.5 rounded-full bg-blood" />
            REC
          </span>
          <Timecode running={!granted} className="tabular-nums text-bone/70" />
        </div>

        {/* top right — camera meta */}
        <div className={`absolute right-6 top-[92px] md:right-10 md:top-[100px] ${hudText} hidden text-right sm:block`}>
          CAM-00&nbsp;&nbsp;2.39:1&nbsp;&nbsp;24FPS
        </div>

        {/* bottom left — scene slate */}
        <div className="absolute bottom-[92px] left-6 md:bottom-[100px] md:left-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <p className="font-mono text-[10px] tracking-[0.3em] text-blood">
                {shot.scene} — {shot.title}
              </p>
              <p className={`mt-1.5 ${hudText}`}>{shot.meta}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* bottom right — guest key hint */}
        <div className={`absolute bottom-[92px] right-6 text-right md:bottom-[100px] md:right-10 ${hudText}`}>
          <span className="text-bone/30">GUEST KEY</span>
          <span className="mx-2 text-blood">//</span>
          <span className="text-bone/70">JARVIS</span>
        </div>
      </motion.div>

      {/* ---- center lockup ---- */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!granted ? (
            <motion.div
              key="lockup"
              className="flex flex-col items-center"
              exit={{ opacity: 0, y: -30, transition: { duration: 0.5, ease: EASE } }}
            >
              <motion.p
                className="mb-6 flex items-center gap-3 font-mono text-[10px] tracking-[0.45em] text-bone/60 uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
              >
                <Lock className="h-3 w-3 text-blood" strokeWidth={1.5} />
                   Restricted — Authorized viewers only
              </motion.p>

              <h1 className="text-center font-display uppercase leading-[0.94] tracking-[0.01em]">
                <span className="block overflow-hidden">
                  <motion.span
                    className="block text-[clamp(0.95rem,3.6vw,2.4rem)] tracking-[0.22em] text-bone/70"
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    custom={0}
                  >
                    The Ultimate
                  </motion.span>
                </span>
                <span className="block overflow-hidden">
                  <motion.span
                    className="block text-[clamp(2.7rem,12vw,9rem)]"
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    custom={1}
                  >
                    YouTube
                  </motion.span>
                </span>
                <span className="block overflow-hidden">
                  <motion.span
                    className="text-outline block text-[clamp(2.7rem,12vw,9rem)]"
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    custom={2}
                  >
                    <span className="inline-flex items-baseline gap-[0.1em]">
                      Tracker
                      <span
                        className="animate-blink inline-block h-[0.62em] w-[0.32em] bg-blood"
                        style={{ WebkitTextStroke: "0px transparent" }}
                      />
                    </span>
                  </motion.span>
                </span>
              </h1>

              <motion.div
                className="mt-8 h-px w-24 origin-center bg-bone/25"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.6, duration: 1, ease: EASE }}
              />

              {/* ---- passkey form ---- */}
              <motion.div
                key={denials}
                animate={status === "denied" ? { x: [0, -14, 14, -9, 9, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
              >
                <form
                  onSubmit={submit}
                  className="mt-9 flex items-end justify-center gap-3"
                >
                  <div className="flex flex-col items-center">
                    <label
                      htmlFor="passkey"
                      className="font-mono text-[10px] tracking-[0.45em] text-smoke uppercase"
                    >
                      Enter passkey
                    </label>
                    <input
                      ref={inputRef}
                      id="passkey"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="······"
                      className="mt-4 w-56 border-b border-bone/25 bg-transparent pb-3 text-center font-mono text-xl uppercase tracking-[0.5em] text-bone caret-blood outline-none transition-colors duration-500 placeholder:text-bone/20 focus:border-bone/70 sm:w-72"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Unlock"
                    className="group mb-1 flex h-11 w-11 items-center justify-center rounded-full border border-bone/25 text-bone transition-all duration-500 hover:border-blood hover:bg-blood hover:text-carbon"
                  >
                    <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </button>
                </form>
              </motion.div>

              {/* ---- status line ---- */}
              <div className="mt-6 flex h-5 items-center justify-center">
                <AnimatePresence mode="wait">
                  {status === "denied" ? (
                    <motion.p
                      key="denied"
                      className="font-mono text-[10px] tracking-[0.4em] text-blood uppercase"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      Access denied — key rejected
                    </motion.p>
                  ) : denials >= 2 ? (
                    <motion.p
                      key="hint"
                      className="font-mono text-[10px] tracking-[0.4em] text-bone/40 uppercase"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Hint — the butler who never sleeps
                    </motion.p>
                  ) : (
                    <motion.p
                      key="idle"
                      className="font-mono text-[10px] tracking-[0.4em] text-bone/25 uppercase"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {value.length > 0 ? "Press ↵ enter to unlock" : "Your watch tracker is ready"}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="granted"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
            >
              <LockOpen className="h-5 w-5 text-blood" strokeWidth={1.5} />
              <p className="mt-6 font-display text-[clamp(1.6rem,5vw,3.5rem)] uppercase leading-none tracking-[0.06em]">
                Access granted
              </p>
              <p className="mt-4 font-mono text-[10px] tracking-[0.45em] text-bone/60 uppercase">
                Welcome back, viewer
              </p>
              <motion.div
                className="mt-8 h-px w-40 origin-center bg-blood"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, ease: EASE, delay: 0.6 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- letterbox bars ---- */}
      <motion.div
        className="absolute inset-x-0 top-0 z-40 flex h-14 items-center justify-center bg-black md:h-[72px]"
        initial={{ y: "-101%" }}
        animate={{ y: granted ? "-101%" : "0%" }}
        transition={{ duration: granted ? 1.1 : 1.2, ease: EASE, delay: granted ? 0.65 : 0.15 }}
      >
        <p className="font-mono text-[9px] tracking-[0.6em] text-bone/35 uppercase">
          The Ultimate YouTube Tracker
        </p>
      </motion.div>
      <motion.div
        className="absolute inset-x-0 bottom-0 z-40 flex h-14 items-center justify-center bg-black md:h-[72px]"
        initial={{ y: "101%" }}
        animate={{ y: granted ? "101%" : "0%" }}
        transition={{ duration: granted ? 1.1 : 1.2, ease: EASE, delay: granted ? 0.65 : 0.15 }}
      >
        <p className="font-mono text-[9px] tracking-[0.6em] text-bone/35 uppercase">
          Watch history&nbsp;&nbsp;—&nbsp;&nbsp;always ready
        </p>
      </motion.div>

      <Grain />
    </div>
  );
}
