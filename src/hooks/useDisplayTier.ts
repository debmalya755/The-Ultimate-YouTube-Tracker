import { useEffect, useState } from "react";

export type Tier = "low" | "high";

interface DisplayState {
  tier: Tier;
  fullscreen: boolean;
}

type NetworkInfo = {
  saveData?: boolean;
  effectiveType?: string;
};

/** true when the device/connection says "don't you dare ship me 1080p" */
function constrained(): boolean {
  const nav = navigator as Navigator & {
    connection?: NetworkInfo;
    deviceMemory?: number;
  };
  const net = nav.connection;
  if (net?.saveData) return true;
  if (net?.effectiveType && /(^|-)(2g|3g)$/.test(net.effectiveType)) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  if (
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4
  )
    return true;
  return false;
}

function isFullscreen(): boolean {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

function measure(): DisplayState {
  if (typeof window === "undefined") return { tier: "low", fullscreen: false };

  const fs = isFullscreen();
  // effective pixels the video actually has to fill
  const painted = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);

  // weak hardware stays on the light reel even in fullscreen
  const tier: Tier = constrained() ? "low" : fs || painted >= 1500 ? "high" : "low";

  return { tier, fullscreen: fs };
}

/**
 * Picks a video quality tier from fullscreen state, painted width and
 * device capability. Re-evaluates on resize and fullscreen changes.
 */
export function useDisplayTier(): DisplayState {
  const [state, setState] = useState<DisplayState>(() => measure());

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setState((prev) => {
          const next = measure();
          return prev.tier === next.tier && prev.fullscreen === next.fullscreen
            ? prev
            : next;
        })
      );
    };

    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, []);

  return state;
}
