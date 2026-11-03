import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import ChannelEditor from "./ChannelEditor";
import ChapterEditor from "./ChapterEditor";
import { ChapterCover } from "../data/chapterCovers";
import type { Chapter, ChapterDraft, YtChannel, YtChannelDraft } from "../hooks/useProfiles";
import { useLocalArray } from "../hooks/useLocalArray";

function isChannel(v: unknown): v is YtChannel {
  return !!v && typeof v === "object" && typeof (v as YtChannel).id === "string" && typeof (v as YtChannel).name === "string";
}
function isChapter(v: unknown): v is Chapter {
  return !!v && typeof v === "object" && typeof (v as Chapter).id === "string" && typeof (v as Chapter).name === "string";
}

const chGuard = isChannel;
const plGuard = isChapter;

export default function YoutubeTracker() {
  const channels = useLocalArray<YtChannel>("debos.desk.yt.channels.v1", chGuard);
  const lists = useLocalArray<Chapter>("debos.desk.yt.playlists.v1", plGuard);
  const [chOpen, setChOpen] = useState(false);
  const [editingCh, setEditingCh] = useState<YtChannel | null>(null);
  const [plOpen, setPlOpen] = useState(false);
  const [editingPl, setEditingPl] = useState<Chapter | null>(null);

  const saveChannel = useCallback(
    (draft: YtChannelDraft) => {
      if (editingCh) channels.update(editingCh.id, draft);
      else channels.add({ ...draft, profileId: "yt", createdAt: Date.now() });
      setChOpen(false);
      setEditingCh(null);
    },
    [channels, editingCh]
  );

  const saveList = useCallback(
    (draft: ChapterDraft) => {
      if (editingPl) lists.update(editingPl.id, draft);
      else
        lists.add({
          ...draft,
          profileId: "yt",
          createdAt: Date.now(),
        });
      setPlOpen(false);
      setEditingPl(null);
    },
    [lists, editingPl]
  );

  const nextCode = String(lists.rows.length + 1).padStart(2, "0");

  return (
    <div className="px-6 pb-24 md:px-12">
      <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
        Desk 01
      </p>
      <h1 className="mt-4 max-w-5xl font-display text-[clamp(2.2rem,7vw,5.5rem)] uppercase leading-[0.92]">
        The Ultimate YouTube Tracker
      </h1>
      <p className="mt-5 max-w-xl text-sm text-bone/50">
        Channels and playlists only. Paste a URL to pull name, photo, title, and
        thumbnail.
      </p>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl uppercase">Channels</h2>
          <button
            type="button"
            onClick={() => {
              setEditingCh(null);
              setChOpen(true);
            }}
            className="flex items-center gap-2 rounded-full border border-bone/20 px-4 py-2 font-mono text-[9px] tracking-[0.3em] uppercase hover:border-blood"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Add
          </button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.rows.length === 0 && (
            <p className="font-mono text-[10px] tracking-[0.3em] text-bone/30 uppercase">
              No channels yet
            </p>
          )}
          {channels.rows.map((c) => (
            <article
              key={c.id}
              className="flex items-center gap-4 border border-bone/12 bg-ash/30 p-4"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-bone/15 bg-carbon">
                {c.img ? (
                  <img src={c.img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-mono text-[9px] text-bone/25">
                    YT
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg uppercase leading-tight">
                  {c.name}
                </p>
                <p className="mt-1 truncate font-mono text-[9px] tracking-[0.2em] text-bone/40">
                  {c.tag || c.url || "—"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Edit"
                onClick={() => {
                  setEditingCh(c);
                  setChOpen(true);
                }}
                className="text-bone/40 hover:text-bone"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={() => channels.remove(c.id)}
                className="text-bone/40 hover:text-blood"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl uppercase">Playlists</h2>
          <button
            type="button"
            onClick={() => {
              setEditingPl(null);
              setPlOpen(true);
            }}
            className="flex items-center gap-2 rounded-full border border-bone/20 px-4 py-2 font-mono text-[9px] tracking-[0.3em] uppercase hover:border-blood"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Add
          </button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.rows.length === 0 && (
            <p className="font-mono text-[10px] tracking-[0.3em] text-bone/30 uppercase">
              No playlists yet
            </p>
          )}
          {lists.rows.map((p) => (
            <article key={p.id} className="border border-bone/12 bg-ash/30">
              <div className="aspect-[16/9] overflow-hidden bg-carbon">
                {p.img ? (
                  <img src={p.img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ChapterCover index={p.cover ?? 0} className="h-full w-full" />
                )}
              </div>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] tracking-[0.3em] text-bone/35 uppercase">
                    {p.code}
                  </p>
                  <h3 className="mt-1 truncate font-display text-xl uppercase">
                    {p.name}
                  </h3>
                  {p.tag && (
                    <p className="mt-1 truncate text-xs text-bone/40">{p.tag}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Edit"
                    onClick={() => {
                      setEditingPl(p);
                      setPlOpen(true);
                    }}
                    className="text-bone/40 hover:text-bone"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => lists.remove(p.id)}
                    className="text-bone/40 hover:text-blood"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {chOpen && (
          <ChannelEditor
            initial={editingCh}
            onCancel={() => {
              setChOpen(false);
              setEditingCh(null);
            }}
            onSave={saveChannel}
          />
        )}
        {plOpen && (
          <ChapterEditor
            profileName="YouTube"
            initial={editingPl}
            nextCode={nextCode}
            onCancel={() => {
              setPlOpen(false);
              setEditingPl(null);
            }}
            onSave={saveList}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
