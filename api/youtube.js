function json(res, status, body) {
  res.status(status).json(body);
}

function pickThumb(thumbs) {
  if (!thumbs || typeof thumbs !== "object") return "";
  return (
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    ""
  );
}

function parseQuery(raw) {
  const q = String(raw || "").trim();
  if (!q) return { kind: "empty" };

  const video =
    q.match(
      /(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/i
    ) || q.match(/^([\w-]{11})$/);
  if (video) return { kind: "video", id: video[1] };

  const channelId = q.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i);
  if (channelId) return { kind: "channelId", id: channelId[1] };

  const handle =
    q.match(/youtube\.com\/@([\w.-]+)/i) ||
    q.match(/^@([\w.-]+)$/) ||
    q.match(/^([\w.-]+)$/);
  if (handle && !q.includes(" ")) return { kind: "handle", id: handle[1] };

  return { kind: "search", q };
}

async function yt(path, key) {
  const url = `https://www.googleapis.com/youtube/v3/${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `YouTube API ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return data;
}

function channelPayload(item) {
  const sn = item.snippet || {};
  const handle = sn.customUrl || "";
  return {
    kind: "channel",
    channelId: item.id,
    name: sn.title || "",
    tag: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "",
    img: pickThumb(sn.thumbnails),
    url: handle
      ? `https://www.youtube.com/${handle.startsWith("@") ? handle : "@" + handle.replace(/^@/, "")}`
      : `https://www.youtube.com/channel/${item.id}`,
  };
}

export default async function handler(req, res) {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      json(res, 503, {
        ok: false,
        error:
          "Add YOUTUBE_API_KEY on Vercel (YouTube Data API v3). Do not put the key in the website source.",
      });
      return;
    }

    const q =
      (typeof req.query?.q === "string" && req.query.q) ||
      (req.method === "POST" && (req.body?.q || req.body?.url)) ||
      "";
    const parsed = parseQuery(q);
    if (parsed.kind === "empty") {
      json(res, 400, { ok: false, error: "Paste a YouTube URL, @handle, or video id." });
      return;
    }

    if (parsed.kind === "video") {
      const data = await yt(`videos?part=snippet&id=${parsed.id}`, key);
      const item = data.items?.[0];
      if (!item) {
        json(res, 404, { ok: false, error: "Video not found." });
        return;
      }
      const sn = item.snippet || {};
      let channel = null;
      if (sn.channelId) {
        const ch = await yt(`channels?part=snippet&id=${sn.channelId}`, key);
        if (ch.items?.[0]) channel = channelPayload(ch.items[0]);
      }
      json(res, 200, {
        ok: true,
        kind: "video",
        videoId: parsed.id,
        title: sn.title || "",
        img: pickThumb(sn.thumbnails),
        url: `https://www.youtube.com/watch?v=${parsed.id}`,
        channelTitle: sn.channelTitle || channel?.name || "",
        channel,
      });
      return;
    }

    if (parsed.kind === "channelId") {
      const data = await yt(`channels?part=snippet&id=${parsed.id}`, key);
      const item = data.items?.[0];
      if (!item) {
        json(res, 404, { ok: false, error: "Channel not found." });
        return;
      }
      json(res, 200, { ok: true, ...channelPayload(item) });
      return;
    }

    if (parsed.kind === "handle") {
      const data = await yt(
        `channels?part=snippet&forHandle=${encodeURIComponent(parsed.id)}`,
        key
      );
      const item = data.items?.[0];
      if (!item) {
        json(res, 404, { ok: false, error: "Handle not found." });
        return;
      }
      json(res, 200, { ok: true, ...channelPayload(item) });
      return;
    }

    json(res, 400, { ok: false, error: "Could not parse that YouTube link." });
  } catch (err) {
    json(res, err.status || 500, {
      ok: false,
      error: err instanceof Error ? err.message : "YouTube lookup failed.",
    });
  }
}
