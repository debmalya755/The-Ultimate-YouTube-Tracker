import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Lock,
  Plus,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import CustomSelect from "./CustomSelect";
import { fileToImageData } from "../hooks/useProfiles";
import type { Category, Profile, ProfileDraft } from "../hooks/useProfiles";
import { hashPassword, randomSalt } from "../utils/password";
import { LOGO_COUNT, ProfileLogo } from "../data/profileLogos";

const PER_PAGE = 36;
const PAGES = Math.ceil(LOGO_COUNT / PER_PAGE);


const label =
  "block font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase";
const field =
  "mt-2 w-full border-b border-bone/20 bg-transparent pb-2 font-mono text-sm text-bone caret-blood outline-none transition-colors duration-300 placeholder:text-bone/20 focus:border-bone/70";

interface Props {
  initial?: Profile | null;
  categories: Category[];
  onAddCategory: (name: string, code: string) => { ok: boolean; error?: string };
  onRemoveCategory: (id: string) => void;
  /** ids of categories currently referenced by a profile — not deletable */
  categoriesInUse: string[];
  onCancel: () => void;
  onSave: (draft: ProfileDraft) => void;
}

export default function ProfileEditor({
  initial,
  categories,
  onAddCategory,
  onRemoveCategory,
  categoriesInUse,
  onCancel,
  onSave,
}: Props) {
  useBodyScrollLock();
  const [img, setImg] = useState(initial?.img ?? "");
  const [cover, setCover] = useState<number>(
    initial?.cover ?? Math.floor(Math.random() * LOGO_COUNT)
  );
  const [page, setPage] = useState(() =>
    Math.floor((initial?.cover ?? 0) / PER_PAGE)
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [focus, setFocus] = useState(initial?.focus ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  // inline "new pair" composer — the only place a code is ever assigned
  const [makingSet, setMakingSet] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newCode, setNewCode] = useState("");
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
      setImg(await fileToImageData(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const picked = categories.find((g) => g.id === categoryId) ?? null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("A profile needs a name.");
      return;
    }
    const needsPassword = !initial?.passwordHash;
    if (needsPassword || password) {
      if (password.length < 4) {
        setErr("Profile password must be at least 4 characters.");
        return;
      }
      if (password !== password2) {
        setErr("Passwords do not match.");
        return;
      }
    }
    const picked = categories.find((g) => g.id === categoryId);
    const draft: ProfileDraft = {
      img: img.trim() || undefined,
      cover,
      name: name.trim(),
      categoryId: picked ? picked.id : undefined,
      code: picked?.code,
      tag: picked?.name,
      focus: focus.trim(),
      passwordHash: initial?.passwordHash,
      passwordSalt: initial?.passwordSalt,
    };
    if (password) {
      const salt = randomSalt();
      draft.passwordSalt = salt;
      draft.passwordHash = await hashPassword(password, salt);
    }
    onSave(draft);
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
        aria-label={initial ? "Edit profile" : "Add profile"}
        className="relative max-h-[88dvh] w-full max-w-3xl overflow-y-auto border border-bone/15 bg-ash/95 p-6 sm:p-9"
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985, transition: { duration: 0.18 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.85 }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[9px] tracking-[0.45em] text-blood uppercase">
              {initial ? "Edit profile" : "New profile"}
            </p>
            <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.03em]">
              Watcher profile
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

        <form onSubmit={submit} className="mt-8 grid gap-7 md:grid-cols-[200px_1fr]">
          <div>
            <span className={label}>Emblem</span>
            <div className="relative mx-auto mt-2 flex aspect-square w-full max-w-[190px] items-center justify-center overflow-hidden rounded-full border border-bone/20 bg-carbon">
              {img ? (
                <img src={img} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <ProfileLogo index={cover} className="h-full w-full" />
              )}
              {!img && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-carbon/90 to-transparent p-3 text-center font-mono text-[9px] tracking-[0.3em] text-bone/60 uppercase">
                  Emblem {String(cover + 1).padStart(3, "0")}
                </span>
              )}
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 border border-bone/20 py-2.5 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/50 hover:text-bone">
              <ImageUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              {busy ? "Processing…" : "Upload image"}
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
                className="mt-2 w-full font-mono text-[9px] tracking-[0.3em] text-bone/35 uppercase transition-colors duration-300 hover:text-blood"
              >
                Remove image
              </button>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="pf-name">
                Profile name *
              </label>
              <input
                id="pf-name"
                ref={nameRef}
                className={field}
                value={name}
                placeholder="MKBHD"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className={label} htmlFor="pf-pass">
                {initial?.passwordHash ? "New password" : "Profile password *"}
              </label>
              <input
                id="pf-pass"
                type="password"
                className={field}
                value={password}
                autoComplete="new-password"
                placeholder={
                  initial?.passwordHash ? "Leave blank to keep" : "Min 4 characters"
                }
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="pf-pass2">
                Confirm password
              </label>
              <input
                id="pf-pass2"
                type="password"
                className={field}
                value={password2}
                autoComplete="new-password"
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>

            {/* ------------------- category (code comes with it) ------------------- */}
            <div>
              <label className={label} htmlFor="pf-category">
                Category
              </label>
              <CustomSelect
                id="pf-category"
                className={field}
                value={categoryId}
                onChange={setCategoryId}
                placeholder={categories.length ? "— none —" : "— create a set below —"}
                options={[
                  { value: "", label: "— none —" },
                  ...categories.map((g) => ({
                    value: g.id,
                    label: `${g.name} · ${g.code}`,
                  })),
                ]}
              />
            </div>

            {/* code is derived, never typed */}
            <div>
              <span className={label}>Code — auto</span>
              <div className="mt-2 flex items-center gap-2 border-b border-bone/10 pb-2.5">
                <Lock className="h-3 w-3 shrink-0 text-bone/30" strokeWidth={1.5} />
                <span
                  className={`font-mono text-sm tracking-[0.3em] ${
                    picked ? "text-blood" : "text-bone/25"
                  }`}
                >
                  {picked ? picked.code : "——"}
                </span>
              </div>
              <p className="mt-2 font-mono text-[9px] tracking-[0.25em] text-bone/25 uppercase">
                Locked to the category
              </p>
            </div>

            {/* ------------------------- the set ------------------------- */}
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={label}>Your set — {categories.length} pairs</span>
                <button
                  type="button"
                  onClick={() => {
                    setMakingSet((m) => !m);
                    setErr(null);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-bone/20 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-bone/60 uppercase transition-colors duration-300 hover:border-blood hover:text-bone"
                >
                  <Plus
                    className={`h-3 w-3 transition-transform duration-300 ${
                      makingSet ? "rotate-45" : ""
                    }`}
                    strokeWidth={1.5}
                  />
                  New pair
                </button>
              </div>

              {/* existing pairs — immutable */}
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.length === 0 && !makingSet && (
                  <p className="font-mono text-[9px] tracking-[0.25em] text-bone/25 uppercase">
                    No categories yet — create one to assign a code
                  </p>
                )}
                {categories.map((g) => {
                  const used = categoriesInUse.includes(g.id);
                  const active = categoryId === g.id;
                  return (
                    <span
                      key={g.id}
                      className={`group/pair flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                        active
                          ? "border-blood bg-blood/15 text-bone"
                          : "border-bone/15 text-bone/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCategoryId(active ? "" : g.id)}
                        className="flex items-center gap-2"
                      >
                        {g.name}
                        <span className="text-blood">{g.code}</span>
                      </button>
                      {!used && (
                        <button
                          type="button"
                          onClick={() => {
                            if (categoryId === g.id) setCategoryId("");
                            onRemoveCategory(g.id);
                          }}
                          aria-label={`Delete ${g.name}`}
                          title="Delete pair"
                          className="text-bone/25 transition-colors duration-200 hover:text-blood"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* new pair composer */}
              {makingSet && (
                <div className="mt-4 flex flex-wrap items-end gap-4 border border-bone/15 bg-black/30 p-4">
                  <div className="min-w-[10rem] flex-1">
                    <label className={label} htmlFor="pf-newcat">
                      Category name
                    </label>
                    <input
                      id="pf-newcat"
                      className={field}
                      value={newCat}
                      placeholder="Tutorials"
                      onChange={(e) => setNewCat(e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <label className={label} htmlFor="pf-newcode">
                      Code *
                    </label>
                    <input
                      id="pf-newcode"
                      maxLength={6}
                      className={`${field} tracking-[0.3em] uppercase`}
                      value={newCode}
                      placeholder="TUT"
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = onAddCategory(newCat, newCode);
                      if (!res.ok) {
                        setErr(res.error ?? "Could not create the pair.");
                        return;
                      }
                      setErr(null);
                      setNewCat("");
                      setNewCode("");
                      setMakingSet(false);
                    }}
                    className="rounded-full bg-bone px-5 py-2.5 font-mono text-[9px] tracking-[0.25em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone"
                  >
                    Lock pair
                  </button>
                  <p className="w-full font-mono text-[9px] tracking-[0.25em] text-bone/25 uppercase">
                    Codes are permanent — a pair cannot be edited once locked
                  </p>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={label} htmlFor="pf-focus">
                Content focus
              </label>
              <input
                id="pf-focus"
                className={field}
                value={focus}
                placeholder="Tech reviews · Unboxings · Podcasts"
                onChange={(e) => setFocus(e.target.value)}
              />
            </div>

            {/* ---------------------- cover pattern picker ---------------------- */}
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={label}>
                  Emblem — {LOGO_COUNT} round designs
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => (p - 1 + PAGES) % PAGES)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-bone/20 text-bone/60 transition-colors duration-300 hover:border-bone/60 hover:text-bone"
                    aria-label="Previous patterns"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <span className="font-mono text-[9px] tracking-[0.25em] text-bone/40 tabular-nums">
                    {page + 1}/{PAGES}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => (p + 1) % PAGES)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-bone/20 text-bone/60 transition-colors duration-300 hover:border-bone/60 hover:text-bone"
                    aria-label="More patterns"
                  >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pick = Math.floor(Math.random() * LOGO_COUNT);
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

              <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-9">
                {Array.from({ length: PER_PAGE }, (_, k) => page * PER_PAGE + k)
                  .filter((n) => n < LOGO_COUNT)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      title={`Emblem ${n + 1}`}
                      onClick={() => {
                        setCover(n);
                        setImg("");
                      }}
                      className={`relative aspect-square overflow-hidden rounded-full border transition-all duration-200 ${
                        cover === n && !img
                          ? "border-blood ring-2 ring-blood"
                          : "border-bone/10 hover:border-bone/60"
                      }`}
                    >
                      <ProfileLogo index={n} className="h-full w-full" />
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
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
                  {initial ? "Save profile" : "Add profile"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
