import { useEffect } from "react";

/** Stops the page scrolling behind an open modal (and the wheel-zoom in the
 *  cropper from dragging the page with it). Restores the previous value. */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
