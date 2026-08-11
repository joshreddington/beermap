"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationSharing } from "@/context/LocationSharingContext";
import { useGeoLocation } from "@/context/GeoLocationContext";

interface SharingSheetProps {
  onClose: () => void;
  onNeedsAccount: () => void;
}

export default function SharingSheet({ onClose, onNeedsAccount }: SharingSheetProps) {
  const { configured: authConfigured, user } = useAuth();
  const {
    configured: sharingConfigured,
    online,
    sharingEnabled,
    toggleSharing,
    myShareCode,
    watchedPeerIds,
    addWatchedPeer,
    removeWatchedPeer,
    grantedPeerIds,
    grantPeerAccess,
    revokePeerAccess,
  } = useLocationSharing();
  const { enabled: geoEnabled, enable: enableGeo, status: geoStatus } = useGeoLocation();
  const [watchInput, setWatchInput] = useState("");
  const [grantInput, setGrantInput] = useState("");

  const configured = authConfigured && sharingConfigured;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-5 pt-3 pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">📡 Location Sharing</h2>
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
            Sharing isn&apos;t set up for this build yet. Nothing about the map,
            your crawls, or your stops needs it — this is purely an optional
            extra.
          </p>
        )}

        {configured && !user && (
          <div className="mt-3">
            <p className="text-sm text-neutral-600">Sign in to share your location with friends.</p>
            <button
              onClick={onNeedsAccount}
              className="mt-3 w-full rounded-xl bg-amber-600 py-2.5 font-medium text-white active:bg-amber-700"
            >
              Sign In
            </button>
          </div>
        )}

        {configured && user && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">Share my location</div>
                <div className="text-xs text-neutral-500">
                  {!online
                    ? "Offline — will resume when you're back online"
                    : sharingEnabled
                    ? "On"
                    : "Off"}
                </div>
              </div>
              <button
                role="switch"
                aria-checked={sharingEnabled}
                onClick={() => {
                  if (!geoEnabled) enableGeo();
                  toggleSharing();
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  sharingEnabled ? "bg-green-600" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] ${
                    sharingEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {sharingEnabled && geoStatus === "denied" && (
              <p className="text-xs text-amber-600">
                Location permission is off, so nothing is being shared yet.
              </p>
            )}

            <div>
              <div className="text-xs font-medium text-neutral-500">Your share code</div>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
                  {myShareCode}
                </code>
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Send this to a friend so they can add you below.
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-500">People who can see you</div>
              {grantedPeerIds.length === 0 && (
                <p className="mt-1 text-xs text-neutral-400">No one yet.</p>
              )}
              <ul className="mt-1 space-y-1">
                {grantedPeerIds.map((id) => (
                  <li key={id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-1.5 text-xs">
                    <code className="truncate text-neutral-600">{id}</code>
                    <button
                      onClick={() => revokePeerAccess(id)}
                      className="ml-2 shrink-0 text-red-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <input
                  value={grantInput}
                  onChange={(e) => setGrantInput(e.target.value)}
                  placeholder="Friend's share code"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                />
                <button
                  onClick={() => {
                    grantPeerAccess(grantInput);
                    setGrantInput("");
                  }}
                  disabled={!grantInput.trim()}
                  className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
                >
                  Allow
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-500">People you&apos;re watching</div>
              {watchedPeerIds.length === 0 && (
                <p className="mt-1 text-xs text-neutral-400">
                  Add a friend&apos;s share code once they&apos;ve allowed you.
                </p>
              )}
              <ul className="mt-1 space-y-1">
                {watchedPeerIds.map((id) => (
                  <li key={id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-1.5 text-xs">
                    <code className="truncate text-neutral-600">{id}</code>
                    <button
                      onClick={() => removeWatchedPeer(id)}
                      className="ml-2 shrink-0 text-red-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <input
                  value={watchInput}
                  onChange={(e) => setWatchInput(e.target.value)}
                  placeholder="Their share code"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                />
                <button
                  onClick={() => {
                    addWatchedPeer(watchInput);
                    setWatchInput("");
                  }}
                  disabled={!watchInput.trim()}
                  className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
