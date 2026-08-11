import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import {
  Auth,
  connectAuthEmulator,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Accounts and location sharing are opt-in layers on top of an app that
// works fully offline with zero config. If these env vars aren't set (the
// out-of-the-box state), every consumer of this module must degrade to
// "feature unavailable" rather than throwing — never crash the base app
// because the cloud layer wasn't configured.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (!firebaseConfigured || typeof window === "undefined") return;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });

  // Firestore's persistent local cache is what makes location sharing
  // "offline first, sharing layer on top": writes/reads queue locally and
  // sync when connectivity returns, instead of failing outright.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true") {
    connectAuthEmulator(auth, "http://localhost:9099");
  }
}

init();

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  return db;
}
