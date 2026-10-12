import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { EmailPasswordForm } from "@/components/email-password-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export function AuthPage({
  intent,
  googleOAuthEnabled,
}: {
  intent: "sign-in" | "sign-up";
  googleOAuthEnabled: boolean;
}) {
  const isSignUp = intent === "sign-up";

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
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-mark"><Sparkles size={21} /></div>
        <p className="marketing-kicker">{isSignUp ? "Start thinking clearly" : "Your workspace is waiting"}</p>
        <h1 id="auth-title">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-description">
          {isSignUp
            ? "Create an account with your email and password, or continue with Google."
            : "Sign in with your email and password or continue with Google."}
        </p>
        <EmailPasswordForm intent={intent} />
        {googleOAuthEnabled && (
          <>
            <div className="auth-divider"><span>or continue with Google</span></div>
            <GoogleSignInButton enabled />
          </>
        )}
        <p className="auth-switch">
          {isSignUp ? "Already have an account?" : "New to Think Zone?"}{" "}
          <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link>
        </p>
        <p className="auth-privacy">Only you can access conversations saved to your account.</p>
      </section>
      <footer className="auth-footer">Think Zone AI <span>·</span> A focused home for AI work</footer>
    </main>
  );
}
