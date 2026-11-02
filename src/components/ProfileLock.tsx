import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const field =
  "mt-2 w-full border-b border-bone/20 bg-transparent pb-2 font-mono text-sm text-bone caret-blood outline-none placeholder:text-bone/20 focus:border-bone/70";

interface Props {
  name: string;
  mode: "unlock" | "set";
  onCancel: () => void;
  onSubmit: (password: string) => Promise<string | null> | string | null;
}

export default function ProfileLock({ name, mode, onCancel, onSubmit }: Props) {
  useBodyScrollLock();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "set") {
      if (password.length < 4) {
        setErr("At least 4 characters.");
        return;
      }
      if (password !== confirm) {
        setErr("Passwords do not match.");
        return;
      }
    }
    setBusy(true);
    const message = await onSubmit(password);
    setBusy(false);
    if (message) setErr(message);
  };

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md border border-bone/15 bg-ash/95 p-7"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-bone/20 text-bone/60 hover:border-blood hover:text-bone"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-blood uppercase">
          <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
          {mode === "set" ? "Set profile password" : "Unlock profile"}
        </p>
        <h3 className="mt-4 font-display text-3xl uppercase">{name}</h3>
        <p className="mt-3 text-sm text-smoke">
          {mode === "set"
            ? "This password only opens this profile. It stays on this device."
            : "Enter this profile’s password to open its channels and playlists."}
        </p>
        <label className="mt-8 block font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase">
          Password
          <input
            ref={ref}
            type="password"
            className={field}
            value={password}
            autoComplete={mode === "set" ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mode === "set" && (
          <label className="mt-6 block font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase">
            Confirm
            <input
              type="password"
              className={field}
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}
        {err && (
          <p className="mt-4 font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-8 w-full rounded-full bg-bone py-3.5 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase hover:bg-blood hover:text-bone disabled:opacity-35"
        >
          {busy ? "Checking…" : mode === "set" ? "Lock profile" : "Unlock"}
        </button>
      </motion.form>
    </div>
  );
}
