import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Think Zone AI",
  description: "Learn what information Think Zone AI handles and how the development preview uses it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy describes information handled by the current Think Zone AI development preview, including what is sent to model providers and what is saved to your account."
    >
      <section>
        <h2>1. Who operates the service</h2>
        <p>Think Zone AI is a product of Think Zone LLC, a United States company registered in Washington State. “We,” “us,” and “the Service” refer to Think Zone LLC and the Think Zone AI application.</p>
        <p>For privacy requests and questions, email <a href="mailto:support@thinkzonellc.com">support@thinkzonellc.com</a>.</p>
        <address>Business address: 2121 6th Ave, #S319, Seattle, WA 98121<br />Mailing address: 2862 Scarborough Cir, Windor Mill, MD 21244</address>
      </section>

      <section>
        <h2>2. Information the Service handles</h2>
        <ul>
          <li><strong>Account and sign-in information:</strong> name, email address, password hash, account status, and sign-in provider identifiers. If you sign in with Google, the Service stores OAuth account data and encrypted provider tokens. Session records can include an IP address, browser user-agent, and session timestamps.</li>
          <li><strong>Prompts and responses:</strong> messages and model identifiers used to provide chat. Unsaved chats remain in browser state. Choosing Save stores the conversation and messages in the Service database. In mock mode, a short prompt preview is retained in server memory for the development usage view until that process restarts.</li>
          <li><strong>Billing records:</strong> when billing is enabled, the Service stores Stripe customer identifiers, subscription and transaction identifiers, amounts, statuses, and receipt links. Stripe processes payment details; this application does not store full payment card numbers.</li>
          <li><strong>Operational information:</strong> request and error information needed to operate, secure, and troubleshoot the preview. The application does not currently include analytics or advertising scripts.</li>
        </ul>
      </section>

      <section>
        <h2>3. How information is used</h2>
        <p>Information is used to create and secure accounts, provide chat and saved-conversation features, display account and billing information, process transactions, prevent abuse, and maintain the Service. We do not use this preview to serve targeted advertising.</p>
        <p>When a model-provider integration is enabled and you send a prompt, the prompt and relevant conversation context are sent to the provider selected for that request. Depending on configuration, providers may include OpenAI, Anthropic, Google Gemini, OpenRouter, DeepSeek, Groq, or xAI. These integrations are development-only in this build and are disabled in production. The selected provider’s privacy terms govern its handling of information after receipt; review those terms before sending a prompt.</p>
      </section>

      <section>
        <h2>4. When information is shared</h2>
        <p>Information is shared with service providers only as needed to operate a feature you use: Google for Google sign-in, the selected model provider for a submitted prompt, Stripe for checkout and subscription management, and the database or hosting services configured by the operator. Information may also be disclosed when required by law or to protect the Service and its users.</p>
        <p>The Service does not control third-party providers’ independent data practices. Their terms and privacy notices apply to information they receive.</p>
      </section>

      <section>
        <h2>5. Storage and retention</h2>
        <p>Account, authentication, saved-conversation, and billing records are stored in PostgreSQL. Saved transcripts remain in the account until deleted by the user or operator; there is no automatic transcript-retention schedule in this preview. Deleting a saved conversation removes its records from the primary application database. The app does not currently offer self-service account deletion.</p>
        <p>Unstored chats are kept in the current browser page state. The mock usage view may keep a short prompt preview in server memory until the server process restarts. Provider-development chat is not persisted as an application transcript unless you save the conversation.</p>
      </section>

      <section>
        <h2>6. Cookies and account controls</h2>
        <p>Authentication uses session cookies so the Service can keep you signed in and protect account features. The current application code does not add analytics or advertising cookies. You can sign out from the workspace and delete individual saved conversations there. Email verification, password reset, and in-app account deletion are not configured.</p>
        <p>To request access, correction, or deletion of account information, email <a href="mailto:support@thinkzonellc.com">support@thinkzonellc.com</a>. You can delete individual saved conversations in the workspace; account deletion currently requires contacting the company.</p>
      </section>

      <section>
        <h2>7. International processing</h2>
        <p>The operator-configured database, hosting service, and third-party providers may process information in different locations. The Service does not currently publish a complete data-location or international-transfer register. Consult the applicable provider notices for their practices.</p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>The development preview is not designed for children. If you believe a child has provided personal information to the Service, email <a href="mailto:support@thinkzonellc.com">support@thinkzonellc.com</a>.</p>
      </section>

      <section>
        <h2>9. Changes and contact</h2>
        <p>This policy may be updated as the Service changes. The effective date above will be revised when a material update is made. For privacy questions, contact <a href="mailto:support@thinkzonellc.com">support@thinkzonellc.com</a>.</p>
      </section>
    </LegalPage>
  );
}
