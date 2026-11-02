import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Gate from "./components/Gate";
import AuthFlow from "./components/AuthFlow";
import MainSite from "./components/MainSite";
import { useFullscreenToast } from "./hooks/useFullscreenToast";
import { useAuth } from "./hooks/useAuth";

type Phase = "gate" | "auth" | "site";

export default function App() {
  const [phase, setPhase] = useState<Phase>("gate");
  /* god-mode runs the app with no account — watch data lands in the shared
     "anon" workspace, which is also what a signed-out visitor would use */
  const [god, setGod] = useState(false);
  const fsLabel = useFullscreenToast();
  const auth = useAuth();

  // a signed-in session skips straight past the auth wall
  useEffect(() => {
    if (phase === "auth" && auth.user) setPhase("site");
  }, [phase, auth.user]);

  const afterGate = (godMode: boolean) => {
    setGod(godMode);
    setPhase(godMode || auth.user ? "site" : "auth");
  };

  return (
    <div className="min-h-dvh bg-carbon">
      <AnimatePresence mode="wait">
        {phase === "gate" && (
          <motion.div
            key="gate"
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <Gate onUnlock={afterGate} />
          </motion.div>
        )}

        {phase === "auth" && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <AuthFlow {...auth} onDone={() => setPhase("site")} />
          </motion.div>
        )}

        {phase === "site" && (
          <motion.div
            key="site"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <MainSite
              user={god ? null : auth.user}
              godMode={god && !auth.user}
              onUpdateProfile={auth.updateProfile}
              onExitGod={() => {
                setGod(false);
                setPhase("auth");
              }}
              onSignOut={() => {
                auth.signOut();
                setGod(false);
                setPhase("auth");
              }}
              onRelock={() => setPhase("gate")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* fullscreen status toast */}
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
