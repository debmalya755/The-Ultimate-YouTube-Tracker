import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Camera,
  Crosshair,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Radio,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react";
import Grain from "./Grain";
import DyingStar from "./DyingStar";
import StreakBar from "./StreakBar";
import Clocks from "./Clocks";
import ProfileEditor from "./ProfileEditor";
import ChannelEditor from "./ChannelEditor";
import ChapterEditor from "./ChapterEditor";
import ProfileDetail from "./ProfileDetail";
import Analytics from "./Analytics";
import { ProfileLogo } from "../data/profileLogos";
import ImageCropper from "./ImageCropper";
import type { Account } from "../hooks/useAuth";
import { useProfiles } from "../hooks/useProfiles";
import type { Chapter, Profile, YtChannel } from "../hooks/useProfiles";

const EASE = [0.16, 1, 0.3, 1] as const;

/** daily watch goal, in minutes */
const DAILY_GOAL = 180;

const MARQUEE = [
  "Every channel tracked",
  "Hours watched",
  "Watch history logged",
  "No missed uploads",
  "New videos queued",
  "Creators followed",
];

/* ------------------------------- helpers -------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");

const hours = (minutes: number) => (minutes / 60).toFixed(1);

function whenLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const isYesterday =
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`;
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function HeroLine({ children, order }: { children: ReactNode; order: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "115%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.3, ease: EASE, delay: 0.55 + order * 0.14 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ================================= site ================================== */

interface MainSiteProps {
  user: Account | null;
  /** running without an account via the gate switch */
  godMode?: boolean;
  onExitGod?: () => void;
  onUpdateProfile: (p: Partial<Pick<Account, "fullName" | "avatar">>) => void;
  onSignOut: () => void;
  onRelock: () => void;
}

export default function MainSite({
  user,
  godMode = false,
  onExitGod,
  onUpdateProfile,
  onSignOut,
  onRelock,
}: MainSiteProps) {
  const [avatarPick, setAvatarPick] = useState<string | null>(null);
  const {
    hydrated,
    categories,
    addCategory,
    removeCategory,
    profiles,
    ytChannels,
    addYtChannel,
    updateYtChannel,
    removeYtChannel,
    chapters,
    sessions,
    addProfile,
    updateProfile,
    removeProfile,
    addChapter,
    updateChapter,
    removeChapter,
    logSession,
    removeSession,
    stats,
    error: storageError,
  } = useProfiles(user?.id);

  type View = "profiles" | "log" | "stats";
  const viewLabel: Record<View, string> = {
    profiles: "profiles",
    log: "watch log",
    stats: "analytics",
  };
  const [view, setView] = useState<View>("profiles");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [chapterEditorOpen, setChapterEditorOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [channelEditorOpen, setChannelEditorOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<YtChannel | null>(null);

  /* --------------------------- drill-down view --------------------------- */
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailProfile = profiles.find((s) => s.id === detailId) ?? null;
  const detailChannels = useMemo(
    () =>
      ytChannels
        .filter((c) => c.profileId === detailId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [ytChannels, detailId]
  );
  const detailChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.profileId === detailId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [chapters, detailId]
  );
  const detailSessions = useMemo(
    () =>
      sessions
        .filter((l) => l.profileId === detailId)
        .sort((a, b) => b.at - a.at)
        .slice(0, 6),
    [sessions, detailId]
  );
  const chapterNameOf = (id: string) => chapters.find((c) => c.id === id)?.name;

  const scrollToTracker = () => {
    const el = document.getElementById("focus-core");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Sections are conditionally rendered, so hash links can point at a view
   * that does not exist yet. Switch the view first, then scroll after React
   * has mounted its destination. */
  const navigateTo = (next: View) => {
    setView(next);
    setDetailId(null);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const openProfile = (id: string) => {
    setDetailId(id);
    setTimeout(
      () =>
        document
          .getElementById("profile-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      140
    );
  };

  const backToProfiles = () => {
    setDetailId(null);
    setTimeout(
      () =>
        document
          .getElementById("profiles")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      140
    );
  };

  // leave the detail view if its profile disappears
  useEffect(() => {
    if (detailId && profiles.length > 0 && !profiles.some((s) => s.id === detailId)) {
      setDetailId(null);
    }
  }, [profiles, detailId]);

  // ESC backs out of a profile (unless a modal or fullscreen owns it)
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editorOpen || chapterEditorOpen || channelEditorOpen) return;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      if (doc.fullscreenElement ?? doc.webkitFullscreenElement) return;
      backToProfiles();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, editorOpen, chapterEditorOpen, channelEditorOpen]);

  /* ----------------------------- focus timer -----------------------------
   * Timestamp-based on purpose: a plain setInterval counter is throttled to
   * roughly one tick per minute in background tabs, so switching away to read
   * notes would silently lose most of a session. `base` holds accumulated
   * seconds, `startedAt` the epoch ms of the current run — elapsed is always
   * derived, so throttling can never lose time.
   */
  const TIMER_KEY = `debos.timer.v1:${user?.id ?? "anon"}`;
  /* read synchronously during the first render — restoring in an effect would
     let the save effect flush defaults over the stored session first */
  const restored = useRef(
    ((): {
      base: number;
      startedAt: number | null;
      activeId: string;
      activeChapterId: string;
    } => {
      const blank = { base: 0, startedAt: null, activeId: "", activeChapterId: "" };
      try {
        const raw = localStorage.getItem(TIMER_KEY);
        if (!raw) return blank;
        const t = JSON.parse(raw) as Record<string, unknown>;
        return {
          base:
            typeof t.base === "number" && Number.isFinite(t.base) && t.base >= 0
              ? t.base
              : 0,
          // a startedAt in the future would yield negative elapsed — reject it
          startedAt:
            typeof t.startedAt === "number" && t.startedAt <= Date.now()
              ? t.startedAt
              : null,
          activeId: typeof t.activeId === "string" ? t.activeId : "",
          activeChapterId:
            typeof t.activeChapterId === "string" ? t.activeChapterId : "",
        };
      } catch {
        return blank;
      }
    })()
  ).current;

  const [activeId, setActiveId] = useState(restored.activeId);
  const [activeChapterId, setActiveChapterId] = useState(restored.activeChapterId);
  const [base, setBase] = useState(restored.base);
  const [startedAt, setStartedAt] = useState<number | null>(restored.startedAt);
  const [, forceTick] = useState(0);

  const running = startedAt !== null;
  const elapsed =
    base + (startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);

  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_KEY,
        JSON.stringify({ base, startedAt, activeId, activeChapterId })
      );
    } catch {
      /* ignore */
    }
  }, [TIMER_KEY, base, startedAt, activeId, activeChapterId]);

  // repaint each second; also snap back instantly when the tab regains focus
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    const onVis = () => forceTick((t) => t + 1);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [running]);


  /** Re-arm the watch tracker. Banks accrued time against the OLD target first so
   *  minutes are never silently credited to the wrong profile. */
  const retarget = (profileId: string, chapterId: string) => {
    if (activeId && elapsed >= 60) {
      logSession(activeId, Math.round(elapsed / 60), activeChapterId || undefined);
    }
    setBase(0);
    setStartedAt(null);
    setActiveId(profileId);
    setActiveChapterId(chapterId);
  };

  // selecting a playlist returns to the watch tracker, which lives in the hero
  const focusChapter = (ch: Chapter) => {
    retarget(ch.profileId, ch.id);
    setDetailId(null);
    scrollToTracker();
  };

  // drop a stale chapter selection (only once storage has loaded)
  useEffect(() => {
    if (!hydrated) return;
    if (activeChapterId && !chapters.some((c) => c.id === activeChapterId)) {
      setActiveChapterId("");
    }
  }, [hydrated, chapters, activeChapterId]);

  // wait for storage to load, otherwise the momentarily-empty list would
  // clear a profile restored from a running session
  useEffect(() => {
    if (!hydrated) return;
    if (profiles.length === 0) {
      setActiveId("");
      return;
    }
    if (!profiles.some((s) => s.id === activeId)) setActiveId(profiles[0].id);
  }, [hydrated, profiles, activeId]);

  const dayPct = Math.min(100, (stats.todayMinutes / DAILY_GOAL) * 100);
  const topProfileMinutes = Math.max(
    1,
    ...profiles.map((p) => stats.byProfile[p.id] ?? 0)
  );
  const categoriesInUse = profiles
    .map((p) => p.categoryId)
    .filter((x): x is string => typeof x === "string");
  const ringLen = 2 * Math.PI * 48;

  const recent = useMemo(
    () => [...sessions].sort((a, b) => b.at - a.at).slice(0, 8),
    [sessions]
  );
  const nameOf = (id: string) =>
    profiles.find((s) => s.id === id)?.name ?? "Removed profile";

  return (
    <div className="relative min-h-dvh bg-carbon text-bone">
      <Grain fixed opacity={0.05} />

      <motion.div
        className="pointer-events-none fixed inset-0 z-[80] bg-carbon"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* ------------------------------ nav ------------------------------ */}
      <nav className="fixed inset-x-0 top-0 z-[60] border-b border-bone/10 bg-carbon/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-5 md:px-12">
          <div className="flex flex-col">
            <button
              onClick={() => {
                setView("profiles");
                setDetailId(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-left font-display text-xl uppercase leading-none tracking-[0.08em]"
            >
              YouTube<span className="text-blood">·</span>Tracker
            </button>
            <Clocks />
          </div>
          <div className="relative flex items-center gap-1 rounded-full border border-bone/15 p-1">
            {(["profiles", "log", "stats"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  if (v === view) return;
                  setView(v);
                  setDetailId(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="relative rounded-full px-4 py-2 font-mono text-[9px] tracking-[0.3em] uppercase sm:px-5"
              >
                {/* the pill physically slides between tabs */}
                {view === v && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full bg-bone"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-300 ${
                    view === v ? "text-carbon" : "text-bone/60 hover:text-bone"
                  }`}
                >
                  {viewLabel[v]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {godMode && (
              <>
                <span className="hidden items-center gap-1.5 rounded-full border border-blood/50 bg-blood/15 px-3 py-1.5 font-mono text-[9px] tracking-[0.3em] text-blood uppercase sm:flex">
                  <Zap className="h-3 w-3" strokeWidth={1.5} fill="currentColor" />
                  God-mode
                </span>
                {onExitGod && (
                  <button
                    onClick={onExitGod}
                    title="Create an account to save your channel tracker"
                    className="flex items-center gap-2 rounded-full border border-bone/30 px-4 py-2 font-mono text-[10px] tracking-[0.3em] uppercase transition-all duration-500 hover:border-blood hover:bg-blood"
                  >
                    <UserPlus className="h-3 w-3" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Sign in</span>
                  </button>
                )}
              </>
            )}
            {user && (
              <>
                {/* avatar — click to re-crop a new one */}
                <label
                    title="Change account picture"
                  className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border border-bone/30 bg-ash"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-mono text-[10px] text-bone/70">
                      {user.fullName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = "";
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () => setAvatarPick(String(r.result));
                      r.readAsDataURL(f);
                    }}
                  />
                </label>
                <span className="hidden font-mono text-[10px] tracking-[0.25em] text-bone/70 uppercase lg:inline">
                  @{user.displayUsername}
                </span>
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="flex items-center gap-2 rounded-full border border-bone/30 px-4 py-2 font-mono text-[10px] tracking-[0.3em] uppercase transition-all duration-500 hover:border-blood hover:bg-blood"
                >
                  <LogOut className="h-3 w-3" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            )}
            <button
              onClick={onRelock}
              title="Lock session"
              className="flex items-center gap-2 rounded-full border border-bone/30 px-4 py-2 font-mono text-[10px] tracking-[0.3em] uppercase transition-all duration-500 hover:border-blood hover:bg-blood"
            >
              <Lock className="h-3 w-3" strokeWidth={1.5} />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ----------- hero — hidden while a profile is open ----------- */}
      {!detailProfile && view === "profiles" && (
      <header id="top" className="relative min-h-dvh overflow-hidden">
        <div className="absolute inset-0 bg-carbon" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 85% at 68% 42%, rgba(30,43,51,0.8) 0%, rgba(10,13,15,0.5) 46%, rgba(5,5,6,0) 74%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(237,237,240,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(237,237,240,0.05) 1px, transparent 1px)",
            backgroundSize: "84px 84px",
            maskImage:
              "radial-gradient(ellipse 80% 75% at 64% 44%, black 8%, transparent 76%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 75% at 64% 44%, black 8%, transparent 76%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-carbon/35" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 82% 72% at center, transparent 42%, rgba(5,5,6,0.72) 100%)",
          }}
        />

        {/* watch tracker — arc reactor + daily progress ring */}
        <motion.div
          id="focus-core"
          className="pointer-events-none absolute left-1/2 top-[13%] w-[58vw] max-w-[260px] -translate-x-1/2 md:left-auto md:right-[5vw] md:top-1/2 md:w-[min(42vw,520px)] md:max-w-none md:translate-x-0 md:-translate-y-[58%]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.3 }}
        >
          <div className="relative">
            <DyingStar className="aspect-square w-full" />
            {/* daily goal ring */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-[-7%] -rotate-90"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="rgba(237,237,240,0.08)"
                strokeWidth="0.6"
              />
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="#e10600"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeDasharray={ringLen}
                strokeDashoffset={ringLen * (1 - dayPct / 100)}
                style={{ transition: "stroke-dashoffset 900ms ease-out" }}
              />
            </svg>
          </div>

          <div className="mt-5 hidden items-center justify-between gap-6 font-mono text-[9px] tracking-[0.32em] text-bone/45 uppercase md:flex">
            <span>Watch tracker — signal live</span>
            <span
              className={`flex items-center gap-2 ${
                running ? "text-blood" : "text-bone/45"
              }`}
            >
              <span
                className={`inline-block h-1 w-1 rounded-full ${
                  running ? "animate-blink bg-blood" : "bg-bone/40"
                }`}
              />
              {running ? "Watch session active" : "Ready to track"}
            </span>
          </div>
          <div className="mt-2 hidden justify-between gap-6 font-mono text-[8px] tracking-[0.32em] text-bone/25 uppercase md:flex">
            <span>
              Today {stats.todayMinutes} / {DAILY_GOAL} min
            </span>
            <span>Streak {stats.streak} d</span>
          </div>
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 px-6 pb-10 md:px-12 md:pb-14">
          <motion.p
            className="mb-6 flex items-center gap-3 font-mono text-[10px] tracking-[0.45em] text-blood uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.8 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" />
            {user
              ? `Dashboard loaded — ${user.fullName.split(" ")[0]}`
              : godMode
                ? "God-mode — no account attached"
                : "Dashboard loaded — viewer 0026"}
          </motion.p>

          <h1 className="font-display uppercase leading-[0.92] tracking-[0.01em]">
            <HeroLine order={0}>
              <span className="text-[clamp(2.1rem,8.2vw,6.8rem)]">
              The Apt
              </span>
            </HeroLine>
            <HeroLine order={1}>
              <span className="text-[clamp(2.1rem,8.2vw,6.8rem)]">
                <span className="text-outline">Tool you&nbsp;</span>Need
              </span>
            </HeroLine>
          </h1>

          {/* streak — unboxed so it reads as part of the hero */}
          <StreakBar
            streak={stats.streak}
            bestStreak={stats.bestStreak}
            days={stats.recentDays}
            loggedToday={stats.loggedToday}
            dailyGoal={DAILY_GOAL}
          />
        </div>
      </header>
      )}

      {/* ------------------- marquee — overview only ------------------- */}
      {!detailProfile && view === "profiles" && (
      <div className="overflow-hidden border-y border-bone/10 py-5 md:py-7">
        <div className="animate-marquee flex w-max items-center whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="flex items-center">
              <span className="px-8 font-display text-2xl uppercase tracking-[0.04em] text-bone/80 md:text-4xl">
                {t}
              </span>
              <span className="h-1.5 w-1.5 rotate-45 bg-blood" />
            </span>
          ))}
        </div>
      </div>
      )}

      {/* clearance for the fixed nav once the hero is gone */}
      {(detailProfile || view !== "profiles") && (
        <div className="h-20 md:h-24" aria-hidden />
      )}

      {/* ----------------- tab views — cross-faded ----------------- */}
      <AnimatePresence mode="wait" initial={false}>
      {view === "profiles" && (
      <motion.div
        key="view-profiles"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
      <AnimatePresence mode="wait" initial={false}>
        {detailProfile ? (
          <ProfileDetail
            key="detail"
            profile={detailProfile}
            channels={detailChannels}
            chapters={detailChapters}
            profileMinutes={stats.byProfile[detailProfile.id] ?? 0}
            minutesByChapter={stats.byChapter}
            recentSessions={detailSessions}
            activeChapterId={activeChapterId}
            onBack={backToProfiles}
            onEditProfile={() => {
              setEditing(detailProfile);
              setEditorOpen(true);
            }}
            onAddChannel={() => {
              setEditingChannel(null);
              setChannelEditorOpen(true);
            }}
            onEditChannel={(ch) => {
              setEditingChannel(ch);
              setChannelEditorOpen(true);
            }}
            onDeleteChannel={removeYtChannel}
            onAddChapter={() => {
              setEditingChapter(null);
              setChapterEditorOpen(true);
            }}
            onEditChapter={(ch) => {
              setEditingChapter(ch);
              setChapterEditorOpen(true);
            }}
            onDeleteChapter={removeChapter}
            onFocusChapter={focusChapter}
            onDeleteSession={removeSession}
          />
        ) : (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
      {/* ---------------------------- profiles ---------------------------- */}
      <section
        id="profiles"
        className="px-6 py-24 [content-visibility:auto] [contain-intrinsic-size:auto_1400px] md:px-12 md:py-36"
      >
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
                01 — Profiles
              </p>
              <h2 className="mt-6 max-w-3xl font-display text-[clamp(2.2rem,6vw,5rem)] uppercase leading-[0.95]">
                Profiles that
                <span className="text-outline block">Hold it all.</span>
              </h2>
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              className="group flex items-center gap-2.5 rounded-full border border-bone/25 px-6 py-3 font-mono text-[9px] tracking-[0.3em] text-bone uppercase transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-blood hover:bg-blood active:translate-y-0"
            >
              <Plus
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-90"
                strokeWidth={1.5}
              />
              Add profile
            </button>
          </div>
        </Reveal>

        {storageError && (
          <p className="mt-6 font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
            {storageError}
          </p>
        )}

        {/* horizontal profile rail */}
        <div className="scroll-rail -mx-6 mt-16 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-8 md:-mx-12 md:px-12">
          {profiles.map((sub, i) => {
            const mins = stats.byProfile[sub.id] ?? 0;
            // no targets any more — the bar shows this profile's share of the
            // busiest profile, so the rail still reads comparatively
            const pct = topProfileMinutes > 0 ? (mins / topProfileMinutes) * 100 : 0;
            return (
              <Reveal
                key={sub.id}
                delay={Math.min(i, 5) * 0.12}
                className="w-[58vw] shrink-0 snap-start sm:w-[230px]"
              >
                <div className="group relative block">
                  <div className="absolute right-0 top-1 z-20 flex gap-1.5 opacity-0 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditing(sub);
                        setEditorOpen(true);
                      }}
                      aria-label={`Edit ${sub.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/30 bg-black/70 text-bone backdrop-blur-sm transition-colors duration-300 hover:border-bone hover:bg-black/90"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => removeProfile(sub.id)}
                      aria-label={`Delete ${sub.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/30 bg-black/70 text-bone backdrop-blur-sm transition-colors duration-300 hover:border-blood hover:bg-blood"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openProfile(sub.id)}
                    aria-label={`Open ${sub.name}`}
                    className={`group/logo relative mx-auto block aspect-square w-full max-w-[185px] overflow-hidden rounded-full bg-ash transition-[transform,box-shadow,--tw-ring-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform hover:-translate-y-1.5 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] active:translate-y-0 active:scale-[0.98] ${
                      activeId === sub.id ? "ring-2 ring-blood" : "ring-1 ring-bone/10"
                    }`}
                  >
                    {sub.img ? (
                      <img
                        src={sub.img}
                        alt={sub.name}
                        loading="lazy"
                        decoding="async"
                        onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                        className="h-full w-full rounded-full object-cover opacity-0 transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.05]"
                      />
                    ) : typeof sub.cover === "number" ? (
                      <ProfileLogo
                        index={sub.cover}
                        className="h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-ash to-carbon">
                        <span className="font-display text-5xl uppercase text-bone/15">
                          {sub.name.slice(0, 2)}
                        </span>
                      </div>
                    )}

                    {/* hover veil + open affordance, clipped to the circle */}
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-carbon/70 opacity-0 backdrop-blur-[2px] transition-opacity duration-400 group-hover:opacity-100">
                      <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-bone uppercase">
                        Open
                        <ArrowRight className="h-3 w-3 text-blood" strokeWidth={1.5} />
                      </span>
                    </span>
                  </button>

                  {/* name sits under the logo */}
                  <h3 className="mt-4 truncate text-center font-display text-xl uppercase leading-tight tracking-[0.03em]">
                    {sub.name}
                  </h3>
                  <p className="mt-1.5 text-center font-mono text-[8px] tracking-[0.3em] text-blood uppercase">
                    CH—{sub.code}
                    {sub.tag ? <span className="text-bone/35"> · {sub.tag}</span> : null}
                  </p>

                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="font-display text-2xl leading-none tabular-nums">
                      {hours(mins)}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] text-blood">
                      HRS
                    </span>
                  </div>

                  <p className="mt-1.5 truncate text-center font-mono text-[9px] tracking-[0.2em] text-bone/45 uppercase">
                    {mins} min watched
                  </p>

                  {/* progress — the iconic red line, now meaningful */}
                  <div className="mt-3 h-px w-full bg-bone/10">
                    <div
                      className="h-px bg-blood transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                    <button
                      onClick={() => {
                        retarget(sub.id, "");
                        scrollToTracker();
                      }}
                      className="flex items-center gap-1 rounded-full border border-bone/15 px-2.5 py-1 font-mono text-[8px] tracking-[0.15em] text-bone/60 uppercase transition-colors duration-300 hover:border-blood hover:bg-blood hover:text-bone"
                    >
                      <Crosshair className="h-3 w-3" strokeWidth={1.5} />
                      Track
                    </button>
                    {[15, 30, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => logSession(sub.id, m)}
                        className="rounded-full border border-bone/15 px-2.5 py-1 font-mono text-[8px] tracking-[0.15em] text-bone/60 uppercase transition-colors duration-300 hover:border-blood hover:bg-blood hover:text-bone"
                      >
                        +{m}m
                      </button>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal
            delay={Math.min(profiles.length, 5) * 0.12}
            className="w-[58vw] shrink-0 snap-start sm:w-[230px]"
          >
            <button
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              className="group mx-auto flex aspect-square w-full max-w-[185px] flex-col items-center justify-center gap-3 rounded-full border border-dashed border-bone/20 transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-blood/60 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-bone/20 transition-colors duration-500 group-hover:border-blood">
                <Plus
                  className="h-4 w-4 text-bone/50 transition-all duration-500 group-hover:rotate-90 group-hover:text-blood"
                  strokeWidth={1.5}
                />
              </span>
              <span className="font-mono text-[10px] tracking-[0.45em] text-bone/35 uppercase">
                Profile {String(profiles.length + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[9px] tracking-[0.45em] text-bone/20 uppercase">
                Add profile
              </span>
            </button>
          </Reveal>

          {profiles.length === 0 &&
            ["02", "03"].map((bay, i) => (
              <Reveal
                key={bay}
                delay={(i + 2) * 0.12}
                className="w-[58vw] shrink-0 snap-start sm:w-[230px]"
              >
                <div className="mx-auto flex aspect-square w-full max-w-[185px] flex-col items-center justify-center gap-3 rounded-full border border-dashed border-bone/[0.08]">
                  <span className="font-mono text-[10px] tracking-[0.45em] text-bone/15 uppercase">
                    Profile {bay}
                  </span>
                  <span className="h-1.5 w-1.5 rotate-45 border border-bone/15" />
                  <span className="font-mono text-[9px] tracking-[0.45em] text-bone/10 uppercase">
                    Awaiting profile
                  </span>
                </div>
              </Reveal>
            ))}
        </div>
      </section>


        </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
      )}

      {/* ---------------------- YouTube analytics ---------------------- */}
      {view === "stats" && (
      <motion.div
        key="view-stats"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
      <Analytics
        profiles={profiles}
        chapters={chapters}
        sessions={sessions}
        dailyGoal={DAILY_GOAL}
        streak={stats.streak}
        bestStreak={stats.bestStreak}
        onDeleteSession={removeSession}
      />
      </motion.div>
      )}

      {/* ------------------------------- log ------------------------------ */}
      {view === "log" && (
      <motion.div
        key="view-log"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
      <section
        id="log"
        className="relative overflow-hidden px-6 py-24 [content-visibility:auto] [contain-intrinsic-size:auto_1100px] md:px-12 md:py-40"
      >
        <span
          aria-hidden
          className="text-outline pointer-events-none absolute -right-8 top-8 select-none font-display text-[24vw] leading-none opacity-10"
        >
          D_
        </span>
        <div className="relative grid items-start gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-6">
            <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
              03 — Watch log
            </p>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,7vw,6rem)] uppercase leading-[0.95]">
              Hours are tracked,
              <span className="text-outline block">Not guessed.</span>
            </h2>
            <p className="mt-8 max-w-md text-sm leading-relaxed text-smoke">
              Every watch session is written to this machine and nowhere else. No
              accounts, no sync, no telemetry — the log is yours alone.
            </p>
          </Reveal>

          <Reveal className="md:col-span-6" delay={0.15}>
            {recent.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 border border-dashed border-bone/15 p-10 text-center">
                <span className="h-1.5 w-1.5 rotate-45 border border-blood/50" />
                <span className="font-mono text-[9px] tracking-[0.4em] text-bone/30 uppercase">
                  No watch sessions recorded
                </span>
                <span className="max-w-xs font-mono text-[9px] tracking-[0.3em] text-bone/20 uppercase">
                  Start a watch session or tap +15m on a profile
                </span>
              </div>
            ) : (
              <ul className="divide-y divide-bone/10 border-y border-bone/10">
                {recent.map((l) => (
                  <li
                    key={l.id}
                    className="group flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] tracking-[0.25em] text-bone uppercase">
                        {nameOf(l.profileId)}
                        {l.chapterId && chapterNameOf(l.chapterId)
                          ? ` · ${chapterNameOf(l.chapterId)}`
                          : ""}
                      </p>
                      <p className="mt-1.5 font-mono text-[9px] tracking-[0.3em] text-bone/35 uppercase">
                        {whenLabel(l.at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-display text-2xl tabular-nums leading-none">
                        {l.minutes}
                        <span className="ml-1 font-mono text-[9px] tracking-[0.2em] text-blood">
                          MIN
                        </span>
                      </span>
                      <button
                        onClick={() => removeSession(l.id)}
                        aria-label="Delete session"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/15 text-bone/40 opacity-0 transition-all duration-300 hover:border-blood hover:text-bone group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => navigateTo("profiles")}
              className="group mt-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] text-bone uppercase"
            >
              Manage profiles
              <ArrowUpRight
                className="h-4 w-4 text-blood transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </button>
          </Reveal>
        </div>
      </section>
      </motion.div>
      )}
      </AnimatePresence>

      {/* ----------------------------- footer ----------------------------- */}
      <footer className="border-t border-bone/10 px-6 pb-10 pt-20 md:px-12">
        <h2 className="text-outline text-center font-display text-[clamp(2.6rem,14vw,12rem)] uppercase leading-[0.85]">
          Tracker
        </h2>
        <div className="mt-16 flex flex-col items-center justify-between gap-6 font-mono text-[9px] tracking-[0.3em] text-bone/40 uppercase sm:flex-row">
          <p>© 2026 The Ultimate YouTube Tracker · All hours accounted</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => navigateTo("profiles")}
              aria-label="Open profiles"
              className="transition-colors duration-300 hover:text-bone"
            >
              <Camera className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => navigateTo("log")}
              aria-label="Open watch log"
              className="transition-colors duration-300 hover:text-bone"
            >
              <Radio className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => navigateTo("stats")}
              aria-label="Open analytics"
              className="transition-colors duration-300 hover:text-bone"
            >
              <AtSign className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <p>Subscribe · Watch · Repeat</p>
        </div>
      </footer>

      <AnimatePresence>
        {editorOpen && (
          <ProfileEditor
            key="profile-editor"
            initial={editing}
            categories={categories}
            onAddCategory={addCategory}
            onRemoveCategory={removeCategory}
            categoriesInUse={categoriesInUse}
            onCancel={() => {
              setEditorOpen(false);
              setEditing(null);
            }}
            onSave={(draft) => {
              if (editing) updateProfile(editing.id, draft);
              else addProfile(draft);
              setEditorOpen(false);
              setEditing(null);
            }}
          />
        )}
        {avatarPick && (
          <ImageCropper
            key="avatar-cropper"
            src={avatarPick}
            onCancel={() => setAvatarPick(null)}
            onApply={(d) => {
              onUpdateProfile({ avatar: d });
              setAvatarPick(null);
            }}
          />
        )}
        {channelEditorOpen && detailProfile && (
          <ChannelEditor
            key="channel-editor"
            initial={editingChannel}
            onCancel={() => {
              setChannelEditorOpen(false);
              setEditingChannel(null);
            }}
            onSave={(draft) => {
              if (editingChannel) updateYtChannel(editingChannel.id, draft);
              else addYtChannel(detailProfile.id, draft);
              setChannelEditorOpen(false);
              setEditingChannel(null);
            }}
          />
        )}
        {chapterEditorOpen && detailProfile && (
          <ChapterEditor
            key="chapter-editor"
            profileName={detailProfile.name}
            initial={editingChapter}
            nextCode={String(detailChapters.length + 1).padStart(2, "0")}
            onCancel={() => {
              setChapterEditorOpen(false);
              setEditingChapter(null);
            }}
            onSave={(draft) => {
              if (editingChapter) updateChapter(editingChapter.id, draft);
              else addChapter(detailProfile.id, draft);
              setChapterEditorOpen(false);
              setEditingChapter(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
