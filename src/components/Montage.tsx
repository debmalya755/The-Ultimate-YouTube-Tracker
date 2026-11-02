import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { posterFor, SHOTS } from "../data/shots";
import { useDisplayTier } from "../hooks/useDisplayTier";
import type { Tier } from "../hooks/useDisplayTier";

interface MontageProps {
  onScene?: (index: number) => void;
  frozen?: boolean;
}

const SHOT_DURATION = 5200;

const sourceFor = (i: number, tier: Tier) =>
  tier === "high" ? SHOTS[i].srcHigh : SHOTS[i].src;

export default function Montage({ onScene, frozen = false }: MontageProps) {
  const [index, setIndex] = useState(0);
  const { tier, fullscreen } = useDisplayTier();

  // quality is sampled at each cut, never mid-shot — swapping the src of a
  // playing element would reload it and stutter.
  const tierRef = useRef(tier);
  useEffect(() => {
    tierRef.current = tier;
  }, [tier]);

  const [active, setActive] = useState(() => ({
    src: sourceFor(0, tier),
    tier,
  }));

  useEffect(() => {
    setActive({ src: sourceFor(index, tierRef.current), tier: tierRef.current });
  }, [index]);

  useEffect(() => {
    if (frozen) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SHOTS.length),
      SHOT_DURATION
    );
    return () => clearInterval(id);
  }, [frozen]);

  useEffect(() => {
    onScene?.(index);
  }, [index, onScene]);

  // every third cut is a hard film splice, the rest dissolve
  const hardCut = index % 3 === 2;
  const shot = SHOTS[index];
  const nextIndex = (index + 1) % SHOTS.length;

  // fullscreen pushes less far so the frame stays crisp at full size
  const zoomFrom = fullscreen ? 1.03 : 1.08;
  const zoomTo = fullscreen ? 1.13 : 1.22;

  return (
    <div className="absolute inset-0 overflow-hidden bg-carbon">
      {/* silent buffer of the next cut — it splices in already warm */}
      <video
        key={`warm-${nextIndex}-${active.tier}`}
        src={sourceFor(nextIndex, active.tier)}
        preload="auto"
        muted
        playsInline
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />

      <AnimatePresence mode="sync">
        <motion.video
          key={index}
          src={active.src}
          poster={posterFor(shot, active.tier)}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          initial={{
            opacity: 0,
            scale: zoomFrom,
            filter: "brightness(1.9) saturate(0.7)",
          }}
          animate={{
            opacity: 1,
            scale: zoomTo,
            filter: "brightness(1) saturate(1)",
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: hardCut ? 0.09 : 1.6, ease: "easeInOut" },
            filter: { duration: 0.7, ease: "easeOut" },
            scale: { duration: 9, ease: "linear" },
          }}
        />
      </AnimatePresence>

      {/* cinematic grade — vignette + edge falloff */}
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-carbon/70" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at center, transparent 40%, rgba(5,5,6,0.72) 100%)",
        }}
      />
      <div className="scanlines absolute inset-0 opacity-[0.05]" />
    </div>
  );
}
