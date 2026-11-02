import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ImageUp, Mail, ShieldCheck, User } from "lucide-react";
import Grain from "./Grain";
import ImageCropper from "./ImageCropper";
import { EMAIL_RE, USERNAME_RE, useAuth } from "../hooks/useAuth";

const EASE = [0.16, 1, 0.3, 1] as const;

const label = "block font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase";
const field =
  "mt-2 w-full border-b border-bone/20 bg-transparent pb-2.5 font-mono text-sm text-bone caret-blood outline-none transition-colors duration-300 placeholder:text-bone/20 focus:border-bone/70";

type Props = ReturnType<typeof useAuth> & { onDone: () => void };

/* ---- defined at module scope: re-creating these per render would remount
   the whole form subtree and drop input focus on every keystroke ---- */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-carbon px-5 py-16 text-bone">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 35%, rgba(30,43,51,0.55) 0%, rgba(5,5,6,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(237,237,240,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(237,237,240,0.045) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 5%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 5%, transparent 75%)",
        }}
      />
      <Grain opacity={0.05} />
      <div className="relative z-10 w-full max-w-xl">{children}</div>
    </div>
  );
}

function Head({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="flex items-center gap-3 font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" />
        {kicker}
      </p>
      <h1 className="mt-5 font-display text-[clamp(2.2rem,8vw,4rem)] uppercase leading-[0.95]">
        {title}
      </h1>
    </>
  );
}

export default function AuthFlow(auth: Props) {
  const {
    user,
    hasPending,
    pendingEmail,
    pendingCode,
    signUp,
    verifyCode,
    resendCode,
    cancelPending,
    signIn,
    isUsernameFree,
    isEmailFree,
    remembered,
    forgetDevice,
    onDone,
  } = auth;

  const [mode, setMode] = useState<"signin" | "signup">(
    remembered ? "signin" : "signup"
  );
  const [step, setStep] = useState<1 | 2 | 3>(hasPending ? 3 : 1);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>();
  const [rawPick, setRawPick] = useState<string | null>(null);

  const [ident, setIdent] = useState(remembered?.displayUsername ?? "");
  const [loginPass, setLoginPass] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(remembered));

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, [mode, step]);

  useEffect(() => {
    if (user) onDone();
  }, [user, onDone]);

  /* If a verification is already outstanding (e.g. the tab was reloaded mid
     sign-up), jump straight to it — otherwise the half-created account would
     block re-registering with the same email and strand the user. */
  useEffect(() => {
    if (hasPending) {
      setMode("signup");
      setStep((s) => (s === 3 ? s : 3));
    }
  }, [hasPending]);

  const uname = username.trim().toLowerCase();
  const unameBad = uname.length > 0 && !USERNAME_RE.test(uname);
  const unameTaken = USERNAME_RE.test(uname) && !isUsernameFree(uname);
  const mailBad = email.length > 0 && !EMAIL_RE.test(email.trim());
  const mailTaken = EMAIL_RE.test(email.trim()) && !isEmailFree(email.trim());

  const detailsValid =
    fullName.trim().length > 0 &&
    USERNAME_RE.test(uname) &&
    !unameTaken &&
    EMAIL_RE.test(email.trim()) &&
    !mailTaken &&
    password.length >= 8;

  /* ------------------------------ handlers ------------------------------ */

  const pickFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawPick(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submitSignUp = async () => {
    setBusy(true);
    setErr(null);
    const res = await signUp({ fullName, username, email, password, avatar });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "Could not create the account.");
      setStep(1);
      return;
    }
    setCode("");
    setStep(3);
  };

  const submitVerify = (e: FormEvent) => {
    e.preventDefault();
    const res = verifyCode(code, rememberMe);
    if (!res.ok) setErr(res.error ?? "Verification failed.");
    // success → `user` is set → onDone fires via effect
  };

  const submitSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn(
      remembered?.username ?? ident,
      loginPass,
      rememberMe
    );
    setBusy(false);
    if (res.needsVerify) {
      setErr(null);
      setCode("");
      setMode("signup");
      setStep(3);
      return;
    }
    if (!res.ok) setErr(res.error ?? "Could not sign in.");
  };

  /* ------------------------------- render ------------------------------- */

  return (
    <Shell>
      <AnimatePresence mode="wait">
        {/* ============================ SIGN IN ============================ */}
        {mode === "signin" && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Head
              kicker={remembered ? "Trusted device" : "Returning operator"}
              title="Sign in"
            />
            <form onSubmit={submitSignIn} className="mt-10 space-y-7">
              {remembered ? (
                <div className="flex items-center gap-4 border-b border-bone/15 pb-5">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-bone/20 bg-ash">
                    {remembered.avatar ? (
                      <img
                        src={remembered.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-bone/40">
                        {remembered.displayUsername.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-bone">
                      {remembered.displayUsername}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        forgetDevice();
                        setIdent("");
                        setRememberMe(false);
                      }}
                      className="mt-1 font-mono text-[9px] tracking-[0.3em] text-bone/40 uppercase transition-colors hover:text-bone"
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={label} htmlFor="si-id">
                    Username or email
                  </label>
                  <input
                    id="si-id"
                    ref={firstRef}
                    className={field}
                    value={ident}
                    autoComplete="username"
                    onChange={(e) => setIdent(e.target.value)}
                    placeholder="deb"
                  />
                </div>
              )}
              <div>
                <label className={label} htmlFor="si-pw">
                  Password
                </label>
                <input
                  id="si-pw"
                  ref={remembered ? firstRef : undefined}
                  type="password"
                  className={field}
                  value={loginPass}
                  autoComplete="current-password"
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 font-mono text-[9px] tracking-[0.3em] text-bone/50 uppercase">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#c41e3a]"
                />
                Remember this device — password only next time
              </label>

              {err && (
                <p className="font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
                  {err}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setStep(1);
                    setErr(null);
                  }}
                  className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase transition-colors duration-300 hover:text-bone"
                >
                  Create an account
                </button>
                <button
                  type="submit"
                  disabled={
                    busy || !(remembered?.username || ident) || !loginPass
                  }
                  className="group flex items-center gap-2.5 rounded-full bg-bone px-8 py-3.5 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone disabled:opacity-35"
                >
                  {busy ? "Checking…" : "Enter"}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ========================== SIGN UP — 1 ========================== */}
        {mode === "signup" && step === 1 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Head kicker="Step 1 of 3 — identity" title="Create account" />

            <div className="mt-10 grid gap-7 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="su-name">
                  Full name *
                </label>
                <input
                  id="su-name"
                  ref={firstRef}
                  className={field}
                  value={fullName}
                  autoComplete="name"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Deborah Vance"
                />
              </div>

              <div>
                <label className={label} htmlFor="su-user">
                  Username *
                </label>
                <input
                  id="su-user"
                  className={field}
                  value={username}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="deb"
                />
                <p className="mt-2 font-mono text-[9px] tracking-[0.25em] uppercase">
                  {unameBad ? (
                    <span className="text-blood">3–20 chars · a–z 0–9 _</span>
                  ) : unameTaken ? (
                    <span className="text-blood">Already taken</span>
                  ) : USERNAME_RE.test(uname) ? (
                    <span className="text-bone/50">✓ Available</span>
                  ) : (
                    <span className="text-bone/20">Unique handle</span>
                  )}
                </p>
              </div>

              <div>
                <label className={label} htmlFor="su-mail">
                  Email *
                </label>
                <input
                  id="su-mail"
                  type="email"
                  className={field}
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deb@sanctum.dev"
                />
                <p className="mt-2 font-mono text-[9px] tracking-[0.25em] uppercase">
                  {mailBad ? (
                    <span className="text-blood">Invalid address</span>
                  ) : mailTaken ? (
                    <span className="text-blood">Already registered</span>
                  ) : (
                    <span className="text-bone/20">We'll send a code</span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={label} htmlFor="su-pw">
                  Password *
                </label>
                <input
                  id="su-pw"
                  type="password"
                  className={field}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 font-mono text-[9px] tracking-[0.3em] text-bone/50 uppercase sm:col-span-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#c41e3a]"
                />
                Remember this device — only the password on daily access
              </label>
            </div>

            {err && (
              <p className="mt-6 font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
                {err}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErr(null);
                }}
                className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase transition-colors duration-300 hover:text-bone"
              >
                I already have an account
              </button>
              <button
                type="button"
                disabled={!detailsValid}
                onClick={() => {
                  setErr(null);
                  setStep(2);
                }}
                className="group flex items-center gap-2.5 rounded-full bg-bone px-8 py-3.5 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone disabled:opacity-35"
              >
                Continue
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================== SIGN UP — 2 ========================== */}
        {mode === "signup" && step === 2 && (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Head kicker="Step 2 of 3 — portrait" title="Profile picture" />

            <div className="mt-10 flex flex-col items-center gap-7 sm:flex-row sm:items-start">
              <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-full border border-bone/20 bg-ash">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-12 w-12 text-bone/15" strokeWidth={1} />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-bone/10" />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm leading-relaxed text-smoke">
                  Upload an image and frame it in the circle. Optional — you can
                  always add one later.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <label className="flex cursor-pointer items-center gap-2 border border-bone/20 px-5 py-2.5 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/50 hover:text-bone">
                    <ImageUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {avatar ? "Replace" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        pickFile(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar(undefined)}
                      className="font-mono text-[9px] tracking-[0.3em] text-bone/35 uppercase transition-colors duration-300 hover:text-blood"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {err && (
              <p className="mt-6 font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
                {err}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase transition-colors duration-300 hover:text-bone"
              >
                Back
              </button>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={submitSignUp}
                  className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase transition-colors duration-300 hover:text-bone"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitSignUp}
                  className="group flex items-center gap-2.5 rounded-full bg-bone px-8 py-3.5 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone disabled:opacity-35"
                >
                  {busy ? "Creating…" : "Send code"}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================== SIGN UP — 3 ========================== */}
        {mode === "signup" && step === 3 && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Head kicker="Step 3 of 3 — verification" title="Confirm email" />

            <p className="mt-6 max-w-md text-sm leading-relaxed text-smoke">
              A 6-digit code was issued for{" "}
              <span className="text-bone">{pendingEmail ?? email}</span>. Enter it
              below to activate the account.
            </p>

            {/* local mail relay — no backend exists to send real email */}
            {pendingCode && (
              <div className="mt-7 border border-bone/15 bg-black/40 p-5">
                <p className="flex items-center gap-2.5 font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase">
                  <Mail className="h-3.5 w-3.5 text-blood" strokeWidth={1.5} />
                  Local mail relay — offline build
                </p>
                <p className="mt-4 font-display text-4xl tabular-nums tracking-[0.25em]">
                  {pendingCode}
                </p>
                <p className="mt-3 font-mono text-[9px] tracking-[0.25em] text-bone/30 uppercase">
                  This site has no server, so the code is delivered here. Expires
                  in 10 minutes.
                </p>
              </div>
            )}

            <form onSubmit={submitVerify} className="mt-8">
              <label className={label} htmlFor="vf-code">
                Verification code
              </label>
              <input
                id="vf-code"
                ref={firstRef}
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setErr(null);
                }}
                placeholder="000000"
                className="mt-3 w-full max-w-xs border-b border-bone/25 bg-transparent pb-3 text-center font-mono text-2xl tracking-[0.6em] text-bone caret-blood outline-none transition-colors duration-300 placeholder:text-bone/15 focus:border-bone/70"
              />

              {err && (
                <p className="mt-5 font-mono text-[9px] tracking-[0.3em] text-blood uppercase">
                  {err}
                </p>
              )}

              <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => {
                      cancelPending();
                      setErr(null);
                      setStep(1);
                    }}
                    className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase transition-colors duration-300 hover:text-bone"
                  >
                    Start over
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resendCode();
                      setCode("");
                      setErr(null);
                    }}
                    className="font-mono text-[9px] tracking-[0.3em] text-bone/45 uppercase transition-colors duration-300 hover:text-bone"
                  >
                    Resend code
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={code.length !== 6}
                  className="flex items-center gap-2.5 rounded-full bg-bone px-8 py-3.5 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone disabled:opacity-35"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Verify
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* security footnote */}
      <p className="mt-14 flex items-start gap-2.5 font-mono text-[9px] leading-relaxed tracking-[0.25em] text-bone/25 uppercase">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        Accounts are stored only in this browser. No data leaves your device.
      </p>

      {/* cropper */}
      <AnimatePresence>
        {rawPick && (
          <ImageCropper
            key="cropper"
            src={rawPick}
            onCancel={() => setRawPick(null)}
            onApply={(d) => {
              setAvatar(d);
              setRawPick(null);
            }}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}
