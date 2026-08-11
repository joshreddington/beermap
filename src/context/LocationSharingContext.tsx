"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  doc,
  setDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useGeoLocation } from "@/context/GeoLocationContext";

const STORAGE_KEY = "beermap.sharing.v1";
const WRITE_THROTTLE_MS = 15_000;
// ~15m at Munich's latitude -- enough to visibly move a marker before we
// bother spending a write.
const MOVE_THRESHOLD_DEG = 0.00015;

export interface SharedPeer {
  id: string;
  label: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

interface StoredPrefs {
  sharingEnabled: boolean;
  watchedPeerIds: string[];
}

interface LocationSharingContextValue {
  configured: boolean;
  online: boolean;
  sharingEnabled: boolean;
  toggleSharing: () => void;
  myShareCode: string | null;
  watchedPeerIds: string[];
  addWatchedPeer: (uid: string) => void;
  removeWatchedPeer: (uid: string) => void;
  grantedPeerIds: string[];
  grantPeerAccess: (uid: string) => void;
  revokePeerAccess: (uid: string) => void;
  sharedPeers: SharedPeer[];
}

const LocationSharingContext = createContext<LocationSharingContextValue | null>(null);

function loadPrefs(): StoredPrefs {
  if (typeof window === "undefined") return { sharingEnabled: false, watchedPeerIds: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : { sharingEnabled: false, watchedPeerIds: [] };
  } catch {
    return { sharingEnabled: false, watchedPeerIds: [] };
  }
}

export function LocationSharingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { fix, status: geoStatus } = useGeoLocation();

  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [watchedPeerIds, setWatchedPeerIds] = useState<string[]>([]);
  const [grantedPeerIds, setGrantedPeerIds] = useState<string[]>([]);
  const [sharedPeers, setSharedPeers] = useState<Record<string, SharedPeer>>({});
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const lastWrite = useRef<{ lat: number; lng: number; at: number } | null>(null);

  useEffect(() => {
    const prefs = loadPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSharingEnabled(prefs.sharingEnabled);
    setWatchedPeerIds(prefs.watchedPeerIds);
    setHydrated(true);

    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sharingEnabled, watchedPeerIds })
    );
  }, [sharingEnabled, watchedPeerIds, hydrated]);

  // Mirror my own doc's sharedWith so the UI can show who currently has
  // access, kept in sync across this user's devices.
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGrantedPeerIds([]);
      return;
    }
    const ref = doc(db, "locations", user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        setGrantedPeerIds((data?.sharedWith as string[] | undefined) ?? []);
      },
      () => setGrantedPeerIds([])
    );
    return unsubscribe;
  }, [user]);

  // Push my position (throttled by time and distance) while the switch is
  // on, I'm signed in, and there's a fresh fix. Firestore's local cache
  // queues this write automatically when offline and flushes on reconnect.
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user || !sharingEnabled || geoStatus !== "active" || !fix) return;

    const last = lastWrite.current;
    const movedEnough =
      !last ||
      Math.abs(last.lat - fix.lat) > MOVE_THRESHOLD_DEG ||
      Math.abs(last.lng - fix.lng) > MOVE_THRESHOLD_DEG;
    const timeEnough = !last || Date.now() - last.at > WRITE_THROTTLE_MS;
    if (!movedEnough && !timeEnough) return;

    lastWrite.current = { lat: fix.lat, lng: fix.lng, at: Date.now() };
    setDoc(
      doc(db, "locations", user.uid),
      {
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
        displayName: user.displayName ?? user.email ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {
      // Offline or a permissions hiccup -- Firestore's local cache already
      // queued the write for retry; nothing more to do here.
    });
  }, [user, sharingEnabled, geoStatus, fix]);

  // Subscribe to each watched peer's doc. A peer who hasn't granted access
  // yet makes this listener fail with permission-denied -- that's expected
  // and handled silently (peer just doesn't appear), not surfaced as an error.
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSharedPeers({});
      return;
    }
    const unsubscribes: Unsubscribe[] = watchedPeerIds.map((peerId) =>
      onSnapshot(
        doc(db, "locations", peerId),
        (snap) => {
          const data = snap.data();
          if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") {
            setSharedPeers((prev) => {
              const next = { ...prev };
              delete next[peerId];
              return next;
            });
            return;
          }
          setSharedPeers((prev) => ({
            ...prev,
            [peerId]: {
              id: peerId,
              label: (data.displayName as string | null) || peerId.slice(0, 4),
              lat: data.lat,
              lng: data.lng,
              updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
            },
          }));
        },
        () => {
          setSharedPeers((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      )
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user, watchedPeerIds]);

  const toggleSharing = useCallback(() => {
    setSharingEnabled((prev) => !prev);
  }, []);

  const addWatchedPeer = useCallback((uid: string) => {
    const trimmed = uid.trim();
    if (!trimmed) return;
    setWatchedPeerIds((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const removeWatchedPeer = useCallback((uid: string) => {
    setWatchedPeerIds((prev) => prev.filter((id) => id !== uid));
    setSharedPeers((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  }, []);

  const grantPeerAccess = useCallback(
    (uid: string) => {
      const db = getFirebaseDb();
      const trimmed = uid.trim();
      if (!db || !user || !trimmed) return;
      setDoc(
        doc(db, "locations", user.uid),
        { sharedWith: arrayUnion(trimmed) },
        { merge: true }
      ).catch(() => {});
    },
    [user]
  );

  const revokePeerAccess = useCallback(
    (uid: string) => {
      const db = getFirebaseDb();
      if (!db || !user) return;
      setDoc(
        doc(db, "locations", user.uid),
        { sharedWith: arrayRemove(uid) },
        { merge: true }
      ).catch(() => {});
    },
    [user]
  );

  return (
    <LocationSharingContext.Provider
      value={{
        configured: firebaseConfigured,
        online,
        sharingEnabled,
        toggleSharing,
        myShareCode: user?.uid ?? null,
        watchedPeerIds,
        addWatchedPeer,
        removeWatchedPeer,
        grantedPeerIds,
        grantPeerAccess,
        revokePeerAccess,
        sharedPeers: Object.values(sharedPeers),
      }}
    >
      {children}
    </LocationSharingContext.Provider>
  );
}

export function useLocationSharing(): LocationSharingContextValue {
  const ctx = useContext(LocationSharingContext);
  if (!ctx) throw new Error("useLocationSharing must be used within a LocationSharingProvider");
  return ctx;
}
