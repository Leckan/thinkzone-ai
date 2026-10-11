import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Brain, Check, FileText, MessageSquareText, Sparkles, WandSparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Choose your model",
    detail: "Move between models available through the provider accounts configured for your workspace.",
    tone: "violet",
  },
  {
    icon: MessageSquareText,
    title: "Keep the thread",
    detail: "Continue a conversation with its saved context, or keep a chat in your browser until you choose to save it.",
    tone: "mint",
  },
  {
    icon: FileText,
    title: "Read answers your way",
    detail: "View clear Markdown or switch to the original response text whenever you need it.",
    tone: "blue",
  },
];

export function MarketingLanding() {
  return (
    <main className="marketing-shell">
      <header className="marketing-header">
        <Link className="marketing-brand" href="/" aria-label="Think Zone AI home">
          <span className="marketing-brand-mark"><Sparkles size={18} /></span>
          <span>think zone<span className="marketing-brand-ai"> AI</span></span>
        </Link>
        <nav className="marketing-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="marketing-nav-actions">
          <Link className="marketing-sign-in" href="/sign-in">Sign in</Link>
          <Link className="marketing-nav-cta" href="/sign-up">Get started <ArrowUpRight size={15} /></Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-kicker"><span className="marketing-kicker-dot" /> A little more room to think</p>
          <h1>All your AI work,<br /><span>in one clear space.</span></h1>
          <p className="marketing-hero-description">
            Find the right model for the moment, keep useful conversations close, and stay focused on the work in front of you.
          </p>
          <div className="marketing-hero-actions">
            <Link className="marketing-primary-cta" href="/sign-up">Create your account <ArrowRight size={16} /></Link>
            <Link className="marketing-secondary-cta" href="/sign-in">I already have an account</Link>
          </div>
          <div className="marketing-points">
            <span><Check size={14} /> One workspace for configured models</span>
            <span><Check size={14} /> Save conversations when you choose</span>
          </div>
        </div>

        <div className="marketing-preview-wrap" aria-hidden="true">
          <div className="marketing-preview-glow" />
          <div className="marketing-preview">
            <div className="preview-topbar">
              <div className="preview-window-dots"><i /><i /><i /></div>
              <span>think zone <b>AI</b></span>
              <span className="preview-avatar">TZ</span>
            </div>
            <div className="preview-body">
              <aside className="preview-sidebar">
                <div className="preview-side-brand"><span><Sparkles size={12} /></span> think zone</div>
                <div className="preview-side-item active"><MessageSquareText size={12} /> New chat</div>
                <div className="preview-side-item"><FileText size={12} /> Conversations</div>
                <div className="preview-side-label">YOUR MODELS</div>
                <div className="preview-model"><span className="preview-model-dot violet" /> OpenAI</div>
                <div className="preview-model"><span className="preview-model-dot green" /> Anthropic</div>
                <div className="preview-model"><span className="preview-model-dot blue" /> Gemini</div>
              </aside>
              <div className="preview-chat">
                <div className="preview-chat-heading">
                  <div><span className="preview-chat-label">NEW CONVERSATION</span><strong>A thought, made clearer</strong></div>
                  <span className="preview-model-pill"><span className="preview-model-dot violet" /> Select model</span>
                </div>
                <div className="preview-message user">
                  <span className="preview-message-avatar">Y</span>
                  <p>Help me turn this idea into a simple plan.</p>
                </div>
                <div className="preview-message assistant">
                  <span className="preview-message-avatar"><Sparkles size={12} /></span>
                  <div><p>Let’s give it a clear first step.</p><div className="preview-answer-line long" /><div className="preview-answer-line" /><div className="preview-answer-line short" /></div>
                </div>
                <div className="preview-composer"><span>Ask anything…</span><span className="preview-send"><ArrowRight size={13} /></span></div>
                <div className="preview-caption"><WandSparkles size={11} /> Your workspace, ready when you are</div>
              </div>
            </div>
          </div>
          <div className="preview-float-card"><span className="preview-float-icon"><Check size={14} /></span><span><b>Saved to your account</b><small>Pick up where you left off</small></span></div>
        </div>
      </section>

      <section className="marketing-feature-section" id="features">
        <div className="marketing-section-heading">
          <p className="marketing-kicker">Built around your flow</p>
          <h2>A calmer way to work with AI.</h2>
          <p>Keep the useful parts close and the experience easy to follow.</p>
        </div>
        <div className="marketing-feature-grid">
          {features.map(({ icon: Icon, title, detail, tone }) => (
            <article className={"marketing-feature-card"} key={title}>
              <span className={"marketing-feature-icon " + tone}><Icon size={19} /></span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-how" id="how-it-works">
        <div>
          <p className="marketing-kicker">Your starting point</p>
          <h2>Sign in. Pick a model.<br /><span>Get into the work.</span></h2>
        </div>
        <div className="marketing-how-copy">
          <p>Use your Google account to create a workspace or return to the one you already have. You can start a chat right away and choose which conversations to save.</p>
          <Link className="marketing-text-link" href="/sign-up">Get started with Google <ArrowRight size={15} /></Link>
        </div>
      </section>

      <footer className="marketing-footer">
        <Link className="marketing-brand" href="/">
          <span className="marketing-brand-mark"><Sparkles size={16} /></span>
          <span>think zone<span className="marketing-brand-ai"> AI</span></span>
        </Link>
        <span>One clear space for your AI work.</span>
        <div><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></div>
      </footer>
    </main>
  );
}
