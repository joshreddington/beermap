"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isApplePlatform } from "@/lib/platform";

interface AccountSheetProps {
  onClose: () => void;
}

export default function AccountSheet({ onClose }: AccountSheetProps) {
  const { configured, loading, user, error, signInWithEmail, signUpWithEmail, signInWithApple, signOut, clearError } =
    useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Computed client-side only (avoids a server/client hydration mismatch,
  // since the server has no user agent to check).
  const [showApple, setShowApple] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowApple(isApplePlatform());
  }, []);

  async function submitEmail() {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch {
      // Error message already surfaced via context state.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-5 pt-3 pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">👤 Account</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
          >
            ✕
          </button>
        </div>

        {!configured && (
          <p className="mt-3 text-sm text-neutral-500">
            Accounts aren&apos;t set up for this build yet — the map keeps working
            fully offline without one. No login is required for anything else
            in the app.
          </p>
        )}

        {configured && loading && (
          <p className="mt-3 text-sm text-neutral-500">Checking sign-in status…</p>
        )}

        {configured && !loading && user && (
          <div className="mt-3">
            <p className="text-sm text-neutral-700">
              Signed in as <span className="font-medium">{user.displayName || user.email || user.uid}</span>
            </p>
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="mt-3 w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-red-600"
            >
              Sign Out
            </button>
          </div>
        )}

        {configured && !loading && !user && (
          <div className="mt-3">
            {showApple && (
              <>
                <button
                  onClick={() => signInWithApple().catch(() => {})}
                  className="w-full rounded-xl bg-black py-3 font-medium text-white active:bg-neutral-800"
                >
                   Sign in with Apple
                </button>

                <div className="my-3 flex items-center gap-2 text-xs text-neutral-400">
                  <div className="h-px flex-1 bg-neutral-200" />
                  or with email
                  <div className="h-px flex-1 bg-neutral-200" />
                </div>
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
            />

            {error && (
              <p className="mt-2 text-xs text-red-600">
                {error}
                <button onClick={clearError} className="ml-2 underline">
                  dismiss
                </button>
              </p>
            )}

            <button
              onClick={submitEmail}
              disabled={submitting || !email || !password}
              className="mt-3 w-full rounded-xl bg-amber-600 py-2.5 font-medium text-white active:bg-amber-700 disabled:opacity-50"
            >
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-2 w-full text-center text-xs text-neutral-500 underline"
            >
              {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
