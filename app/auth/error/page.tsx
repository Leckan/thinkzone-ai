import Link from "next/link";
import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const accountNotLinked = error === "account_not_linked";

  return (
    <main className="auth-shell">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />
      <header className="auth-header">
        <Link className="marketing-brand" href="/">
          <span className="marketing-brand-mark"><Sparkles size={18} /></span>
          <span>think zone<span className="marketing-brand-ai"> AI</span></span>
        </Link>
        <Link className="auth-back-link" href="/"><ArrowLeft size={15} /> Back to home</Link>
      </header>
      <section className="auth-card" aria-labelledby="auth-error-title">
        <div className="auth-card-mark"><LockKeyhole size={21} /></div>
        <p className="marketing-kicker">Secure account access</p>
        <h1 id="auth-error-title">{accountNotLinked ? "This email already has an account" : "We couldn’t finish Google sign-in"}</h1>
        <p className="auth-description">
          {accountNotLinked
            ? "Sign in with that account’s email and password first. Then open Workspace Settings and connect Google to the account. After that, you can use either sign-in method."
            : "Try again. If you already use email and password, sign in with that method first and connect Google in Workspace Settings."}
        </p>
        <div className="auth-error-actions">
          <Link className="auth-submit-button auth-link-button" href="/sign-in">Continue to sign in</Link>
          <Link className="auth-error-secondary" href="/">Return to home</Link>
        </div>
      </section>
      <footer className="auth-footer">
        <span>Think Zone AI <span>·</span> A Think Zone LLC product</span>
        <nav className="auth-footer-links" aria-label="Legal pages">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </main>
  );
}
