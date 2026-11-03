import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Gate from "./components/Gate";
import OsShell from "./components/OsShell";
import { useFullscreenToast } from "./hooks/useFullscreenToast";

type Phase = "gate" | "site";

export default function App() {
  const [phase, setPhase] = useState<Phase>("gate");
  const fsLabel = useFullscreenToast();

  return (
    <div className="min-h-dvh bg-carbon">
      <AnimatePresence mode="wait">
        {phase === "gate" && (
          <motion.div
            key="gate"
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <Gate onUnlock={() => setPhase("site")} />
          </motion.div>
        )}

        {phase === "site" && (
          <motion.div
            key="site"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <OsShell onRelock={() => setPhase("gate")} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[98] flex justify-center">
        <AnimatePresence>
          {fsLabel && (
            <motion.div
              key="fs-toast"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-full border border-bone/15 bg-black/70 px-5 py-2.5 font-mono text-[9px] tracking-[0.35em] text-bone/80 uppercase backdrop-blur-sm"
            >
              {fsLabel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
