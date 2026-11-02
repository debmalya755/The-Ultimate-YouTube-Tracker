import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { dayKey } from "../hooks/useProfiles";
import type { Chapter, Session, Profile } from "../hooks/useProfiles";

const EASE = [0.16, 1, 0.3, 1] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const hrs = (m: number) => (m / 60).toFixed(1);

const DAY_INITIAL = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function whenLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const same =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return same ? `Today ${t}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${t}`;
}

/* ------------------------------ chart frame ------------------------------ */

function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-bone/12 bg-black/25 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-mono text-[9px] tracking-[0.4em] text-bone/55 uppercase">
          {title}
        </h3>
        {meta && (
          <span className="font-mono text-[9px] tracking-[0.3em] text-bone/30 uppercase">
            {meta}
          </span>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

interface Props {
  profiles: Profile[];
  chapters: Chapter[];
  sessions: Session[];
  dailyGoal: number;
  streak: number;
  bestStreak: number;
  onDeleteSession: (id: string) => void;
}

export default function Analytics({
  profiles,
  chapters,
  sessions,
  dailyGoal,
  streak,
  bestStreak,
  onDeleteSession,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const d = useMemo(() => {
    const today = startOfDay(new Date());

    /* minutes per day lookup */
    const perDay = new Map<string, number>();
    const perHour = new Array(24).fill(0);
    const perProfile = new Map<string, number>();
    const perChapter = new Map<string, number>();
    let total = 0;

    for (const s of sessions) {
      const k = dayKey(s.at);
      perDay.set(k, (perDay.get(k) ?? 0) + s.minutes);
      perHour[new Date(s.at).getHours()] += s.minutes;
      perProfile.set(s.profileId, (perProfile.get(s.profileId) ?? 0) + s.minutes);
      if (s.chapterId)
        perChapter.set(s.chapterId, (perChapter.get(s.chapterId) ?? 0) + s.minutes);
      total += s.minutes;
    }

    /* last 14 days */
    const days14 = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (13 - i));
      return {
        date,
        minutes: perDay.get(dayKey(date.getTime())) ?? 0,
        label: DAY_INITIAL[date.getDay()],
      };
    });

    /* last 30 days — cumulative */
    const days30 = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      return perDay.get(dayKey(date.getTime())) ?? 0;
    });
    let run = 0;
    const cumulative = days30.map((m) => (run += m));

    /* heatmap — 18 weeks ending this week, columns = weeks */
    const weeks = 18;
    const anchor = new Date(today);
    anchor.setDate(anchor.getDate() - anchor.getDay() - (weeks - 1) * 7);
    const heat = Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, dow) => {
        const date = new Date(anchor);
        date.setDate(date.getDate() + w * 7 + dow);
        return {
          minutes: perDay.get(dayKey(date.getTime())) ?? 0,
          future: date.getTime() > today.getTime(),
          date,
        };
      })
    );

    /* profile split */
    const split = profiles
      .map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        minutes: perProfile.get(s.id) ?? 0,
      }))
      .filter((s) => s.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    /* top chapters */
    const topChapters = chapters
      .map((c) => ({
        id: c.id,
        name: c.name,
        minutes: perChapter.get(c.id) ?? 0,
        profile: profiles.find((s) => s.id === c.profileId)?.name ?? "",
      }))
      .filter((c) => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    const activeDays = [...perDay.values()].filter((m) => m > 0).length;
    const bestDay = Math.max(0, ...perDay.values());
    const goalHits = days30.filter((m) => m >= dailyGoal).length;
    const last7 = days14.slice(7).reduce((a, b) => a + b.minutes, 0);
    const prev7 = days14.slice(0, 7).reduce((a, b) => a + b.minutes, 0);
    const delta = prev7 === 0 ? (last7 > 0 ? 100 : 0) : ((last7 - prev7) / prev7) * 100;
    const peakHour = perHour.indexOf(Math.max(...perHour));

    return {
      days14,
      cumulative,
      heat,
      split,
      topChapters,
      perHour,
      total,
      activeDays,
      bestDay,
      goalHits,
      last7,
      prev7,
      delta,
      peakHour,
      avgActive: activeDays ? total / activeDays : 0,
    };
  }, [sessions, profiles, chapters, dailyGoal]);

  const allLogs = useMemo(
    () => [...sessions].sort((a, b) => b.at - a.at),
    [sessions]
  );
  const logs = showAll ? allLogs : allLogs.slice(0, 10);
  const profileName = (id: string) =>
    profiles.find((s) => s.id === id)?.name ?? "Removed profile";
  const chapterName = (id?: string) =>
    id ? chapters.find((c) => c.id === id)?.name : undefined;

  const maxDay = Math.max(dailyGoal, ...d.days14.map((x) => x.minutes), 1);
  const maxCum = Math.max(...d.cumulative, 1);
  const maxHour = Math.max(...d.perHour, 1);
  const maxSplit = d.split[0]?.minutes ?? 1;
  const empty = sessions.length === 0;

  const KPIS = [
    { n: hrs(d.total), u: "HRS", l: "Lifetime" },
    { n: hrs(d.last7), u: "HRS", l: "Last 7 days" },
    { n: String(streak), u: "DAYS", l: "Streak" },
    { n: String(bestStreak), u: "DAYS", l: "Best streak" },
    { n: String(d.activeDays), u: "DAYS", l: "Active" },
    { n: String(Math.round(d.bestDay)), u: "MIN", l: "Best day" },
    { n: `${d.goalHits}`, u: "/30", l: "Watch goals hit" },
  ];

  return (
    <section
      id="stats"
      className="border-y border-bone/10 px-6 py-24 [content-visibility:auto] [contain-intrinsic-size:auto_1800px] md:px-12 md:py-32"
    >
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
          02 — YouTube analytics
        </p>
        <h2 className="mt-6 max-w-3xl font-display text-[clamp(2.2rem,6vw,5rem)] uppercase leading-[0.95]">
          Every watch,
          <span className="text-outline block">Accounted for.</span>
        </h2>
      </motion.div>

      {empty ? (
        <div className="mt-14 flex flex-col items-center justify-center gap-4 border border-dashed border-bone/15 py-20 text-center">
          <span className="h-1.5 w-1.5 rotate-45 border border-blood/50" />
          <span className="font-mono text-[9px] tracking-[0.4em] text-bone/30 uppercase">
            No data recorded yet
          </span>
          <span className="max-w-xs font-mono text-[9px] tracking-[0.3em] text-bone/20 uppercase">
            Charts populate as you log watch sessions
          </span>
        </div>
      ) : (
        <>
          {/* ------------------------------ KPIs ------------------------------ */}
          <div className="mt-14 grid grid-cols-2 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
            {KPIS.map((k) => (
              <div key={k.l}>
                <p className="font-display text-5xl tabular-nums leading-none">
                  {k.n}
                  <span className="ml-1.5 font-mono text-[10px] tracking-[0.25em] text-blood">
                    {k.u}
                  </span>
                </p>
                <p className="mt-3 font-mono text-[9px] tracking-[0.3em] text-smoke uppercase">
                  {k.l}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* ---------------------- 14-day bar chart ---------------------- */}
            <Panel
              title="Daily watch time — 14 days"
              meta={`Watch goal ${dailyGoal} min`}
              className="lg:col-span-2"
            >
              <svg viewBox="0 0 700 200" className="w-full" role="img" aria-label="Daily watch minutes">
                {/* goal line */}
                <line
                  x1="0"
                  y1={170 - (dailyGoal / maxDay) * 150}
                  x2="700"
                  y2={170 - (dailyGoal / maxDay) * 150}
                  stroke="#e10600"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  strokeDasharray="5 5"
                />
                {d.days14.map((day, i) => {
                  const bw = 700 / 14;
                  const h = (day.minutes / maxDay) * 150;
                  const hit = day.minutes >= dailyGoal;
                  return (
                    <g key={i}>
                      <rect
                        x={i * bw + bw * 0.22}
                        y={170 - h}
                        width={bw * 0.56}
                        height={Math.max(h, day.minutes > 0 ? 2 : 0)}
                        fill={hit ? "#e10600" : "#ededf0"}
                        fillOpacity={hit ? 0.9 : 0.45}
                      />
                      <rect
                        x={i * bw + bw * 0.22}
                        y={168}
                        width={bw * 0.56}
                        height="2"
                        fill="#ededf0"
                        fillOpacity="0.12"
                      />
                      <text
                        x={i * bw + bw * 0.5}
                        y={190}
                        textAnchor="middle"
                        className="font-mono"
                        fontSize="10"
                        fill="#ededf0"
                        fillOpacity="0.35"
                      >
                        {day.label}
                      </text>
                      {day.minutes > 0 && (
                        <text
                          x={i * bw + bw * 0.5}
                          y={170 - h - 6}
                          textAnchor="middle"
                          className="font-mono"
                          fontSize="9"
                          fill="#ededf0"
                          fillOpacity="0.5"
                        >
                          {day.minutes}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </Panel>

            {/* ------------------------ cumulative ------------------------- */}
            <Panel title="Cumulative watch time — 30 days" meta={`${hrs(d.cumulative[29] ?? 0)} h`}>
              <svg viewBox="0 0 400 180" className="w-full" role="img" aria-label="Cumulative watch hours">
                <defs>
                  <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e10600" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#e10600" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((g) => (
                  <line
                    key={g}
                    x1="0"
                    y1={20 + g * 130}
                    x2="400"
                    y2={20 + g * 130}
                    stroke="#ededf0"
                    strokeOpacity="0.07"
                    strokeWidth="1"
                  />
                ))}
                {(() => {
                  const pts = d.cumulative.map((v, i) => [
                    (i / 29) * 400,
                    150 - (v / maxCum) * 130,
                  ]);
                  const line = pts
                    .map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`)
                    .join(" ");
                  const last = pts[pts.length - 1];
                  return (
                    <>
                      <path d={`${line} L 400 150 L 0 150 Z`} fill="url(#cumFill)" />
                      <path d={line} fill="none" stroke="#e10600" strokeWidth="1.8" />
                      <circle cx={last[0]} cy={last[1]} r="3.5" fill="#e10600" />
                      <circle
                        cx={last[0]}
                        cy={last[1]}
                        r="7"
                        fill="none"
                        stroke="#e10600"
                        strokeOpacity="0.45"
                      />
                    </>
                  );
                })()}
                <text x="0" y="172" className="font-mono" fontSize="9" fill="#ededf0" fillOpacity="0.3">
                  30d ago
                </text>
                <text x="400" y="172" textAnchor="end" className="font-mono" fontSize="9" fill="#ededf0" fillOpacity="0.3">
                  today
                </text>
              </svg>
            </Panel>

            {/* --------------------- hour-of-day profile -------------------- */}
            <Panel
              title="When you watch"
              meta={`Peak ${pad(d.peakHour)}:00`}
            >
              <svg viewBox="0 0 400 180" className="w-full" role="img" aria-label="Watch hours">
                {d.perHour.map((m, h) => {
                  const bw = 400 / 24;
                  const bh = (m / maxHour) * 125;
                  const peak = h === d.peakHour && m > 0;
                  return (
                    <g key={h}>
                      <rect
                        x={h * bw + bw * 0.18}
                        y={150 - bh}
                        width={bw * 0.64}
                        height={Math.max(bh, m > 0 ? 2 : 0)}
                        fill={peak ? "#e10600" : "#7ecef4"}
                        fillOpacity={peak ? 0.95 : 0.5}
                      />
                      {h % 6 === 0 && (
                        <text
                          x={h * bw + bw * 0.5}
                          y={168}
                          textAnchor="middle"
                          className="font-mono"
                          fontSize="9"
                          fill="#ededf0"
                          fillOpacity="0.35"
                        >
                          {pad(h)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <line x1="0" y1="150" x2="400" y2="150" stroke="#ededf0" strokeOpacity="0.12" />
              </svg>
            </Panel>

            {/* --------------------------- heatmap -------------------------- */}
            <Panel
              title="Consistency map — 18 weeks"
              meta={`${d.activeDays} active days`}
              className="lg:col-span-2"
            >
              <svg viewBox="0 0 700 120" className="w-full" role="img" aria-label="Activity heatmap">
                {d.heat.map((week, w) =>
                  week.map((cell, dow) => {
                    const size = 700 / 18 - 3.2;
                    const x = w * (700 / 18);
                    const y = dow * 15.5;
                    const lvl = cell.minutes / Math.max(dailyGoal, 1);
                    const op =
                      cell.minutes === 0 ? 0.05 : Math.min(0.95, 0.22 + lvl * 0.8);
                    return (
                      <rect
                        key={`${w}-${dow}`}
                        x={x}
                        y={y}
                        width={size}
                        height={12.5}
                        rx="1.5"
                        fill={cell.minutes >= dailyGoal ? "#e10600" : "#ededf0"}
                        fillOpacity={cell.future ? 0.02 : op}
                      >
                        <title>{`${cell.date.toDateString()} — ${cell.minutes} min`}</title>
                      </rect>
                    );
                  })
                )}
              </svg>
              <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[9px] tracking-[0.25em] text-bone/30 uppercase">
                Less
                {[0.08, 0.3, 0.55, 0.8].map((o) => (
                  <span
                    key={o}
                    className="inline-block h-2.5 w-2.5 rounded-[2px] bg-bone"
                    style={{ opacity: o }}
                  />
                ))}
                <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-blood" />
                More
              </div>
            </Panel>

            {/* ----------------------- profile split ------------------------ */}
            <Panel title="Split by channel" meta={`${d.split.length} active`}>
              {d.split.length === 0 ? (
                <p className="font-mono text-[9px] tracking-[0.3em] text-bone/25 uppercase">
                  No channel data
                </p>
              ) : (
                <ul className="space-y-4">
                  {d.split.map((s) => (
                    <li key={s.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-mono text-[10px] tracking-[0.25em] text-bone uppercase">
                          {s.name}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] tracking-[0.2em] text-bone/45">
                          {hrs(s.minutes)}H ·{" "}
                          {Math.round((s.minutes / d.total) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-bone/10">
                        <div
                          className="h-1.5 bg-blood transition-all duration-700"
                          style={{ width: `${(s.minutes / maxSplit) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* ----------------------- top playlists ------------------------ */}
            <Panel title="Most watched playlists" meta="Top 5">
              {d.topChapters.length === 0 ? (
                <p className="font-mono text-[9px] tracking-[0.3em] text-bone/25 uppercase">
                  No playlist watch data yet
                </p>
              ) : (
                <ul className="space-y-4">
                  {d.topChapters.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-4">
                      <span className="font-display text-2xl tabular-nums leading-none text-bone/25">
                        {pad(i + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[10px] tracking-[0.25em] text-bone uppercase">
                          {c.name}
                        </p>
                        <p className="mt-1 truncate font-mono text-[9px] tracking-[0.25em] text-bone/35 uppercase">
                          {c.profile}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-xl tabular-nums leading-none">
                        {hrs(c.minutes)}
                        <span className="ml-1 font-mono text-[9px] text-blood">H</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* -------------------------- momentum -------------------------- */}
            <Panel title="Momentum" meta="7d vs previous 7d" className="lg:col-span-2">
              <div className="grid gap-8 sm:grid-cols-3 sm:items-center">
                <div>
                  <p
                    className={`font-display text-5xl tabular-nums leading-none ${
                      d.delta >= 0 ? "text-bone" : "text-blood"
                    }`}
                  >
                    {d.delta >= 0 ? "+" : ""}
                    {Math.round(d.delta)}
                    <span className="ml-1 font-mono text-[10px] tracking-[0.25em] text-blood">
                      %
                    </span>
                  </p>
                  <p className="mt-3 font-mono text-[9px] tracking-[0.3em] text-smoke uppercase">
                    {d.delta >= 0 ? "Trending up" : "Trending down"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  {[
                    { l: "This week", v: d.last7 },
                    { l: "Last week", v: d.prev7 },
                  ].map((row) => (
                    <div key={row.l} className="mb-4 last:mb-0">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[9px] tracking-[0.3em] text-bone/50 uppercase">
                          {row.l}
                        </span>
                        <span className="font-mono text-[9px] tracking-[0.2em] text-bone/45">
                          {hrs(row.v)}H
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full bg-bone/10">
                        <div
                          className={`h-2 transition-all duration-700 ${
                            row.l === "This week" ? "bg-blood" : "bg-bone/40"
                          }`}
                          style={{
                            width: `${
                              (row.v / Math.max(d.last7, d.prev7, 1)) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* ------------------------- full archive ------------------------- */}
          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="font-mono text-[10px] tracking-[0.4em] text-blood uppercase">
                Full log — {allLogs.length} sessions
              </h3>
              {allLogs.length > 10 && (
                <button
                  onClick={() => setShowAll((s) => !s)}
                  className="rounded-full border border-bone/20 px-5 py-2 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-blood hover:text-bone"
                >
                  {showAll ? "Show recent" : `Show all ${allLogs.length}`}
                </button>
              )}
            </div>
            <ul className="mt-6 divide-y divide-bone/10 border-y border-bone/10">
              {logs.map((l) => (
                <li key={l.id} className="group flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] tracking-[0.25em] text-bone uppercase">
                      {profileName(l.profileId)}
                      {chapterName(l.chapterId) ? ` · ${chapterName(l.chapterId)}` : ""}
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
        </>
      )}
    </section>
  );
}
