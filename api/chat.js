const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const YT =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/gi;

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function extractVideoUrls(text) {
  const urls = [];
  const seen = new Set();
  let m;
  const re = new RegExp(YT.source, "gi");
  while ((m = re.exec(text))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    urls.push(`https://www.youtube.com/watch?v=${id}`);
  }
  return urls;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      res.status(503).json({
        ok: false,
        error:
          "Add a free Gemini API key (Google AI Studio) as GEMINI_API_KEY on Vercel.",
      });
      return;
    }

    const body = readBody(req);
    const history = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    const context = String(body.context || "").slice(0, 4000);
    const last = history.filter((m) => m && m.role === "user").pop();
    const lastText = String(last?.text || "").slice(0, 8000);
    if (!lastText) {
      res.status(400).json({ ok: false, error: "Say something first." });
      return;
    }

    const videos = extractVideoUrls(lastText);
    const contents = [];
    for (const m of history) {
      const role = m.role === "model" ? "model" : "user";
      const text = String(m.text || "").slice(0, 8000);
      if (!text) continue;
      contents.push({ role, parts: [{ text }] });
    }
    if (videos.length && contents.length) {
      const lastContent = contents[contents.length - 1];
      for (const uri of videos.slice(0, 3)) {
        lastContent.parts.push({ file_data: { file_uri: uri } });
      }
    }

    const payload = {
      system_instruction: {
        parts: [
          {
            text: `You are the in-app assistant on The Ultimate YouTube Tracker.
You talk like a sharp editor: short, useful, no fluff.
You can summarise YouTube videos when a URL is attached.
You help with profiles, playlists, channels, streaks, and watch logging.
Use this local snapshot (may be incomplete):\n${context || "(empty)"}
If asked who you are: an assistant on this tracker using Gemini, not a local Gemma copy.`,
          },
        ],
      },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
    };

    let text = "";
    let lastErr = "Gemini did not respond.";
    for (const model of MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        lastErr =
          json?.error?.message || `Gemini ${model} failed (${r.status})`;
        continue;
      }
      text = json?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n")
        .trim();
      if (text) break;
      lastErr = "Empty reply from Gemini.";
    }

    if (!text) {
      res.status(502).json({ ok: false, error: lastErr });
      return;
    }
    res.status(200).json({ ok: true, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Chat failed.",
    });
  }
}
