"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton({
  enabled,
  callbackURL = "/workspace",
}: {
  enabled: boolean;
  callbackURL?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startSignIn = async () => {
    if (!enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (result.error) setError("Google sign-in could not be started. Check the OAuth setup and try again.");
    } catch {
      setError("Google sign-in could not be started. Check the OAuth setup and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="google-sign-in-action">
      <button className="google-sign-in-button" type="button" onClick={() => void startSignIn()} disabled={!enabled || busy} aria-busy={busy}>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z" />
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
          <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
          <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
        </svg>
        <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
      </button>
      {!enabled && <p className="auth-form-error" role="status">Google sign-in is not configured. Ask the site administrator to finish setup.</p>}
      {error && <p className="auth-form-error" role="alert">{error}</p>}
    </div>
  );
}
