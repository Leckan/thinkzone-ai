"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function EmailPasswordForm({ intent }: { intent: "sign-in" | "sign-up" }) {
  const isSignUp = intent === "sign-up";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const confirmation = String(formData.get("confirm-password") ?? "");

    setError("");
    setDuplicateEmail(false);

    if (isSignUp && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: "/workspace",
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: "/workspace",
          });

      if (result.error) {
        if (isSignUp && result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          setDuplicateEmail(true);
          return;
        }

        setError(isSignUp
          ? "We couldn't create your account. Check the details and try again."
          : "We couldn't sign you in. Check your email and password.");
        return;
      }

      window.location.assign("/workspace");
    } catch {
      setError(isSignUp
        ? "We couldn't create your account. Please try again."
        : "We couldn't sign you in. Check your email and password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-email-form" onSubmit={(event) => void handleSubmit(event)}>
      {isSignUp && (
        <label className="auth-field">
          <span>Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            disabled={busy}
          />
        </label>
      )}
      <label className="auth-field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          required
          disabled={busy}
        />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
        />
      </label>
      {isSignUp && (
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={busy}
          />
        </label>
      )}
      <button className="auth-submit-button" type="submit" disabled={busy} aria-busy={busy}>
      {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </button>
      {error && <p className="auth-form-error" role="alert">{error}</p>}
      {duplicateEmail && (
        <p className="auth-form-error" role="alert">
          An account with this email already exists. <Link href="/sign-in">Sign in with your existing method.</Link>
        </p>
      )}
    </form>
  );
}
