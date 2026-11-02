import { motion } from "framer-motion";
import {
  ArrowLeft,
  Crosshair,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { ChapterCover } from "../data/chapterCovers";
import { ProfileLogo } from "../data/profileLogos";
import type { Chapter, Session, Profile } from "../hooks/useProfiles";

const EASE = [0.16, 1, 0.3, 1] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const hours = (minutes: number) => (minutes / 60).toFixed(1);

function whenLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay
    ? `Today ${time}`
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`;
}

interface Props {
  profile: Profile;
  chapters: Chapter[];
  profileMinutes: number;
  minutesByChapter: Record<string, number>;
  recentSessions: Session[];
  activeChapterId: string;
  onBack: () => void;
  onEditProfile: () => void;
  onAddChapter: () => void;
  onEditChapter: (ch: Chapter) => void;
  onDeleteChapter: (id: string) => void;
  onFocusChapter: (ch: Chapter) => void;
  onDeleteSession: (id: string) => void;
}

export default function ProfileDetail({
  profile,
  chapters,
  profileMinutes,
  minutesByChapter,
  recentSessions,
  activeChapterId,
  onBack,
  onEditProfile,
  onAddChapter,
  onEditChapter,
  onDeleteChapter,
  onFocusChapter,
  onDeleteSession,
}: Props) {
  // targets were removed from channels — the bar now shows how many playlists
  // have been started, which is the only meaningful completion signal left
  const chapterPct =
    chapters.length > 0
      ? (chapters.filter((c) => (minutesByChapter[c.id] ?? 0) > 0).length /
          chapters.length) *
        100
      : 0;
  const started = chapters.filter((c) => (minutesByChapter[c.id] ?? 0) > 0).length;
  const chapterName = (id?: string) =>
    id ? chapters.find((c) => c.id === id)?.name : undefined;

  return (
    <motion.section
      id="profile-detail"
      className="scroll-mt-16 px-6 py-20 md:px-12 md:py-28"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {/* breadcrumb row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="group flex items-center gap-2.5 font-mono text-[10px] tracking-[0.35em] text-bone/60 uppercase transition-colors duration-300 hover:text-bone"
        >
          <ArrowLeft
            className="h-4 w-4 text-blood transition-transform duration-300 group-hover:-translate-x-1"
            strokeWidth={1.5}
          />
          All channels
        </button>
        <button
          onClick={onEditProfile}
          className="flex items-center gap-2 rounded-full border border-bone/20 px-5 py-2.5 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/60 hover:text-bone"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
          Edit channel
        </button>
      </div>

      {/* profile header — emblem beside the name */}
      <div className="mt-10 flex flex-wrap items-center gap-6 sm:gap-8">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full ring-1 ring-bone/15 sm:h-32 sm:w-32">
          {profile.img ? (
            <img src={profile.img} alt="" className="h-full w-full rounded-full object-cover" />
          ) : typeof profile.cover === "number" ? (
            <ProfileLogo index={profile.cover} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ash to-carbon">
              <span className="font-display text-3xl uppercase text-bone/15">
                {profile.name.slice(0, 2)}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
            CH—{profile.code}
            {profile.tag ? ` · ${profile.tag}` : ""}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.2rem,7vw,5.5rem)] uppercase leading-[0.92]">
            {profile.name}
          </h2>
        </div>
      </div>
      {profile.focus && (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-smoke">
          {profile.focus}
        </p>
      )}

      {/* profile progress */}
      <div className="mt-10 grid gap-8 border-y border-bone/10 py-8 sm:grid-cols-[auto_1fr] sm:items-center">
        <p className="font-display text-6xl tabular-nums leading-none md:text-7xl">
          {hours(profileMinutes)}
          <span className="ml-2 font-mono text-xs tracking-[0.3em] text-blood">HRS</span>
        </p>
        <div>
          <div className="flex flex-wrap justify-between gap-3 font-mono text-[10px] tracking-[0.3em] text-bone/50 uppercase">
            <span>{profileMinutes} min watched</span>
            <span>
              {started}/{chapters.length} playlists started
            </span>
          </div>
          <div className="mt-4 h-px w-full bg-bone/10">
            <div
              className="h-px bg-blood transition-all duration-700 ease-out"
              style={{ width: `${chapterPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* playlist header */}
      <div className="mt-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
            Playlists — {String(chapters.length).padStart(2, "0")}
          </p>
          <h3 className="mt-4 font-display text-[clamp(1.8rem,4.5vw,3.4rem)] uppercase leading-none">
            The playlist<span className="text-blood">.</span>
          </h3>
        </div>
        <button
          onClick={onAddChapter}
          className="group flex items-center gap-2.5 rounded-full border border-bone/25 px-6 py-3 font-mono text-[9px] tracking-[0.3em] text-bone uppercase transition-all duration-500 hover:border-blood hover:bg-blood"
        >
          <Plus
            className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-90"
            strokeWidth={1.5}
          />
          Add playlist
        </button>
      </div>

      {/* playlist grid — 16:9 landscape cards in rows & columns, names inside */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {chapters.map((ch, i) => {
          const mins = minutesByChapter[ch.id] ?? 0;
          const cpct =
            ch.targetHours > 0
              ? Math.min(100, (mins / (ch.targetHours * 60)) * 100)
              : 0;
          const armed = activeChapterId === ch.id;
          return (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: Math.min(i, 8) * 0.05 }}
            >
              <div
                className={`group relative aspect-video overflow-hidden bg-ash transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_44px_-16px_rgba(0,0,0,0.95)] ${
                  armed ? "ring-1 ring-blood" : ""
                }`}
              >
                {/* full-card click target */}
                <button
                  type="button"
                  onClick={() => onFocusChapter(ch)}
                  aria-label={`Track ${ch.name}`}
                  className="absolute inset-0 h-full w-full text-left"
                >
                  {ch.img ? (
                    <>
                      <img
                        src={ch.img}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/10 to-transparent" />
                    </>
                  ) : (
                    <ChapterCover
                      index={ch.cover ?? 0}
                      className="h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                    />
                  )}

                  {/* top meta */}
                  <span className="pointer-events-none absolute left-4 top-3.5 font-mono text-[10px] tracking-[0.35em] text-bone/70 uppercase">
                    PL.{ch.code}
                  </span>
                  {ch.tag && (
                    <span className="pointer-events-none absolute right-4 top-3.5 max-w-[45%] truncate font-mono text-[9px] tracking-[0.3em] text-bone/50 uppercase">
                      {ch.tag}
                    </span>
                  )}

                  {/* name — inside the card area */}
                  <span className="pointer-events-none absolute bottom-9 left-4 right-4 block truncate font-display text-[clamp(1.5rem,3.2vw,2.4rem)] uppercase leading-none tracking-[0.02em]">
                    {ch.name}
                  </span>
                  <span className="pointer-events-none absolute bottom-3.5 left-4 font-mono text-[9px] tracking-[0.3em] text-bone/50 uppercase">
                    {hours(mins)}H / {ch.targetHours}H
                  </span>
                  <span className="pointer-events-none absolute bottom-3 right-4 font-display text-xl tabular-nums leading-none">
                    {Math.round(cpct)}
                    <span className="ml-0.5 font-mono text-[9px] text-blood">%</span>
                  </span>

                  {/* hover affordance */}
                  <span className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full border border-bone/30 bg-black/60 px-4 py-2 font-mono text-[9px] tracking-[0.3em] text-bone uppercase opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:opacity-100">
                    <Crosshair className="h-3 w-3 text-blood" strokeWidth={1.5} />
                    Track
                  </span>
                </button>

                {/* progress line inside the card */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-bone/10">
                  <div
                    className="h-full bg-blood transition-all duration-700 ease-out"
                    style={{ width: `${cpct}%` }}
                  />
                </div>

                {/* edit / delete — outside the click button, valid HTML */}
                <div className="absolute right-3 top-9 z-20 flex gap-2 opacity-0 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    onClick={() => onEditChapter(ch)}
                    aria-label={`Edit ${ch.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/30 bg-black/60 text-bone backdrop-blur-sm transition-colors duration-300 hover:border-bone hover:bg-black/80"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => onDeleteChapter(ch.id)}
                    aria-label={`Delete ${ch.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/30 bg-black/60 text-bone backdrop-blur-sm transition-colors duration-300 hover:border-blood hover:bg-blood"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* add-playlist bay */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            ease: EASE,
            delay: Math.min(chapters.length, 8) * 0.07,
          }}
        >
          <button
            onClick={onAddChapter}
            className="group flex aspect-video w-full flex-col items-center justify-center gap-4 border border-dashed border-bone/15 transition-colors duration-500 hover:border-blood/60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-bone/20 transition-colors duration-500 group-hover:border-blood">
              <Plus
                className="h-4 w-4 text-bone/50 transition-all duration-500 group-hover:rotate-90 group-hover:text-blood"
                strokeWidth={1.5}
              />
            </span>
            <span className="font-mono text-[10px] tracking-[0.45em] text-bone/35 uppercase">
              Playlist {String(chapters.length + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[9px] tracking-[0.45em] text-bone/20 uppercase">
              {chapters.length === 0 ? "Add your first playlist" : "Add playlist"}
            </span>
          </button>
        </motion.div>
      </div>

      {/* profile session log */}
      {recentSessions.length > 0 && (
        <div className="mt-14">
          <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
            Recent sessions — {profile.name}
          </p>
          <ul className="mt-6 divide-y divide-bone/10 border-y border-bone/10">
            {recentSessions.map((l) => (
              <li
                key={l.id}
                className="group flex items-center justify-between gap-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] tracking-[0.25em] text-bone uppercase">
                    {chapterName(l.chapterId) ?? "Channel watch"}
                  </p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.3em] text-bone/35 uppercase">
                    {whenLabel(l.at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="font-display text-xl tabular-nums leading-none">
                    {l.minutes}
                    <span className="ml-1 font-mono text-[9px] tracking-[0.2em] text-blood">
                      MIN
                    </span>
                  </span>
                  <button
                    onClick={() => onDeleteSession(l.id)}
                    aria-label="Delete session"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/15 text-bone/40 opacity-0 transition-all duration-300 hover:border-blood hover:text-bone group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
