import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { Check, RotateCcw, X, ZoomIn } from "lucide-react";

const VIEW = 300; // on-screen crop viewport (px)
const OUT = 512; // exported avatar size (px)

interface Props {
  /** object URL or data URL of the picked file */
  src: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}

export default function ImageCropper({ src, onCancel, onApply }: Props) {
  useBodyScrollLock();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );

  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  /* scale that makes the image exactly cover the viewport */
  const base = nat.w && nat.h ? VIEW / Math.min(nat.w, nat.h) : 1;
  const scale = base * zoom;
  const drawW = nat.w * scale;
  const drawH = nat.h * scale;

  /** keep the image covering the circle — no empty gaps */
  const clamp = useCallback(
    (o: { x: number; y: number }, w = drawW, h = drawH) => {
      const maxX = Math.max(0, (w - VIEW) / 2);
      const maxY = Math.max(0, (h - VIEW) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
    },
    [drawW, drawH]
  );

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setOff({ x: 0, y: 0 });
      setZoom(1);
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    setOff((o) => clamp(o));
  }, [zoom, clamp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  /* ------------------------------ dragging ------------------------------ */
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOff(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0016)));
  };

  /* ------------------------------- export ------------------------------- */
  const apply = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const k = OUT / VIEW; // viewport → output scale
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(
      img,
      (VIEW / 2 - drawW / 2 + off.x) * k,
      (VIEW / 2 - drawH / 2 + off.y) * k,
      drawW * k,
      drawH * k
    );
    onApply(canvas.toDataURL("image/jpeg", 0.88));
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={onCancel}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Crop profile picture"
        className="relative w-full max-w-md border border-bone/15 bg-ash/95 p-6 sm:p-8"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985, transition: { duration: 0.18 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.85 }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[9px] tracking-[0.45em] text-blood uppercase">
              Profile picture
            </p>
            <h3 className="mt-2 font-display text-2xl uppercase tracking-[0.03em]">
              Frame it
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel crop"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 text-bone/70 transition-colors duration-300 hover:border-blood hover:text-bone"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* crop stage */}
        <div
          className="relative mx-auto mt-7 cursor-grab touch-none select-none overflow-hidden bg-carbon active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          {loaded && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: drawW,
                height: drawH,
                left: VIEW / 2 - drawW / 2 + off.x,
                top: VIEW / 2 - drawH / 2 + off.y,
              }}
            />
          )}

          {/* circular mask + guides */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, transparent 0, transparent 49.6%, rgba(5,5,6,0.82) 50%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full border border-bone/35" />
          <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-bone/10" />
          <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-bone/10" />
          <div className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-bone/10" />
          <div className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-bone/10" />
        </div>

        <p className="mt-4 text-center font-mono text-[9px] tracking-[0.3em] text-bone/30 uppercase">
          Drag to reposition · scroll to zoom
        </p>

        {/* zoom */}
        <div className="mt-5 flex items-center gap-4">
          <ZoomIn className="h-4 w-4 shrink-0 text-bone/50" strokeWidth={1.5} />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-bone/15 accent-[#e10600]"
          />
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setOff({ x: 0, y: 0 });
            }}
            aria-label="Reset"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bone/20 text-bone/60 transition-colors duration-300 hover:border-bone/60 hover:text-bone"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-bone/20 px-6 py-3 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/50 hover:text-bone"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!loaded}
            className="flex items-center gap-2 rounded-full bg-bone px-7 py-3 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            Apply crop
          </button>
        </div>
      </motion.div>
    </div>
  );
}
