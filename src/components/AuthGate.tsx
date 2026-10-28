import React, { useEffect, useRef, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { ArrowRight, CheckCircle2, Fingerprint, LoaderCircle, ShieldCheck } from "lucide-react";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const firebaseApp = configured ? (getApps().length ? getApp() : initializeApp(config)) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;

export const AuthGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recaptcha = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => () => {
    recaptcha.current?.clear();
    recaptcha.current = null;
  }, []);

  if (!configured || !auth) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-10 text-slate-100">
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
          <Brand />
          <section className="mt-8 rounded-3xl border border-slate-400/20 bg-gradient-to-br from-[#171b23] to-[#080a0f] p-6 shadow-2xl">
            <ShieldCheck className="h-8 w-8 text-slate-200" />
            <h1 className="mt-4 text-xl font-bold">Secure sign-in setup needed</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Google sign-in and SMS OTP need a Firebase project connected to this app. Add the four VITE_FIREBASE values from your Firebase Web App settings, then enable Google and Phone in Authentication.
            </p>
            <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-slate-400">
              The app is intentionally locked until authentication is configured. This prevents a fake login screen from pretending that a user has been verified.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return <div className="grid min-h-screen place-items-center bg-[#07090d] text-slate-300"><LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading secure session" /></div>;
  }
  if (user) return <>{children}</>;

  const googleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!recaptcha.current) {
        recaptcha.current = new RecaptchaVerifier(auth, "kharchee-recaptcha", { size: "normal" });
      }
      const digits = phone.replace(/[^0-9]/g, "");
      const e164 = phone.trim().startsWith("+") ? phone.trim() : `+91${digits}`;
      if (!/^\+[1-9]\d{7,14}$/.test(e164)) throw new Error("Enter a valid phone number with country code.");
      const result = await signInWithPhoneNumber(auth, e164, recaptcha.current);
      setConfirmation(result);
    } catch (e) {
      setError(friendlyError(e));
      recaptcha.current?.clear();
      recaptcha.current = null;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmation) return;
    setLoading(true);
    setError("");
    try {
      await confirmation.confirm(otp.trim());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">
        <Brand />
        <section className="mt-8 rounded-3xl border border-slate-400/20 bg-gradient-to-br from-[#171b23] via-[#10131a] to-[#080a0f] p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300/20 bg-gradient-to-br from-slate-200/20 to-white/[0.02]">
            <Fingerprint className="h-6 w-6 text-slate-200" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Your money. Your space.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Sign in securely to open your personal finance dashboard.</p>

          <button type="button" onClick={googleSignIn} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300/20 bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60">
            <GoogleMark /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">
            <span className="h-px flex-1 bg-white/10" /> or mobile OTP <span className="h-px flex-1 bg-white/10" />
          </div>

          {!confirmation ? (
            <form onSubmit={sendOtp} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300" htmlFor="phone">Mobile number</label>
              <input id="phone" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required className="w-full rounded-xl border border-slate-400/20 bg-black/35 px-4 py-3 text-sm outline-none transition focus:border-slate-200/60" />
              <div id="kharchee-recaptcha" className="min-h-2" />
              <button type="submit" disabled={loading || !phone.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:opacity-50">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Send verification code
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300" htmlFor="otp">6-digit verification code</label>
              <input id="otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required className="w-full rounded-xl border border-slate-400/20 bg-black/35 px-4 py-3 text-center font-mono text-lg tracking-[.5em] outline-none focus:border-slate-200/60" />
              <button type="submit" disabled={loading || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Verify & sign in
              </button>
              <button type="button" onClick={() => { setConfirmation(null); setOtp(""); }} className="w-full py-2 text-xs text-slate-400 hover:text-white">Change phone number</button>
            </form>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-xs leading-5 text-rose-200">{error}</p>}
          <p className="mt-5 text-[11px] leading-5 text-slate-500">By continuing, you agree to use this account only for your own data. SMS verification may incur carrier charges.</p>
        </section>
      </div>
    </main>
  );
};

const Brand = () => (
  <div className="flex items-center gap-3">
    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-300/25 bg-gradient-to-br from-slate-100/15 to-black text-slate-100 shadow-inner"><span className="font-mono text-lg font-black">K.</span></div>
    <div><div className="text-sm font-black tracking-[.24em]">KHARCHEE</div><div className="mt-1 text-[10px] uppercase tracking-[.22em] text-slate-500">Private finance, made clear</div></div>
  </div>
);

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.58c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.12 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.32 6.16-4.32z"/>
  </svg>
);

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  if (message.includes("auth/unauthorized-domain")) return "This domain is not authorized in Firebase Authentication settings.";
  if (message.includes("auth/popup-closed-by-user")) return "Google sign-in was cancelled.";
  if (message.includes("auth/invalid-phone-number")) return "That phone number looks invalid. Include the country code.";
  if (message.includes("auth/too-many-requests")) return "Too many attempts. Please wait a little before trying again.";
  return message;
}
