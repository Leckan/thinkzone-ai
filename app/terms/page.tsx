import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Think Zone AI",
  description: "Terms for access to the Think Zone AI development preview.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These terms cover access to the current Think Zone AI development preview. By using it, you agree to these terms."
    >
      <section>
        <h2>1. The Service and operator</h2>
        <p>Think Zone AI is a product of Think Zone LLC, a United States company registered in Washington State. It is an early development preview for an AI workspace. Features may be incomplete, unavailable, or changed. This build is not ready for customer use; do not rely on it for production work, critical decisions, or live payments.</p>
        <p>Questions about these terms can be sent to <a href="mailto:support@thinkzonellc.com">support@thinkzonellc.com</a>.</p>
        <address>Business address: 2121 6th Ave, #S319, Seattle, WA 98121<br />Mailing address: 2862 Scarborough Cir, Windor Mill, MD 21244</address>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p>You must provide accurate account information, keep your sign-in credentials secure, and promptly tell the operator if you believe your account has been accessed without permission. You are responsible for activity under your account, except where applicable law says otherwise.</p>
        <p>You may not use the Service unlawfully, interfere with its operation or security, attempt to access another person’s account or data, or bypass usage limits and access controls.</p>
      </section>

      <section>
        <h2>3. Prompts, content, and AI responses</h2>
        <p>You retain any rights you have in content you submit. You authorize the Service to host, process, display, and transmit that content as needed to provide the features you choose, including sending prompts and relevant conversation context to the model provider selected for a request.</p>
        <p>AI responses can be inaccurate, incomplete, or unsuitable for your situation. Review them before relying on or sharing them. The Service does not provide professional, legal, medical, financial, or other regulated advice. Do not submit confidential or highly sensitive information in this development preview.</p>
        <p>When a third-party model provider is used, its terms and policies also apply to your use of that provider. The current direct-provider integrations are development-only and disabled in production.</p>
      </section>

      <section>
        <h2>4. Billing and cancellation</h2>
        <p>Billing features may be unavailable or configured for Stripe test mode only. Do not make a live payment through this development preview. If paid features are later offered, the applicable price, billing interval, and renewal terms will be shown at checkout before you confirm.</p>
        <p>Where offered, recurring subscriptions renew at the interval shown at checkout until canceled. Subscription management and cancellation are available through the Stripe Billing Portal when configured. Credit top-ups are one-time purchases unless the checkout page expressly says otherwise. Any refund or cancellation rights required by law remain unaffected.</p>
      </section>

      <section>
        <h2>5. Third-party services</h2>
        <p>The Service may rely on Google for sign-in, Stripe for billing, model providers for AI responses, and operator-configured hosting and database services. Those providers operate under their own terms and privacy notices. The operator is not responsible for third-party services outside its control.</p>
      </section>

      <section>
        <h2>6. Suspension and termination</h2>
        <p>You may stop using the Service at any time. The operator may suspend or end access if reasonably needed to protect the Service, address misuse, comply with law, or discontinue the preview. Saved conversation deletion is available in the workspace; account deletion is not currently available in the app.</p>
      </section>

      <section>
        <h2>7. Disclaimers and limits</h2>
        <p>To the maximum extent allowed by law, the Service is provided “as is” and “as available,” without warranties that it will be uninterrupted, error-free, secure, or suitable for a particular purpose. Nothing in these terms removes a consumer protection or other right that cannot legally be waived.</p>
        <p>To the maximum extent allowed by law, the operator will not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the preview. These terms do not limit liability where applicable law does not permit that limit.</p>
      </section>

      <section>
        <h2>8. Governing law and disputes</h2>
        <p>These terms are governed by the laws of Washington State, United States, except where mandatory consumer-protection laws in your location apply. Any dispute may be brought in a court with proper jurisdiction. Nothing in this section removes a right to bring a claim in a venue required by applicable law.</p>
      </section>

      <section>
        <h2>9. Changes and contact</h2>
        <p>The operator may update these terms as the Service changes. The effective date above will be revised when terms change. Questions about these terms: <a href="mailto:support@thinkzonellc.com">support@thinkzonellc.com</a>.</p>
      </section>
    </LegalPage>
  );
}
