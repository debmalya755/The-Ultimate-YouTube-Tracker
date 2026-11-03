export interface YtLookup {
  ok: boolean;
  error?: string;
  kind?: string;
  name?: string;
  tag?: string;
  img?: string;
  url?: string;
  title?: string;
  channelTitle?: string;
  channel?: {
    name?: string;
    tag?: string;
    img?: string;
    url?: string;
  };
}

export async function lookupYoutube(raw: string): Promise<YtLookup> {
  const q = raw.trim();
  if (!q) return { ok: false, error: "Paste a YouTube URL first." };
  const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`);
  const data = (await res.json().catch(() => ({}))) as YtLookup;
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || `Lookup failed (${res.status})`,
    };
  }
  return data;
}
