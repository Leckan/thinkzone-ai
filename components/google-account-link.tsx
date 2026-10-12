"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleAccountLink({ enabled }: { enabled: boolean }) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    void authClient.listAccounts().then(({ data, error: responseError }) => {
      if (!active) return;
      if (responseError) {
        setError("Could not check connected sign-in methods. Reload and try again.");
      } else {
        setConnected(data?.some((account) => account.providerId === "google") ?? false);
      }
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setError("Could not check connected sign-in methods. Reload and try again.");
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  async function connectGoogle() {
    if (!enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/workspace",
        errorCallbackURL: "/auth/error",
      });
      if (result.error) {
        setError("Google could not be connected. Please try again.");
        setBusy(false);
      }
    } catch {
      setError("Google could not be connected. Please try again.");
      setBusy(false);
    }
  }

  if (!enabled) return <span className="setting-value">Not configured</span>;
  if (checking) return <span className="setting-value" aria-live="polite">Checking…</span>;
  if (connected) return <span className="setting-value">Connected</span>;

  return (
    <div className="google-account-link">
      <button className="button-secondary" type="button" onClick={() => void connectGoogle()} disabled={busy}>
        {busy ? "Opening Google…" : "Connect Google"}
      </button>
      <p className="google-account-link-note">Sign in with your password first, then connect Google here.</p>
      {error && <p className="auth-form-error" role="alert">{error}</p>}
    </div>
  );
}
