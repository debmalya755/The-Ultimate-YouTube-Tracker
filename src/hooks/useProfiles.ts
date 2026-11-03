import { useCallback, useEffect, useMemo, useState } from "react";
import { hashPassword, randomSalt } from "../utils/password";

/** A category and its code are chosen together once, then locked as a pair. */
export interface Category {
  id: string;
  name: string;
  code: string;
  createdAt: number;
}

export interface Profile {
  id: string;
  name: string;
  /** points at a Category — the code is derived from it, never typed here */
  categoryId?: string;
  /** legacy free-text fields, kept so pre-category data still renders */
  code?: string;
  tag?: string;
  focus?: string;
  /** uploaded / linked artwork — takes priority over `cover` */
  img?: string;
  /** index into the 500 generated round emblems */
  cover?: number;
  /** per-profile lock; absent on legacy profiles until the user sets one */
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: number;
}

export type ProfileDraft = Omit<Profile, "id" | "createdAt">;

export interface Chapter {
  id: string;
  profileId: string;
  name: string;
  code: string;
  tag: string;
  /** uploaded / linked artwork — takes priority over `cover` */
  img?: string;
  /** index into the 400 generated landscape chapter covers */
  cover?: number;
  targetHours: number;
  createdAt: number;
}

export type ChapterDraft = Omit<Chapter, "id" | "profileId" | "createdAt">;

/** A YouTube channel stored inside a profile. */
export interface YtChannel {
  id: string;
  profileId: string;
  name: string;
  tag?: string;
  url?: string;
  img?: string;
  createdAt: number;
}

export type YtChannelDraft = Omit<YtChannel, "id" | "profileId" | "createdAt">;

export interface Session {
  id: string;
  profileId: string;
  chapterId?: string;
  minutes: number;
  at: number;
}

/* storage is namespaced per account so users never see each other's data */
const keysFor = (uid: string) => ({
  gKey: `debos.categories.v1:${uid}`,
  sKey: `debos.profiles.v1:${uid}`,
  chKey: `debos.ytchannels.v1:${uid}`,
  cKey: `debos.chapters.v1:${uid}`,
  lKey: `debos.sessions.v1:${uid}`,
});

const newId = (p: string) =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * One-time upgrade from the pre-rename schema: subjects → profiles, and the
 * `subjectId` foreign key on chapters/sessions → `profileId`. Without this,
 * everything a user had already logged would silently disappear.
 */
function migrate(uid: string) {
  try {
    const legacyKey = `debos.subjects.v1:${uid}`;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy === null) return;
    if (localStorage.getItem(`debos.profiles.v1:${uid}`) === null) {
      localStorage.setItem(`debos.profiles.v1:${uid}`, legacy);
    }
    for (const k of [`debos.chapters.v1:${uid}`, `debos.sessions.v1:${uid}`]) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const rows: unknown = JSON.parse(raw);
      if (!Array.isArray(rows)) continue;
      localStorage.setItem(
        k,
        JSON.stringify(
          rows.map((row) => {
            if (typeof row !== "object" || row === null) return row;
            const o = row as Record<string, unknown>;
            if ("subjectId" in o && !("profileId" in o)) {
              const { subjectId, ...rest } = o;
              return { ...rest, profileId: subjectId };
            }
            return o;
          })
        )
      );
    }
    localStorage.removeItem(legacyKey);
  } catch {
    /* a failed migration must never block boot */
  }
}

function read<T>(key: string, guard: (v: unknown) => v is T): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

const isProfile = (v: unknown): v is Profile =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Profile).id === "string" &&
  typeof (v as Profile).name === "string";

const isSession = (v: unknown): v is Session =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Session).id === "string" &&
  typeof (v as Session).minutes === "number";

const isCategory = (v: unknown): v is Category =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Category).id === "string" &&
  typeof (v as Category).name === "string" &&
  typeof (v as Category).code === "string";

const isChapter = (v: unknown): v is Chapter =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Chapter).id === "string" &&
  typeof (v as Chapter).profileId === "string" &&
  typeof (v as Chapter).name === "string";

const isYtChannel = (v: unknown): v is YtChannel =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as YtChannel).id === "string" &&
  typeof (v as YtChannel).profileId === "string" &&
  typeof (v as YtChannel).name === "string";

/** local YYYY-MM-DD */
export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

/** Shrinks an uploaded image so it comfortably fits the storage quota. */
export function fileToImageData(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function useProfiles(uid: string = "anon") {
  const { gKey, sKey, chKey, cKey, lKey } = keysFor(uid);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ytChannels, setYtChannels] = useState<YtChannel[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* `hydrated` tracks WHICH account the in-memory state belongs to. The save
     effects refuse to run until it matches `uid`, so switching accounts can
     never flush the previous user's data into the new user's storage keys. */
  const [hydrated, setHydrated] = useState<string | null>(null);

  useEffect(() => {
    migrate(uid);
    setCategories(read(gKey, isCategory));
    setProfiles(read(sKey, isProfile));
    setYtChannels(read(chKey, isYtChannel));
    setChapters(read(cKey, isChapter));
    setSessions(read(lKey, isSession));
    setHydrated(uid);
  }, [uid, gKey, sKey, chKey, cKey, lKey]);

  const DEMO_ID = "s_demo_test";
  const DEMO_FLAG = `debos.demo.v1:${uid}`;

  useEffect(() => {
    if (hydrated !== uid) return;
    try {
      if (localStorage.getItem(DEMO_FLAG) === "1") return;
    } catch {
      /* ignore */
    }
    let cancelled = false;
    (async () => {
      const salt = randomSalt();
      const passwordHash = await hashPassword("241207", salt);
      if (cancelled) return;
      setProfiles((cur) => {
        if (cur.some((p) => p.id === DEMO_ID)) return cur;
        return [
          ...cur,
          {
            id: DEMO_ID,
            name: "Demo · Test",
            tag: "QA",
            code: "DEMO",
            focus: "Try unlock, playlists, and Ask summaries",
            cover: 41,
            passwordHash,
            passwordSalt: salt,
            createdAt: Date.now(),
          },
        ];
      });
      try {
        localStorage.setItem(DEMO_FLAG, "1");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, uid, DEMO_FLAG]);

  /* Persistence lives in effects, not inside state updaters: updaters must be
     pure (StrictMode invokes them twice) and calling setError from one warns
     about updating state during render. */
  const save = useCallback((key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError(null);
    } catch {
      setError("Storage full — try a smaller image or remove a profile.");
    }
  }, []);

  useEffect(() => {
    if (hydrated !== uid) return;
    save(gKey, categories);
  }, [categories, hydrated, uid, gKey, save]);

  useEffect(() => {
    if (hydrated !== uid) return;
    save(sKey, profiles);
  }, [profiles, hydrated, uid, sKey, save]);

  useEffect(() => {
    if (hydrated !== uid) return;
    save(chKey, ytChannels);
  }, [ytChannels, hydrated, uid, chKey, save]);

  useEffect(() => {
    if (hydrated !== uid) return;
    save(cKey, chapters);
  }, [chapters, hydrated, uid, cKey, save]);

  useEffect(() => {
    if (hydrated !== uid) return;
    save(lKey, sessions);
  }, [sessions, hydrated, uid, lKey, save]);

  const addProfile = useCallback(
    (draft: ProfileDraft) => {
      const row = { ...draft, id: newId("s"), createdAt: Date.now() };
      setProfiles((cur) => [...cur, row]);
      return row.id;
    },
    []
  );

  const updateProfile = useCallback(
    (id: string, draft: ProfileDraft) => {
      setProfiles((cur) => {
        const next = cur.map((s) => (s.id === id ? { ...s, ...draft } : s));
        return next;
      });
    },
    []
  );

  const removeProfile = useCallback(
    (id: string) => {
      setProfiles((cur) => {
        const next = cur.filter((s) => s.id !== id);
        return next;
      });
      setYtChannels((cur) => cur.filter((c) => c.profileId !== id));
      setChapters((cur) => {
        const next = cur.filter((c) => c.profileId !== id);
        return next;
      });
      setSessions((cur) => {
        const next = cur.filter((l) => l.profileId !== id);
        return next;
      });
    },
    []
  );

  /* ------------------------------ categories -----------------------------
   * A category/code pair is immutable after creation — there is deliberately
   * no update function. Codes may only be assigned when the pair is first
   * made, and a category can only be removed while nothing references it.
   */

  const addCategory = useCallback(
    (name: string, code: string): { ok: boolean; error?: string } => {
      const n = name.trim();
      const c = code.trim().toUpperCase();
      if (!n) return { ok: false, error: "Category needs a name." };
      if (!c) return { ok: false, error: "Assign a code." };
      if (!/^[A-Z0-9-]{1,6}$/.test(c))
        return { ok: false, error: "Code: up to 6 chars, A–Z 0–9 or dash." };
      let clash = "";
      setCategories((cur) => {
        if (cur.some((g) => g.name.toLowerCase() === n.toLowerCase())) {
          clash = "That category already exists.";
          return cur;
        }
        if (cur.some((g) => g.code === c)) {
          clash = `Code ${c} is already assigned.`;
          return cur;
        }
        return [...cur, { id: newId("g"), name: n, code: c, createdAt: Date.now() }];
      });
      return clash ? { ok: false, error: clash } : { ok: true };
    },
    []
  );

  const removeCategory = useCallback((id: string) => {
    setCategories((cur) => cur.filter((g) => g.id !== id));
    setProfiles((cur) =>
      cur.map((p) => (p.categoryId === id ? { ...p, categoryId: undefined } : p))
    );
  }, []);

  const addYtChannel = useCallback((profileId: string, draft: YtChannelDraft) => {
    const row = { ...draft, id: newId("yt"), profileId, createdAt: Date.now() };
    setYtChannels((cur) => [...cur, row]);
  }, []);

  const updateYtChannel = useCallback((id: string, draft: YtChannelDraft) => {
    setYtChannels((cur) =>
      cur.map((c) => (c.id === id ? { ...c, ...draft } : c))
    );
  }, []);

  const removeYtChannel = useCallback((id: string) => {
    setYtChannels((cur) => cur.filter((c) => c.id !== id));
  }, []);

  /* ------------------------------- chapters ------------------------------ */

  const addChapter = useCallback(
    (profileId: string, draft: ChapterDraft) => {
      const row = { ...draft, id: newId("c"), profileId, createdAt: Date.now() };
      setChapters((cur) => [...cur, row]);
    },
    []
  );

  const updateChapter = useCallback(
    (id: string, draft: ChapterDraft) => {
      setChapters((cur) => {
        const next = cur.map((c) => (c.id === id ? { ...c, ...draft } : c));
        return next;
      });
    },
    []
  );

  const removeChapter = useCallback(
    (id: string) => {
      setChapters((cur) => {
        const next = cur.filter((c) => c.id !== id);
        return next;
      });
      // keep watched minutes on the channel — just unbind the playlist
      setSessions((cur) => {
        const next = cur.map((l) =>
          l.chapterId === id ? { ...l, chapterId: undefined } : l
        );
        return next;
      });
    },
    []
  );

  const logSession = useCallback(
    (profileId: string, minutes: number, chapterId?: string) => {
      if (!profileId || !Number.isFinite(minutes) || minutes <= 0) return;
      const row = {
        id: newId("l"),
        profileId,
        chapterId,
        minutes: Math.round(minutes),
        at: Date.now(),
      };
      setSessions((cur) => [...cur, row]);
    },
    []
  );

  const removeSession = useCallback(
    (id: string) => {
      setSessions((cur) => {
        const next = cur.filter((l) => l.id !== id);
        return next;
      });
    },
    []
  );

  const stats = useMemo(() => {
    const byProfile: Record<string, number> = {};
    const byChapter: Record<string, number> = {};
    const minutesByDay: Record<string, number> = {};
    const byDay = new Set<string>();
    let total = 0;
    const today = dayKey(Date.now());
    let todayMinutes = 0;

    for (const l of sessions) {
      byProfile[l.profileId] = (byProfile[l.profileId] ?? 0) + l.minutes;
      if (l.chapterId) {
        byChapter[l.chapterId] = (byChapter[l.chapterId] ?? 0) + l.minutes;
      }
      total += l.minutes;
      const k = dayKey(l.at);
      byDay.add(k);
      minutesByDay[k] = (minutesByDay[k] ?? 0) + l.minutes;
      if (k === today) todayMinutes += l.minutes;
    }

    // consecutive days ending today (or yesterday, so a fresh day doesn't break it)
    let streak = 0;
    const probe = new Date();
    if (!byDay.has(today)) probe.setDate(probe.getDate() - 1);
    for (;;) {
      if (!byDay.has(dayKey(probe.getTime()))) break;
      streak += 1;
      probe.setDate(probe.getDate() - 1);
    }

    /* longest run ever: walk the sorted distinct days and measure every chain
       of consecutive calendar dates */
    let bestStreak = 0;
    if (byDay.size > 0) {
      const days = [...byDay].sort();
      let run = 1;
      bestStreak = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(`${days[i - 1]}T00:00:00`);
        prev.setDate(prev.getDate() + 1);
        run = dayKey(prev.getTime()) === days[i] ? run + 1 : 1;
        if (run > bestStreak) bestStreak = run;
      }
    }

    /* last 7 calendar days, oldest → newest, for the streak strip */
    const recentDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - i));
      const k = dayKey(date.getTime());
      return { key: k, date, minutes: minutesByDay[k] ?? 0 };
    });

    return {
      byProfile,
      byChapter,
      minutesByDay,
      total,
      todayMinutes,
      streak,
      bestStreak,
      recentDays,
      loggedToday: byDay.has(today),
    };
  }, [sessions, profiles]);

  return {
    /** false until the stored data for this account has been read */
    hydrated: hydrated === uid,
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
    error,
  };
}
