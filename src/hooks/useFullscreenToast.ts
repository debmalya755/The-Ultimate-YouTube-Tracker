import { useEffect, useState } from "react";

/**
 * YouTube-style "f" fullscreen toggle with a transient status label.
 * - Ignores keystrokes typed into inputs / editable areas
 * - Ignores repeats and chorded presses (⌘F, Ctrl+F, Alt+F)
 * - Stays in sync with native exits (ESC / browser UI)
 */
export function useFullscreenToast(): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let hide: number | undefined;

    const show = (msg: string) => {
      setLabel(msg);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setLabel(null), 2000);
    };

    const toggle = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => void;
      };
      const root = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => void;
      };

      try {
        if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
          (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
        } else {
          (root.requestFullscreen ?? root.webkitRequestFullscreen)?.call(root);
        }
      } catch {
        /* fullscreen unsupported — stay inline */
      }
    };

    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
      show(
        active
          ? "Display mode // fullscreen — Shift+Ctrl or ESC to exit"
          : "Display mode // inline"
      );
    };

    const onKey = (e: KeyboardEvent) => {
      // Shift + Ctrl — triggers on the second key of the pair landing,
      // whichever order they were pressed in. e.code keeps it
      // keyboard-layout independent.
      const isShift = e.code === "ShiftLeft" || e.code === "ShiftRight";
      const isCtrl = e.code === "ControlLeft" || e.code === "ControlRight";
      if (!isShift && !isCtrl) return;

      // require BOTH modifiers held, with nothing else
      if (!(e.shiftKey && e.ctrlKey)) return;
      if (e.metaKey || e.altKey) return;

      // ignore repeats so holding the pair doesn't toggle repeatedly
      if (e.repeat) return;

      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;

      e.preventDefault();
      toggle();
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(hide);
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return label;
}
