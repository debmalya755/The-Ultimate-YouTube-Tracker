import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Shuffle,
  X,
} from "lucide-react";
import { fileToImageData } from "../hooks/useProfiles";
import type { Chapter, ChapterDraft } from "../hooks/useProfiles";
import { CHAPTER_COVER_COUNT, ChapterCover } from "../data/chapterCovers";

const PER_PAGE = 24;
const PAGES = Math.ceil(CHAPTER_COVER_COUNT / PER_PAGE);

const label =
  "block font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase";
const field =
  "mt-2 w-full border-b border-bone/20 bg-transparent pb-2 font-mono text-sm text-bone caret-blood outline-none transition-colors duration-300 placeholder:text-bone/20 focus:border-bone/70";

interface Props {
  profileName: string;
  initial?: Chapter | null;
  nextCode: string;
  onCancel: () => void;
  onSave: (draft: ChapterDraft) => void;
}

export default function ChapterEditor({
  profileName,
  initial,
  nextCode,
  onCancel,
  onSave,
}: Props) {
  useBodyScrollLock();
  const [img, setImg] = useState(initial?.img ?? "");
  const [cover, setCover] = useState<number>(
    initial?.cover ?? Math.floor(Math.random() * CHAPTER_COVER_COUNT)
  );
  const [page, setPage] = useState(() =>
    Math.floor((initial?.cover ?? 0) / PER_PAGE)
  );
  const [code, setCode] = useState(initial?.code ?? nextCode);
  const [name, setName] = useState(initial?.name ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [target, setTarget] = useState(String(initial?.targetHours ?? 6));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const pickFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      setImg(await fileToImageData(file, 1280));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("A playlist needs a name.");
      return;
    }
    const h = Number(target);
    onSave({
      img: img.trim() || undefined,
      cover,
      code: code.trim() || nextCode,
      name: name.trim(),
      tag: tag.trim(),
      targetHours: Number.isFinite(h) && h > 0 ? h : 6,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={onCancel}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit playlist" : "Add playlist"}
        className="relative max-h-[88dvh] w-full max-w-3xl overflow-y-auto border border-bone/15 bg-ash/95 p-6 sm:p-9"
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985, transition: { duration: 0.18 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.85 }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[9px] tracking-[0.45em] text-blood uppercase">
              {initial ? "Edit playlist" : "New playlist"} — {profileName}
            </p>
            <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.03em]">
              Playlist card
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bone/20 text-bone/70 transition-colors duration-300 hover:border-blood hover:text-bone"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-7">
          {/* live 16:9 preview — name lives inside the card */}
          <div>
            <span className={label}>Preview — 16:9</span>
            <div className="relative mt-2 aspect-video w-full overflow-hidden border border-bone/20 bg-carbon">
              {img ? (
                <>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-transparent to-transparent" />
                </>
              ) : (
                <ChapterCover index={cover} className="h-full w-full" />
              )}
              <span className="pointer-events-none absolute left-4 top-3 font-mono text-[9px] tracking-[0.35em] text-bone/70 uppercase">
                PL.{code || nextCode}
              </span>
              <span className="pointer-events-none absolute bottom-3 left-4 right-4 truncate font-display text-2xl uppercase tracking-[0.03em]">
                {name || "Playlist name"}
              </span>
              {!img && (
                <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-[8px] tracking-[0.3em] text-bone/50 uppercase">
                  Plate {String(cover + 1).padStart(3, "0")}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 border border-bone/20 px-4 py-2 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/50 hover:text-bone">
                <ImageUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                {busy ? "Processing…" : "Upload cover"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </label>
              {img && (
                <button
                  type="button"
                  onClick={() => setImg("")}
                  className="font-mono text-[9px] tracking-[0.3em] text-bone/35 uppercase transition-colors duration-300 hover:text-blood"
                >
                  Remove upload — use plate
                </button>
              )}
            </div>
          </div>

          {/* fields */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="ch-name">
                Playlist name *
              </label>
              <input
                id="ch-name"
                ref={nameRef}
                className={field}
                value={name}
                placeholder="Tech reviews · 2026"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="ch-code">
                Code
              </label>
              <input
                id="ch-code"
                className={field}
                value={code}
                placeholder="01"
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="ch-tag">
                YouTube tag
              </label>
              <input
                id="ch-tag"
                className={field}
                value={tag}
                placeholder="Reviews · Weekly uploads"
                onChange={(e) => setTag(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="ch-target">
                Watch target (hours)
              </label>
              <input
                id="ch-target"
                type="number"
                min={1}
                step={1}
                className={field}
                value={target}
                placeholder="6"
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          {/* plate picker */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={label}>
                Cover style — {CHAPTER_COVER_COUNT} landscape designs
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((pg) => (pg - 1 + PAGES) % PAGES)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-bone/20 text-bone/60 transition-colors duration-300 hover:border-bone/60 hover:text-bone"
                  aria-label="Previous plates"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <span className="font-mono text-[9px] tracking-[0.25em] text-bone/40 tabular-nums">
                  {page + 1}/{PAGES}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((pg) => (pg + 1) % PAGES)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-bone/20 text-bone/60 transition-colors duration-300 hover:border-bone/60 hover:text-bone"
                  aria-label="More plates"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pick = Math.floor(Math.random() * CHAPTER_COVER_COUNT);
                    setCover(pick);
                    setPage(Math.floor(pick / PER_PAGE));
                    setImg("");
                  }}
                  className="ml-1 flex items-center gap-1.5 rounded-full border border-bone/20 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-bone/60 uppercase transition-colors duration-300 hover:border-blood hover:text-bone"
                >
                  <Shuffle className="h-3 w-3" strokeWidth={1.5} />
                  Random
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {Array.from({ length: PER_PAGE }, (_, k) => page * PER_PAGE + k)
                .filter((n) => n < CHAPTER_COVER_COUNT)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    title={`Plate ${n + 1}`}
                    onClick={() => {
                      setCover(n);
                      setImg("");
                    }}
                    className={`relative aspect-video overflow-hidden border transition-all duration-200 ${
                      cover === n && !img
                        ? "border-blood ring-1 ring-blood"
                        : "border-bone/10 hover:border-bone/50"
                    }`}
                  >
                    <ChapterCover index={n} className="h-full w-full" />
                  </button>
                ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase">
              {err ? (
                <span className="text-blood">{err}</span>
              ) : (
                <span className="text-bone/25">Saved to this browser</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-bone/20 px-6 py-3 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/50 hover:text-bone"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-bone px-7 py-3 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone"
              >
                {initial ? "Save playlist" : "Add playlist"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
