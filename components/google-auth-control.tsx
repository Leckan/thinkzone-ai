"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleAuthControl({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <ConfiguredGoogleAuthControl />;
}

function ConfiguredGoogleAuthControl() {
  const { data: session, isPending } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isPending) return <span className="auth-control-status" aria-live="polite">Checking account…</span>;

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/workspace" });
      if (result.error) setError("Google sign-in could not be started. Check the OAuth setup and try again.");
    } catch {
      setError("Google sign-in could not be started. Check the OAuth setup and try again.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Sign-out did not complete. Please try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Sign-out did not complete. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-control">
      {session ? (
        <>
          <span className="auth-control-user" title={session.user.email}>
            {session.user.name || session.user.email}
          </span>
          <button className="button-secondary auth-control-button" type="button" onClick={() => void signOut()} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </>
      ) : (
        <button className="button-secondary auth-control-button" type="button" onClick={() => void signIn()} disabled={busy}>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
      )}
      {error && <span className="auth-control-error" role="alert">{error}</span>}
    </div>
  );
}
