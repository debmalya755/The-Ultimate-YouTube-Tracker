const CODE_TTL_SEC = 10 * 60;
const MAX_SENDS_PER_HOUR = 8;
const MAX_ATTEMPTS = 5;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

async function kv(command: unknown[]) {
  const url = required("KV_REST_API_URL");
  const token = required("KV_REST_API_TOKEN");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok) throw new Error(json.error || "KV request failed");
  return json.result;
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function randomPin() {
  const pick = () => {
    const b = new Uint32Array(6);
    crypto.getRandomValues(b);
    return Array.from(b, (n) => ALPHABET[n % ALPHABET.length]).join("");
  };
  for (let i = 0; i < 12; i++) {
    const pin = pick();
    const hasLetter = /[A-Z]/.test(pin);
    const hasDigit = /[0-9]/.test(pin);
    if (hasLetter && hasDigit) return pin;
  }
  return `A${pick().slice(1, 5)}2`;
}

export async function issueCode(emailRaw: string, name: string) {
  const email = normalizeEmail(emailRaw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false as const, status: 400, error: "Enter a valid email." };
  }

  const hourKey = `verify:rl:${email}`;
  const sent = Number((await kv(["INCR", hourKey])) ?? 0);
  if (sent === 1) await kv(["EXPIRE", hourKey, 3600]);
  if (sent > MAX_SENDS_PER_HOUR) {
    return {
      ok: false as const,
      status: 429,
      error: "Too many codes sent. Try again in an hour.",
    };
  }

  const code = randomPin();
  const secret = process.env.APP_SECRET || "debos-mail";
  const digest = await sha256(`${secret}:${email}:${code}`);
  await kv(["SET", `verify:code:${email}`, digest, "EX", CODE_TTL_SEC]);
  await kv(["SET", `verify:att:${email}`, "0", "EX", CODE_TTL_SEC]);

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false as const,
      status: 503,
      error: "Email delivery is not configured yet.",
    };
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
      html: `
        <div style="font-family:Georgia,serif;background:#050506;color:#ededf0;padding:32px">
          <p style="letter-spacing:0.3em;text-transform:uppercase;color:#c41e3a;font-size:12px">The Ultimate YouTube Tracker</p>
          <h1 style="font-weight:normal;font-size:28px">Hi ${greeting},</h1>
          <p style="color:#9aa0a6;line-height:1.6">Enter this 6-character PIN to verify your email. It mixes letters and numbers, expires in 10 minutes, and is not shown on the website.</p>
          <p style="font-size:36px;letter-spacing:0.28em;margin:28px 0;font-family:ui-monospace,monospace">${code}</p>
          <p style="color:#6b7075;font-size:13px">If you did not create an account, ignore this message.</p>
        </div>
      `,
      text: `Hi ${greeting},\n\nYour The Ultimate YouTube Tracker PIN is ${code}.\nIt expires in 10 minutes.\n`,
    }),
  });

  if (!mail.ok) {
    const err = await mail.text();
    console.error("resend failed", mail.status, err.slice(0, 400));
    return {
      ok: false as const,
      status: 502,
      error:
        mail.status === 403
          ? "Resend rejected the recipient. Verify your domain or send to the email on your Resend account."
          : "Could not send the email. Try again.",
    };
  }

  return { ok: true as const };
}

export async function checkCode(emailRaw: string, codeRaw: string) {
  const email = normalizeEmail(emailRaw);
  const code = codeRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6) {
    return { ok: false as const, status: 400, error: "Enter the 6-character PIN." };
  }

  const digestStored = (await kv(["GET", `verify:code:${email}`])) as
    | string
    | null;
  if (!digestStored) {
    return {
      ok: false as const,
      status: 400,
      error: "That PIN expired — request a new one.",
    };
  }

  const attempts = Number((await kv(["INCR", `verify:att:${email}`])) ?? 1);
  if (attempts > MAX_ATTEMPTS) {
    await kv(["DEL", `verify:code:${email}`]);
    return {
      ok: false as const,
      status: 429,
      error: "Too many attempts — request a new PIN.",
    };
  }

  const secret = process.env.APP_SECRET || "debos-mail";
  const digest = await sha256(`${secret}:${email}:${code}`);
  if (digest !== digestStored) {
    const left = MAX_ATTEMPTS - attempts;
    return {
      ok: false as const,
      status: 400,
      error: `Incorrect PIN — ${left} attempt${left === 1 ? "" : "s"} left.`,
    };
  }

  await kv(["DEL", `verify:code:${email}`]);
  await kv(["DEL", `verify:att:${email}`]);
  return { ok: true as const };
}
