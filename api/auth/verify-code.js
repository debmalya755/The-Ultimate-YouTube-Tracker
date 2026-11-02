import { createHash } from "node:crypto";

const MAX_ATTEMPTS = 5;

async function kv(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("KV is not configured");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "KV request failed");
  return json.result;
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }
    const body = readBody(req);
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const code = String(body.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (code.length !== 6) {
      res.status(400).json({ ok: false, error: "Enter the 6-character PIN." });
      return;
    }

    const digestStored = await kv(["GET", `verify:code:${email}`]);
    if (!digestStored) {
      res.status(400).json({
        ok: false,
        error: "That PIN expired — request a new one.",
      });
      return;
    }

    const attempts = Number((await kv(["INCR", `verify:att:${email}`])) || 1);
    if (attempts > MAX_ATTEMPTS) {
      await kv(["DEL", `verify:code:${email}`]);
      res.status(429).json({
        ok: false,
        error: "Too many attempts — request a new PIN.",
      });
      return;
    }

    const secret = process.env.APP_SECRET || "debos-mail";
    const digest = sha256(`${secret}:${email}:${code}`);
    if (digest !== digestStored) {
      const left = MAX_ATTEMPTS - attempts;
      res.status(400).json({
        ok: false,
        error: `Incorrect PIN — ${left} attempt${left === 1 ? "" : "s"} left.`,
      });
      return;
    }

    await kv(["DEL", `verify:code:${email}`]);
    await kv(["DEL", `verify:att:${email}`]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Could not verify that PIN.",
    });
  }
}
