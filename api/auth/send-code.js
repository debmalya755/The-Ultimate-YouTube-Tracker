import { createHash, randomInt } from "node:crypto";

const CODE_TTL_SEC = 10 * 60;
const MAX_SENDS_PER_HOUR = 8;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

function randomPin() {
  const pick = () =>
    Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
      ""
    );
  for (let i = 0; i < 16; i++) {
    const pin = pick();
    if (/[A-Z]/.test(pin) && /[0-9]/.test(pin)) return pin;
  }
  return `A${pick().slice(1, 5)}2`;
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
    const name = String(body.name || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ ok: false, error: "Enter a valid email." });
      return;
    }

    const hourKey = `verify:rl:${email}`;
    const sent = Number((await kv(["INCR", hourKey])) || 0);
    if (sent === 1) await kv(["EXPIRE", hourKey, 3600]);
    if (sent > MAX_SENDS_PER_HOUR) {
      res.status(429).json({
        ok: false,
        error: "Too many codes sent. Try again in an hour.",
      });
      return;
    }

    const code = randomPin();
    const secret = process.env.APP_SECRET || "debos-mail";
    const digest = sha256(`${secret}:${email}:${code}`);
    await kv(["SET", `verify:code:${email}`, digest, "EX", CODE_TTL_SEC]);
    await kv(["SET", `verify:att:${email}`, "0", "EX", CODE_TTL_SEC]);

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      res
        .status(503)
        .json({ ok: false, error: "Email delivery is not configured yet." });
      return;
    }

    const from =
      process.env.EMAIL_FROM ||
      "The Ultimate YouTube Tracker <beth.t@example.com>";
    const greeting = name.trim() ? name.trim().split(/\s+/)[0] : "there";

    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${code} — your YouTube Tracker PIN`,
        html: `<div style="font-family:Georgia,serif;background:#050506;color:#ededf0;padding:32px"><p style="letter-spacing:.3em;text-transform:uppercase;color:#c41e3a;font-size:12px">The Ultimate YouTube Tracker</p><h1 style="font-weight:normal">Hi ${greeting},</h1><p>Your 6-character PIN (letters + numbers) expires in 10 minutes.</p><p style="font-size:36px;letter-spacing:.28em;font-family:monospace">${code}</p></div>`,
        text: `Hi ${greeting},\n\nYour PIN is ${code}. It expires in 10 minutes.\n`,
      }),
    });

    if (!mail.ok) {
      const err = await mail.text();
      console.error("resend failed", mail.status, err.slice(0, 400));
      res.status(502).json({
        ok: false,
        error:
          mail.status === 403
            ? "Resend can only mail the email on your Resend account until you verify a domain."
            : "Could not send the email. Try again.",
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Mail service failed.",
    });
  }
}
