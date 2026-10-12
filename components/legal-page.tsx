import Link from "next/link";
import { ArrowLeft, Facebook, Instagram, Linkedin, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link className="marketing-brand" href="/" aria-label="Think Zone AI home">
          <span className="marketing-brand-mark"><Sparkles size={17} /></span>
          <span>think zone<span className="marketing-brand-ai"> AI</span></span>
        </Link>
        <nav className="legal-nav" aria-label="Legal pages">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link className="legal-back-link" href="/"><ArrowLeft size={14} /> Home</Link>
        </nav>
      </header>

      <article className="legal-document">
        <p className="legal-eyebrow">Think Zone AI · Legal</p>
        <h1>{title}</h1>
        <p className="legal-meta">Effective October 11, 2026</p>
        <p className="legal-summary">{summary}</p>
        <aside className="legal-preview-note">
          <strong>Alpha stage:</strong> Think Zone AI is in active development; features may be incomplete or change. Review these pages against the product’s actual practices before public launch.
        </aside>
        <div className="legal-content">{children}</div>
      </article>

      <footer className="legal-footer">
        <div className="legal-footer-brand">
          <span>Think Zone AI <span aria-hidden="true">·</span> A Think Zone LLC product</span>
          <span>Founded by <a href="https://www.linkedin.com/in/leckan/" target="_blank" rel="noopener noreferrer">Ahmed Mustapha</a></span>
        </div>
        <div className="legal-footer-actions">
          <nav aria-label="Legal pages">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <a href="mailto:support@thinkzonellc.com">Contact</a>
          </nav>
          <nav className="legal-social-links" aria-label="Think Zone LLC social media">
            <a href="https://www.linkedin.com/company/think-zone-llc/" target="_blank" rel="noopener noreferrer" aria-label="Think Zone LLC on LinkedIn" title="LinkedIn"><Linkedin size={16} aria-hidden="true" /></a>
            <a href="https://www.facebook.com/thinkzone.tech" target="_blank" rel="noopener noreferrer" aria-label="Think Zone LLC on Facebook" title="Facebook"><Facebook size={16} aria-hidden="true" /></a>
            <a href="https://www.instagram.com/thinkzone.tech/" target="_blank" rel="noopener noreferrer" aria-label="Think Zone LLC on Instagram" title="Instagram"><Instagram size={16} aria-hidden="true" /></a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
