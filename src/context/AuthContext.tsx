"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  OAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth, firebaseConfigured } from "@/lib/firebase";
import { isSafariBrowser } from "@/lib/platform";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextValue {
  // Accounts are entirely optional. `configured` tells the UI whether to
  // offer sign-in at all, so a build with no Firebase env vars degrades to
  // "no accounts" instead of a broken/erroring sign-in button.
  configured: boolean;
  loading: boolean;
  user: AuthUser | null;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists for that email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/network-request-failed":
      return "No connection — check your network and try again.";
    case "auth/popup-blocked":
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/unauthorized-domain":
      return "This site isn't set up for sign-in yet (domain not authorized).";
    default:
      return "Something went wrong signing in. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    // Surfaces errors from the signInWithRedirect round-trip (used on
    // Safari and in the native app, see signInWithApple below). A
    // successful redirect result is picked up by onAuthStateChanged below
    // without needing the resolved credential here.
    getRedirectResult(auth).catch((err) => {
      console.error("Firebase redirect sign-in error:", err);
      setError(describeAuthError(err));
    });
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(toAuthUser(firebaseUser));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithEmail(email: string, password: string) {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Firebase auth error:", err);
      setError(describeAuthError(err));
      throw err;
    }
  }

  async function signUpWithEmail(email: string, password: string) {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Firebase auth error:", err);
      setError(describeAuthError(err));
      throw err;
    }
  }

  async function signInWithApple() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setError(null);
    const provider = new OAuthProvider("apple.com");
    try {
      // Popups don't work inside a Capacitor native webview, and Safari's
      // cross-site tracking prevention blocks the popup from relaying its
      // result back to the opener (they're on different origins: the app
      // on its own domain, Firebase's auth relay on *.firebaseapp.com) --
      // both need a full-page redirect instead. Chrome/Firefox don't have
      // that restriction, so a popup there keeps the rest of the app state.
      const isNative =
        typeof window !== "undefined" &&
        // @ts-expect-error -- injected by Capacitor at runtime, not always present
        Boolean(window.Capacitor?.isNativePlatform?.());
      if (isNative || isSafariBrowser()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err) {
      console.error("Firebase auth error:", err);
      setError(describeAuthError(err));
      throw err;
    }
  }

  async function signOut() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await firebaseSignOut(auth);
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        configured: firebaseConfigured,
        loading,
        user,
        error,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
