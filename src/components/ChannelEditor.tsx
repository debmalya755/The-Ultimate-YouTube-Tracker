import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { ImageUp, Sparkles, X } from "lucide-react";
import { fileToImageData } from "../hooks/useProfiles";
import type { YtChannel, YtChannelDraft } from "../hooks/useProfiles";
import { lookupYoutube } from "../utils/ytLookup";

const label =
  "block font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase";
const field =
  "mt-2 w-full border-b border-bone/20 bg-transparent pb-2 font-mono text-sm text-bone caret-blood outline-none transition-colors duration-300 placeholder:text-bone/20 focus:border-bone/70";

interface Props {
  initial?: YtChannel | null;
  onCancel: () => void;
  onSave: (draft: YtChannelDraft) => void;
}

export default function ChannelEditor({ initial, onCancel, onSave }: Props) {
  useBodyScrollLock();
  const [name, setName] = useState(initial?.name ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [img, setImg] = useState(initial?.img ?? "");
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

  const fetchMeta = async (raw = url) => {
    const q = raw.trim();
    if (!q) {
      setErr("Paste a channel URL or @handle first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await lookupYoutube(q);
      if (!data.ok) {
        setErr(data.error || "Lookup failed.");
        return;
      }
      const ch = data.kind === "video" ? data.channel : data;
      if (ch?.name) setName(ch.name);
      if (ch?.tag) setTag(ch.tag);
      if (ch?.img) setImg(ch.img);
      if (ch?.url) setUrl(ch.url);
      else if (data.url && data.kind === "channel") setUrl(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      setImg(await fileToImageData(file, 640));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("A channel needs a name.");
      return;
    }
    onSave({
      name: name.trim(),
      tag: tag.trim() || undefined,
      url: url.trim() || undefined,
      img: img.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit channel" : "Add channel"}
        className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto border border-bone/15 bg-ash/95 p-6 sm:p-9"
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985, transition: { duration: 0.18 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.85 }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[9px] tracking-[0.45em] text-blood uppercase">
              {initial ? "Edit channel" : "New channel"}
            </p>
            <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.03em]">
              YouTube channel
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

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-bone/20 bg-carbon">
              {img ? (
                <img src={img} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-bone/25">
                  YT
                </div>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 border border-bone/20 px-4 py-2 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors hover:border-bone/50 hover:text-bone">
              <ImageUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              {busy ? "Processing…" : img ? "Replace" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
          </div>

          <div>
            <label className={label} htmlFor="ch-name">
              Channel name *
            </label>
            <input
              id="ch-name"
              ref={nameRef}
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Veritasium"
            />
          </div>
          <div>
            <label className={label} htmlFor="ch-tag">
              Handle / tag
            </label>
            <input
              id="ch-tag"
              className={field}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="@veritasium"
            />
          </div>
          <div>
            <label className={label} htmlFor="ch-url">
              Channel URL — auto-fetch
            </label>
            <input
              id="ch-url"
              className={field}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => {
                if (url.trim()) void fetchMeta(url);
              }}
              placeholder="https://youtube.com/@handle or video URL"
            />
            <button
              type="button"
              onClick={() => void fetchMeta()}
              disabled={busy}
              className="mt-3 flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] text-bone/50 uppercase hover:text-blood disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" strokeWidth={1.5} />
              {busy ? "Fetching…" : "Fetch name & photo"}
            </button>
          </div>

          {err && (
            <p className="font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
              {err}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-bone/20 px-6 py-3 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase hover:border-bone/50 hover:text-bone"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-bone px-7 py-3 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase hover:bg-blood hover:text-bone"
            >
              {initial ? "Save channel" : "Add channel"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
