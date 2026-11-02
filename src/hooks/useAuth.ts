import { useCallback, useEffect, useState } from "react";

/**
 * Accounts still live in this browser. A 6-character PIN (A–Z + 2–9) is
 * emailed via Resend and checked on the server — never shown in the UI.
 */

export interface Account {
  id: string;
  /** lowercase, unique */
  username: string;
  /** as the user typed it */
  displayUsername: string;
  /** lowercase, unique */
  email: string;
  fullName: string;
  /** cropped avatar as a data URL */
  avatar?: string;
  passwordHash: string;
  salt: string;
  verified: boolean;
  createdAt: number;
}

export interface SignUpDraft {
  fullName: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

const A_KEY = "debos.accounts.v1";
const S_KEY = "debos.session.v1";
const P_KEY = "debos.pending.v1";
const D_KEY = "debos.device.v1";

export interface RememberedDevice {
  accountId: string;
  username: string;
  displayUsername: string;
  avatar?: string;
}

const CODE_TTL = 10 * 60 * 1000;

interface Pending {
  accountId: string;
  expires: number;
}

/* ------------------------------- utilities ------------------------------ */

const newId = () =>
  `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function randomSalt() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function postJson<T extends { ok: boolean; error?: string }>(
  url: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    data = { ok: false, error: text.slice(0, 180) || `Request failed (${res.status})` } as T;
  }
  if (!res.ok) {
    return {
      ok: false,
      error: data.error || `Request failed (${res.status})`,
    } as T;
  }
  return data;
}

/** SHA-256 where available, with a non-crypto fallback for insecure contexts */
async function hash(password: string, salt: string): Promise<string> {
  const input = `debos:${salt}:${password}`;
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input)
    );
    return Array.from(new Uint8Array(buf), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
  }
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `fnv${(h1 >>> 0).toString(16)}`;
}

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(A_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Account =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as Account).id === "string" &&
        typeof (a as Account).username === "string"
    );
  } catch {
    return [];
  }
}

function readDevice(): RememberedDevice | null {
  try {
    const raw = localStorage.getItem(D_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as RememberedDevice;
    return typeof d?.accountId === "string" ? d : null;
  } catch {
    return null;
  }
}

function writeDevice(d: RememberedDevice | null) {
  try {
    if (d) localStorage.setItem(D_KEY, JSON.stringify(d));
    else localStorage.removeItem(D_KEY);
  } catch {
    /* ignore */
  }
}

function snapshotDevice(account: Account): RememberedDevice {
  return {
    accountId: account.id,
    username: account.username,
    displayUsername: account.displayUsername,
    avatar: account.avatar,
  };
}

function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem(P_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    return typeof p?.accountId === "string" ? p : null;
  } catch {
    return null;
  }
}

/* --------------------------------- hook --------------------------------- */

export function useAuth() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [user, setUser] = useState<Account | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [device, setDevice] = useState<RememberedDevice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = readAccounts();
    setAccounts(list);
    setPending(readPending());
    const remembered = readDevice();
    if (remembered && list.some((a) => a.id === remembered.accountId)) {
      setDevice(remembered);
    } else if (remembered) {
      writeDevice(null);
    }
    try {
      const sid = localStorage.getItem(S_KEY);
      const found = sid ? list.find((a) => a.id === sid) : undefined;
      if (found?.verified) setUser(found);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((list: Account[]) => {
    setAccounts(list);
    try {
      localStorage.setItem(A_KEY, JSON.stringify(list));
    } catch {
      /* quota */
    }
  }, []);

  const savePending = useCallback((p: Pending | null) => {
    setPending(p);
    try {
      if (p) localStorage.setItem(P_KEY, JSON.stringify(p));
      else localStorage.removeItem(P_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isUsernameFree = useCallback(
    (name: string, exceptId?: string) =>
      !accounts.some(
        (a) => a.username === name.trim().toLowerCase() && a.id !== exceptId
      ),
    [accounts]
  );

  const isEmailFree = useCallback(
    (mail: string, exceptId?: string) =>
      !accounts.some(
        (a) => a.email === mail.trim().toLowerCase() && a.id !== exceptId
      ),
    [accounts]
  );

  /** creates an unverified account and emails a verification link */
  const signUp = useCallback(
    async (draft: SignUpDraft): Promise<{ ok: boolean; error?: string }> => {
      const username = draft.username.trim().toLowerCase();
      const email = draft.email.trim().toLowerCase();

      if (!draft.fullName.trim()) return { ok: false, error: "Full name is required." };
      if (!USERNAME_RE.test(username))
        return {
          ok: false,
          error: "Username must be 3–20 chars: a–z, 0–9, underscore.",
        };
      if (!isUsernameFree(username))
        return { ok: false, error: "That username is already taken." };
      if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email." };
      if (!isEmailFree(email))
        return { ok: false, error: "An account already uses that email." };
      if (draft.password.length < 8)
        return { ok: false, error: "Password must be at least 8 characters." };

      const salt = randomSalt();
      const account: Account = {
        id: newId(),
        username,
        displayUsername: draft.username.trim(),
        email,
        fullName: draft.fullName.trim(),
        avatar: draft.avatar,
        passwordHash: await hash(draft.password, salt),
        salt,
        verified: false,
        createdAt: Date.now(),
      };

      persist([...accounts, account]);
      const mailed = await postJson("/api/auth/send-code", {
        email,
        name: account.fullName,
      });
      if (!mailed.ok) {
        persist(accounts);
        return {
          ok: false,
          error: mailed.error ?? "Could not send the verification email.",
        };
      }
      savePending({
        accountId: account.id,
        expires: Date.now() + CODE_TTL,
      });
      return { ok: true };
    },
    [accounts, isUsernameFree, isEmailFree, persist, savePending]
  );

  const rememberAccount = useCallback((account: Account) => {
    const snap = snapshotDevice(account);
    writeDevice(snap);
    setDevice(snap);
  }, []);

  const forgetDevice = useCallback(() => {
    writeDevice(null);
    setDevice(null);
  }, []);

  const verifyCode = useCallback(
    async (
      entered: string,
      remember = false
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!pending) return { ok: false, error: "Nothing awaiting verification." };
      const account = accounts.find((a) => a.id === pending.accountId);
      if (!account) return { ok: false, error: "That sign-up is no longer here." };

      const checked = await postJson("/api/auth/verify-code", {
        email: account.email,
        code: entered,
      });
      if (!checked.ok) {
        return { ok: false, error: checked.error ?? "Verification failed." };
      }

      const list = accounts.map((a) =>
        a.id === pending.accountId ? { ...a, verified: true } : a
      );
      persist(list);
      savePending(null);
      const verified = list.find((a) => a.id === pending.accountId) ?? null;
      if (verified) {
        setUser(verified);
        try {
          localStorage.setItem(S_KEY, verified.id);
        } catch {
          /* ignore */
        }
        if (remember) rememberAccount(verified);
      }
      return { ok: true };
    },
    [pending, accounts, persist, savePending, rememberAccount]
  );

  const resendCode = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (!pending) return { ok: false, error: "Nothing awaiting verification." };
    const account = accounts.find((a) => a.id === pending.accountId);
    if (!account) return { ok: false, error: "That sign-up is no longer here." };
    const mailed = await postJson("/api/auth/send-code", {
      email: account.email,
      name: account.fullName,
    });
    if (!mailed.ok) return mailed;
    savePending({ ...pending, expires: Date.now() + CODE_TTL });
    return { ok: true };
  }, [pending, accounts, savePending]);

  const cancelPending = useCallback(() => {
    if (!pending) return;
    // discard the half-made account too
    persist(accounts.filter((a) => a.id !== pending.accountId));
    savePending(null);
  }, [pending, accounts, persist, savePending]);

  const signIn = useCallback(
    async (
      identifier: string,
      password: string,
      remember = false
    ): Promise<{ ok: boolean; error?: string; needsVerify?: boolean }> => {
      const key = identifier.trim().toLowerCase();
      const account = accounts.find(
        (a) => a.username === key || a.email === key
      );
      if (!account) return { ok: false, error: "No account matches that login." };

      const attempt = await hash(password, account.salt);
      if (attempt !== account.passwordHash)
        return { ok: false, error: "Incorrect password." };

      if (!account.verified) {
        const mailed = await postJson("/api/auth/send-code", {
          email: account.email,
          name: account.fullName,
        });
        if (!mailed.ok) {
          return {
            ok: false,
            error: mailed.error ?? "Could not send a verification email.",
          };
        }
        savePending({
          accountId: account.id,
          expires: Date.now() + CODE_TTL,
        });
        return { ok: false, needsVerify: true, error: "Email not verified yet." };
      }

      setUser(account);
      try {
        localStorage.setItem(S_KEY, account.id);
      } catch {
        /* ignore */
      }
      if (remember) rememberAccount(account);
      else forgetDevice();
      return { ok: true };
    },
    [accounts, savePending, rememberAccount, forgetDevice]
  );

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(S_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<Account, "fullName" | "avatar">>) => {
      if (!user) return;
      const list = accounts.map((a) =>
        a.id === user.id ? { ...a, ...patch } : a
      );
      persist(list);
      setUser(list.find((a) => a.id === user.id) ?? null);
    },
    [user, accounts, persist]
  );

  return {
    ready,
    user,
    pendingEmail: pending
      ? accounts.find((a) => a.id === pending.accountId)?.email ?? null
      : null,
    pendingExpires: pending?.expires ?? null,
    hasPending: Boolean(pending),
    accountCount: accounts.length,
    signUp,
    verifyCode,
    resendCode,
    cancelPending,
    signIn,
    signOut,
    updateProfile,
    isUsernameFree,
    isEmailFree,
    remembered: device,
    rememberAccount,
    forgetDevice,
  };
}
