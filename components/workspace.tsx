"use client";

import {
  Activity, Archive, ArrowDownRight, ArrowUpRight, Bell, Brain, Check, ChevronDown,
  ChevronRight, CircleHelp, Code2, Coins, CreditCard, FileText, Gauge,
  LayoutDashboard, LoaderCircle, LockKeyhole, Menu, MessageSquare, MoreHorizontal,
  Pencil, Plus, RotateCcw, Send, Settings2, ShieldCheck, Sparkles, Square, Trash2, Wallet, X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { modelCatalog } from "@/lib/ai/catalog";
import { formatTzc } from "@/lib/credits/accounting";
import { GoogleAuthControl } from "@/components/google-auth-control";
import { BillingPanel } from "@/components/billing-panel";
import { MarkdownContent } from "@/components/markdown-content";

type Screen = "Overview" | "New chat" | "Conversations" | "Model catalog" | "Usage & credits" | "Subscription" | "Developer API" | "Settings";
type RuntimeMode = "loading" | "development-mock" | "direct-provider-development" | "unavailable";
type WorkspaceModel = {
  id: string;
  name: string;
  providerName: string;
  description?: string;
  contextTokens?: number;
  accent?: "violet" | "blue" | "amber";
  capability?: string;
  speed?: string;
};
type UsageRow = {
  requestId: string;
  modelId: string;
  promptPreview: string;
  inputTokens: number;
  outputTokens: number;
  providerCostNanoUsd: string;
  customerChargeAtoms: string;
  status: "simulated";
  createdAt: number;
};
type Overview = {
  mode: "development-mock";
  wallet: {
    availableAtoms: string;
    reservedAtoms: string;
    lots: Array<{ id: string; source: string; remainingAtoms: string; reservedAtoms: string }>;
  };
  usage: UsageRow[];
  ledger: Array<{ id: string; kind: string; atomsDelta: string; source: string; referenceId: string; createdAt: number }>;
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  modelId?: string;
  providerName?: string;
  persistable?: boolean;
  truncated?: boolean;
  streamWarning?: string;
  usage?: { inputTokens: number | null; outputTokens: number | null; customerChargeAtoms?: string; status: string };
};
type SavedConversation = {
  id: string;
  title: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

const mockWorkspaceModels: WorkspaceModel[] = modelCatalog.map((model) => ({
  id: model.id,
  name: model.name,
  providerName: model.provider,
  description: model.description,
  contextTokens: model.contextTokens,
  accent: model.accent,
  capability: model.capability,
  speed: model.speed,
}));

const navGroups: Array<{ label: string; items: Array<{ label: Screen; icon: typeof LayoutDashboard }> }> = [
  { label: "Workspace", items: [{ label: "Overview", icon: LayoutDashboard }, { label: "New chat", icon: MessageSquare }, { label: "Conversations", icon: FileText }, { label: "Model catalog", icon: Brain }] },
  { label: "Manage", items: [{ label: "Usage & credits", icon: Activity }, { label: "Subscription", icon: CreditCard }, { label: "Developer API", icon: Code2 }] },
];

const suggestions = [
  { title: "Plan a focused week", prompt: "Help me turn a busy week into a focused, realistic plan." },
  { title: "Make an idea clearer", prompt: "Give me a simple framework for turning a rough idea into a clear plan." },
  { title: "Review a code change", prompt: "What should I check before merging a small code change?" },
  { title: "Draft a thoughtful email", prompt: "Help me write a concise, warm follow-up email after a meeting." },
];

function formatUsdFromNano(nano: string): string {
  const amount = BigInt(nano);
  const dollars = amount / 1_000_000_000n;
  const fraction = (amount % 1_000_000_000n).toString().padStart(9, "0").slice(0, 6).replace(/0+$/, "");
  return `$${dollars.toString()}${fraction ? `.${fraction}` : ".00"}`;
}

function modelName(id: string, models: WorkspaceModel[] = mockWorkspaceModels): string {
  return models.find((model) => model.id === id)?.name ?? id;
}

function shortDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function Workspace({ googleOAuthEnabled }: { googleOAuthEnabled: boolean }) {
  const [screen, setScreen] = useState<Screen>("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("loading");
  const [availableModels, setAvailableModels] = useState<WorkspaceModel[]>(mockWorkspaceModels);
  const [modelError, setModelError] = useState("");
  const [modelId, setModelId] = useState(modelCatalog[0].id);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [conversationArchivedAt, setConversationArchivedAt] = useState<string | null>(null);
  const [conversationHasMoreMessages, setConversationHasMoreMessages] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationBusy, setConversationBusy] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [conversationNotice, setConversationNotice] = useState("");
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [markdownView, setMarkdownView] = useState<"rendered" | "source">("rendered");
  const [isSending, setIsSending] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const refreshOverview = useCallback(async () => {
    if (runtimeMode !== "development-mock") return;
    try {
      const response = await fetch("/api/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("Local demo API is unavailable.");
      const data = (await response.json()) as Overview;
      setOverview(data);
      setOverviewError("");
    } catch {
      setOverviewError("Start the app with AI_PROVIDER_MODE=mock to use the local demo wallet.");
    }
  }, [runtimeMode]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/models", { cache: "no-store" });
        if (!response.ok) throw new Error("Local model catalog is unavailable.");
        const data = await response.json() as {
          mode: RuntimeMode;
          models: Array<WorkspaceModel & { provider?: string }>;
          unavailableProviders: string[];
        };
        const models = data.models.map((model) => ({ ...model, providerName: model.providerName ?? model.provider ?? "Provider" }));
        setRuntimeMode(data.mode);
        setAvailableModels(models);
        setModelId((current) => models.some((model) => model.id === current) ? current : models[0]?.id ?? "");
        setModelError(data.unavailableProviders.length
          ? `No chat models were returned by: ${data.unavailableProviders.join(", ")}. Check those API keys and provider model access.`
          : models.length ? "" : "No configured provider returned any chat models.");
      } catch {
        setRuntimeMode("unavailable");
        setModelError("The model catalog is unavailable. Check the local server configuration.");
      }
    })();
  }, []);

  useEffect(() => {
    if (runtimeMode === "development-mock") void refreshOverview();
    if (runtimeMode === "direct-provider-development") {
      setOverview(null);
      setOverviewError("");
    }
  }, [runtimeMode, refreshOverview]);
  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const refreshConversations = useCallback(async (showArchived = includeArchived) => {
    setConversationsLoading(true);
    setConversationError("");
    try {
      const response = await fetch(`/api/conversations${showArchived ? "?includeArchived=true" : ""}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as { conversations?: SavedConversation[]; error?: string };
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in with Google to save and view conversations." : data.error ?? "Could not load saved conversations.");
      setSavedConversations(data.conversations ?? []);
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Could not load saved conversations.");
      setSavedConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    if (screen === "Conversations") void refreshConversations();
  }, [screen, includeArchived, refreshConversations]);

  const availableAtoms = BigInt(overview?.wallet.availableAtoms ?? "4800000");
  const reservedAtoms = BigInt(overview?.wallet.reservedAtoms ?? "0");
  const usedAtoms = useMemo(() => (overview?.usage ?? []).reduce((sum, row) => sum + BigInt(row.customerChargeAtoms), 0n), [overview]);
  const usageCount = overview?.usage.length ?? 0;

  const openScreen = (next: Screen) => {
    if (next === "New chat" && !conversationId && messages.some((message) => message.persistable !== false && message.content.trim())) {
      const shouldDiscard = window.confirm("Start a new chat? This transcript has not been saved and will be cleared.");
      if (!shouldDiscard) return;
    }
    setScreen(next);
    setMobileNavOpen(false);
    if (next === "New chat") {
      setMessages([]);
      setConversationId(null);
      setConversationTitle("");
      setConversationArchivedAt(null);
      setConversationHasMoreMessages(false);
      setConversationError("");
      setConversationNotice("");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const sendPrompt = async (value = prompt) => {
    const clean = value.trim();
    if (!clean || isSending || conversationArchivedAt) return;
    const assistantId = crypto.randomUUID();
    const userMessageId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const controller = new AbortController();
    abortRef.current = controller;
    setPrompt("");
    setScreen("New chat");
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: clean, createdAt: Date.now(), modelId },
      { id: assistantId, role: "assistant", content: "", createdAt: Date.now(), modelId },
    ]);
    setIsSending(true);

    try {
      if (conversationId) {
        const savedUser = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "user", content: clean }),
          signal: controller.signal,
        });
        if (!savedUser.ok) {
          const problem = await savedUser.json().catch(() => ({})) as { error?: string };
          throw new Error(problem.error ?? "Could not save your message. The provider was not called.");
        }
      }

      const history = conversationId ? undefined : messages
        .filter((message) => message.persistable !== false && message.content.trim())
        .slice(-24)
        .map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clean, modelId, idempotencyKey, ...(conversationId ? { conversationId } : { history }) }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const problem = (await response.json().catch(() => ({ error: "The request could not be started." }))) as { error?: string };
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: problem.error ?? "The request could not be started.", persistable: false } : message));
        if (conversationId) void refreshConversations();
        await refreshOverview();
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming responses are not available in this browser.");
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      let assistantText = "";
      let responseFailed = false;
      const handleFrame = (frame: string) => {
        const line = frame.split("\n").find((part) => part.startsWith("data: "));
        if (!line) return;
        const data = JSON.parse(line.slice(6)) as {
          type: string;
          text?: string;
          error?: string;
          provider?: string;
          mode?: string;
          finishReason?: string;
          usage?: { inputTokens: number | null; outputTokens: number | null; customerChargeAtoms?: string; status: string };
        };
        if (data.type === "delta" && data.text) {
          assistantText += data.text;
          setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + data.text } : message));
        } else if (data.type === "done" && data.usage) {
          completed = true;
          setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, providerName: data.provider, truncated: data.finishReason === "length", usage: data.usage } : message));
        } else if (data.type === "error") {
          responseFailed = true;
          const errorMessage = data.error ?? "The response failed.";
          setMessages((current) => current.map((message) => message.id === assistantId ? {
            ...message,
            content: assistantText ? message.content : errorMessage,
            streamWarning: assistantText ? errorMessage : undefined,
            persistable: false,
          } : message));
        }
      };
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) handleFrame(frame);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleFrame(buffer);
      if (controller.signal.aborted) responseFailed = true;
      if (!completed && !controller.signal.aborted) {
        responseFailed = true;
        setMessages((current) => current.map((message) => message.id === assistantId ? {
          ...message,
          content: message.content || "The response ended before completion details arrived. Check the provider account before retrying.",
          streamWarning: message.content ? "The connection ended before the provider confirmed the response was complete." : undefined,
          persistable: false,
        } : message));
      }
      if (conversationId && assistantText && !responseFailed) {
        const savedAssistant = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: assistantText }),
        });
        if (!savedAssistant.ok) setConversationError("The reply arrived, but Think Zone could not save it to this conversation.");
      }
      if (conversationId) void refreshConversations();
      await refreshOverview();
    } catch (error) {
      const wasAborted = error instanceof DOMException && error.name === "AbortError";
      const failureMessage = error instanceof Error ? error.message : "The response could not be completed. Refresh usage before retrying.";
      if (wasAborted) {
        const stopMessage = runtimeMode === "direct-provider-development"
          ? "Generation stopped. The provider may still bill tokens it processed before cancellation."
          : "Generation stopped. The local demo reservation was released.";
        setMessages((current) => current.map((message) => message.id === assistantId ? {
          ...message,
          content: message.content || stopMessage,
          streamWarning: message.content ? "Generation was stopped before the response was complete." : undefined,
          persistable: false,
        } : message));
      } else {
        setConversationError(failureMessage);
        setMessages((current) => current.map((message) => message.id === assistantId ? {
          ...message,
          content: message.content || failureMessage,
          streamWarning: message.content ? failureMessage : undefined,
          persistable: false,
        } : message));
      }
      if (conversationId) void refreshConversations();
      await refreshOverview();
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  };

  const saveCurrentConversation = async () => {
    const transcript = messages.filter((message) => message.persistable !== false && message.content.trim()).map(({ role, content }) => ({ role, content }));
    if (!transcript.length || conversationBusy) return;
    setConversationBusy(true);
    setConversationError("");
    setConversationNotice("");
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript }),
      });
      const data = await response.json().catch(() => ({})) as { conversation?: SavedConversation; error?: string };
      if (!response.ok || !data.conversation) throw new Error(response.status === 401 ? "Sign in with Google to save conversations." : data.error ?? "Could not save this conversation.");
      setConversationId(data.conversation.id);
      setConversationTitle(data.conversation.title);
      setConversationArchivedAt(null);
      setConversationNotice("Conversation saved to your account.");
      setScreen("New chat");
      await refreshConversations();
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Could not save this conversation.");
    } finally {
      setConversationBusy(false);
    }
  };

  const openSavedConversation = async (id: string) => {
    setConversationBusy(true);
    setConversationError("");
    setConversationNotice("");
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as {
        conversation?: { id: string; title: string; archivedAt: string | null };
        messages?: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>;
        hasMoreMessages?: boolean;
        error?: string;
      };
      if (!response.ok || !data.conversation) throw new Error(response.status === 401 ? "Sign in with Google to view saved conversations." : data.error ?? "Could not open this conversation.");
      setConversationId(data.conversation.id);
      setConversationTitle(data.conversation.title);
      setConversationArchivedAt(data.conversation.archivedAt);
      setConversationHasMoreMessages(data.hasMoreMessages === true);
      setMessages((data.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt).getTime(),
        modelId,
      })));
      setScreen("New chat");
      setMobileNavOpen(false);
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Could not open this conversation.");
    } finally {
      setConversationBusy(false);
    }
  };

  const updateSavedConversation = async (id: string, update: { title?: string; archived?: boolean }) => {
    setConversationBusy(true);
    setConversationError("");
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await response.json().catch(() => ({})) as { conversation?: SavedConversation; error?: string };
      if (!response.ok || !data.conversation) throw new Error(data.error ?? "Could not update this conversation.");
      if (conversationId === id) {
        setConversationTitle(data.conversation.title);
        setConversationArchivedAt(data.conversation.archivedAt);
      }
      setRenamingConversationId(null);
      setConversationNotice(update.archived ? "Conversation archived." : update.title ? "Conversation renamed." : "Conversation restored.");
      await refreshConversations();
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Could not update this conversation.");
    } finally {
      setConversationBusy(false);
    }
  };

  const deleteSavedConversation = async (id: string) => {
    if (!window.confirm("Delete this saved conversation and its messages permanently?")) return;
    setConversationBusy(true);
    setConversationError("");
    try {
      const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete this conversation.");
      if (conversationId === id) {
        setConversationId(null);
        setConversationTitle("");
        setConversationArchivedAt(null);
        setConversationHasMoreMessages(false);
        setMessages([]);
      }
      setConversationNotice("Conversation deleted.");
      await refreshConversations();
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Could not delete this conversation.");
    } finally {
      setConversationBusy(false);
    }
  };

  const stopGeneration = () => abortRef.current?.abort();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendPrompt(); };
  const renderMarkdownToggle = () => (
    <button
      className={`markdown-toggle ${markdownView === "source" ? "active" : ""}`}
      type="button"
      aria-label={markdownView === "rendered" ? "Show Markdown source" : "Show formatted Markdown"}
      aria-pressed={markdownView === "source"}
      title={markdownView === "rendered" ? "Show Markdown source" : "Show formatted Markdown"}
      onClick={() => setMarkdownView((view) => view === "rendered" ? "source" : "rendered")}
    >
      <Code2 size={13} />
      {markdownView === "rendered" ? "Source" : "Rendered"}
    </button>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={18} strokeWidth={2.1} /></div>
          <div><div className="brand-name">think zone</div><div className="brand-sub">AI workspace</div></div>
        </div>
        <button className="workspace-switcher" type="button" aria-label="Personal workspace">
          <span className="workspace-glyph"><LayersIcon /></span>
          <span className="workspace-copy"><span className="workspace-title">Personal workspace</span><span className="workspace-caption">Signed-in account</span></span>
          <ChevronDown size={14} color="#9292a9" />
        </button>
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="nav-label">{group.label}</div>
            <nav className="nav-list" aria-label={group.label}>
              {group.items.map(({ label, icon: Icon }) => (
                <button key={label} type="button" className={`nav-item ${screen === label ? "active" : ""}`} aria-current={screen === label ? "page" : undefined} onClick={() => openScreen(label)}>
                  <span className="nav-icon"><Icon size={15} strokeWidth={1.8} /></span><span>{label}</span>
                  {label === "New chat" && <Plus size={13} className="nav-trailing" />}
                </button>
              ))}
            </nav>
            {group.label === "Workspace" && <div className="nav-divider" />}
          </div>
        ))}
        <div className="nav-divider" />
        <nav className="nav-list" aria-label="Account">
          <button type="button" className={`nav-item ${screen === "Settings" ? "active" : ""}`} onClick={() => openScreen("Settings")}><span className="nav-icon"><Settings2 size={15} /></span><span>Settings</span></button>
          <button type="button" className="nav-item" onClick={() => openScreen("Developer API")}><span className="nav-icon"><CircleHelp size={15} /></span><span>Help & documentation</span></button>
        </nav>
        <div className="sidebar-spacer" />
        {runtimeMode === "direct-provider-development" ? <div className="credit-mini">
          <div className="credit-mini-head"><span>DIRECT PROVIDER</span><Zap size={13} /></div>
          <div className="credit-mini-value" style={{ fontSize: 15 }}>Provider billed</div>
          <div className="credit-mini-foot"><span>No TZC wallet charge</span><button className="text-link" type="button" onClick={() => openScreen("Usage & credits")}>Details <ArrowUpRight size={10} style={{ verticalAlign: "-2px" }} /></button></div>
        </div> : <div className="credit-mini">
          <div className="credit-mini-head"><span>DEMO CREDITS</span><Coins size={13} /></div>
          <div className="credit-mini-value">{formatTzc(availableAtoms)} <span style={{ fontSize: 10, color: "#aaaabd", fontWeight: 500 }}>TZC</span></div>
          <div className="credit-mini-foot"><span>Sample balance</span><button className="text-link" type="button" onClick={() => openScreen("Usage & credits")}>View usage <ArrowUpRight size={10} style={{ verticalAlign: "-2px" }} /></button></div>
        </div>}
        <div className="profile-row">
          <div className="avatar">TZ</div><div style={{ flex: 1 }}><div className="profile-name">Signed-in account</div><div className="profile-role">Personal workspace</div></div><MoreHorizontal size={16} color="#9292a4" />
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={15} /></button>
            <div className="crumbs"><span>Think Zone AI</span><ChevronRight size={12} /><strong>{screen}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-tag"><span style={{ width: 6, height: 6, borderRadius: 8, background: runtimeMode === "direct-provider-development" ? "#58a67b" : "#d2a94f" }} />{runtimeMode === "direct-provider-development" ? "Direct provider development" : "Local development demo"}</div>
            <button className="icon-button" aria-label="Notifications" type="button" title="Notifications are not enabled in this demo"><Bell size={15} /></button>
            {googleOAuthEnabled ? <GoogleAuthControl enabled={googleOAuthEnabled} /> : <div className="topbar-avatar" aria-label="Signed-in account">TZ</div>}
          </div>
        </header>

        <main className={`content ${screen === "New chat" ? "content-narrow" : ""}`}>
          {runtimeMode === "direct-provider-development" ? <div className="demo-banner"><ShieldCheck size={15} style={{ flex: "0 0 auto", marginTop: 1 }} /><span><strong>Direct provider development mode.</strong> Sign in with Google before submitting a prompt. Prompts go to the selected provider using its server-side API key. The provider bills that key’s account; Think Zone does not deduct TZC or calculate a customer charge. Chats stay in this browser unless you explicitly save them; saved transcripts are stored in your account.</span></div> : runtimeMode === "development-mock" ? <div className="demo-banner"><ShieldCheck size={15} style={{ flex: "0 0 auto", marginTop: 1 }} /><span><strong>Development mode.</strong> Chat uses a simulated model and sample credits held in memory. No external AI provider, account, or payment service is connected; sample balances reset when the local server restarts.</span></div> : <div className="demo-banner"><ShieldCheck size={15} style={{ flex: "0 0 auto", marginTop: 1 }} /><span><strong>Loading local provider configuration.</strong> No prompt is sent until you submit a chat message.</span></div>}
          {overviewError && <div className="notice-panel" role="status">{overviewError}</div>}
          {modelError && <div className="notice-panel" role="status">{modelError}</div>}
          {conversationError && <div className="conversation-alert" role="alert">{conversationError}</div>}
          {conversationNotice && <div className="conversation-notice" role="status">{conversationNotice}</div>}
          {screen === "New chat" ? renderChat() : screen === "Overview" ? renderOverview() : screen === "Usage & credits" ? renderUsage() : screen === "Model catalog" ? renderCatalog() : screen === "Conversations" ? renderConversations() : screen === "Subscription" ? renderSubscription() : screen === "Developer API" ? renderDeveloper() : renderSettings()}
        </main>
      </div>
    </div>
  );

  function renderHeading(title: string, subtitle: string, action?: React.ReactNode) {
    return <div className="page-heading"><div><div className="eyebrow">Your workspace</div><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>;
  }

  function renderMetric(label: string, value: string, suffix: string, detail: string, icon: React.ReactNode, positive = false) {
    return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}<small>{suffix}</small></div><div className={`metric-foot ${positive ? "positive" : ""}`}>{positive ? <ArrowDownRight size={12} /> : <Activity size={11} />}{detail}</div></article>;
  }

  function renderOverview() {
    if (runtimeMode === "direct-provider-development") {
      const providerCount = new Set(availableModels.map((model) => model.providerName)).size;
      return <>
        {renderHeading("Your provider workspace", "Use your configured provider accounts to explore live model responses.", <button type="button" className="button-primary" onClick={() => openScreen("New chat")} disabled={!availableModels.length}><Plus size={14} /> Start a chat</button>)}
        <div className="metrics-grid">
          {renderMetric("Providers with models", String(providerCount), "available", "Catalog entries returned", <Brain size={15} />)}
          {renderMetric("Available models", String(availableModels.length), "chat models", "Fetched from provider catalogs", <Sparkles size={15} />, true)}
          {renderMetric("Think Zone credits", "Not used", "direct mode", "No platform wallet deduction", <Wallet size={15} />)}
          {renderMetric("Usage history", "In chat", "this page", "Not persisted by this development path", <Activity size={15} />)}
        </div>
        <section className="panel screen-panel"><div className="panel-head"><div><div className="panel-title">Direct provider requests</div><div className="panel-caption">Each submitted prompt is sent to the selected provider.</div></div><span className="topbar-tag">Local development only</span></div><p className="page-subtitle" style={{ lineHeight: 1.7, margin: 0 }}>Provider usage tokens are shown on completed chat replies when the provider returns them. Costs are billed by the provider to the account behind that API key. Think Zone does not estimate cost, deduct credits, or persist these requests in this mode.</p></section>
      </>;
    }
    const newest = overview?.usage.slice(0, 4) ?? [];
    return <>
      {renderHeading("A calmer way to work with AI", "Your models, conversations, and credit usage in one place.", <button type="button" className="button-primary" onClick={() => openScreen("New chat")}><Plus size={14} /> Start a chat</button>)}
      <div className="metrics-grid">
        {renderMetric("Available demo credits", formatTzc(availableAtoms), "TZC", "Sample credits · not redeemable", <Wallet size={15} />)}
        {renderMetric("Simulated requests", String(usageCount), "this session", "Resets with the local server", <Zap size={15} />, true)}
        {renderMetric("Credits reserved", formatTzc(reservedAtoms), "TZC", "Requests currently in progress", <LockKeyhole size={14} />)}
        {renderMetric("Simulated spend", formatTzc(usedAtoms), "TZC", "Development metering only", <Activity size={15} />)}
      </div>
      <div className="overview-layout">
        <section className="panel">
          <div className="panel-head"><div><div className="panel-title">Credit wallet</div><div className="panel-caption">A sample balance for trying the local flow</div></div><button className="button-secondary" type="button" onClick={() => openScreen("Usage & credits")}>View details <ChevronRight size={13} /></button></div>
          <div className="wallet-breakdown">
            <div className="eyebrow" style={{ letterSpacing: ".06em" }}>AVAILABLE BALANCE</div>
            <div className="balance-large">{formatTzc(availableAtoms)} <span style={{ color: "#8e90a0", fontSize: 14, letterSpacing: 0 }}>TZC</span></div>
            <div className="balance-note">Credits are sample data and have no cash value.</div>
            <div className="balance-progress" aria-label="Sample credit balance"><span /></div>
            <div className="legend-list">
              <div className="legend-row"><span className="legend-label"><i className="legend-dot" />Development sample grant</span><span className="legend-value">{formatTzc(availableAtoms + usedAtoms)} TZC issued</span></div>
              <div className="legend-row"><span className="legend-label"><i className="legend-dot green" />Simulated charges</span><span className="legend-value">{formatTzc(usedAtoms)} TZC</span></div>
              <div className="legend-row"><span className="legend-label"><i className="legend-dot gray" />Current reservations</span><span className="legend-value">{formatTzc(reservedAtoms)} TZC</span></div>
            </div>
          </div>
        </section>
        <section className="quick-start">
          <div className="eyebrow">A good place to begin</div>
          <h2>Give your next idea a little room.</h2>
          <p>Start a local chat and see how model selection, usage, and credit metering fit together.</p>
          <form className="quick-start-action" onSubmit={(event) => { event.preventDefault(); void sendPrompt(); }}>
            <input aria-label="Start a demo prompt" placeholder="Ask a question…" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            <button type="submit" aria-label="Send prompt"><Send size={14} /></button>
          </form>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-head"><div><div className="panel-title">Recent activity</div><div className="panel-caption">Latest simulated requests from this local session</div></div><button className="button-secondary" type="button" onClick={() => openScreen("Usage & credits")}>All usage <ArrowUpRight size={12} /></button></div>
        {newest.length ? renderUsageTable(newest) : <div className="empty-state"><Activity className="empty-icon" size={19} /><div>No requests yet. Start a demo chat to see usage here.</div></div>}
      </section>
    </>;
  }

  function renderChat() {
    const selectedModel = availableModels.find((model) => model.id === modelId);
    if (!selectedModel) return <section className="panel empty-state" style={{ padding: 50 }}><Brain className="empty-icon" size={21} /><div>No chat model is available.</div><p style={{ margin: "7px 0 0" }}>{modelError || "Check the provider credentials and model catalog."}</p></section>;
    return <section className="panel chat-card">
      <div className="chat-toolbar"><div className="model-select-wrap"><span className={`model-card-icon ${selectedModel.accent ?? "violet"}`} style={{ width: 29, height: 29 }}><Sparkles size={14} /></span><select aria-label="Choose model" value={modelId} onChange={(event) => setModelId(event.target.value)} disabled={Boolean(conversationArchivedAt)}>{availableModels.map((model) => <option key={model.id} value={model.id}>{model.name} · {model.providerName}</option>)}</select><div className="model-detail"><span style={{ color: "#80b396" }}>●</span> {conversationId ? conversationTitle : runtimeMode === "direct-provider-development" ? selectedModel.providerName : "Simulated · development only"}</div></div><div className="chat-toolbar-actions">{renderMarkdownToggle()}{messages.some((message) => message.persistable !== false && message.content.trim()) && !conversationId && <button className="button-secondary save-conversation-button" type="button" onClick={() => void saveCurrentConversation()} disabled={isSending || conversationBusy}><FileText size={13} /> Save</button>}<button className="icon-button" type="button" aria-label="New conversation" title="Start a new conversation" onClick={() => openScreen("New chat")}><Plus size={15} /></button></div></div>
      {conversationArchivedAt && <div className="conversation-archive-banner"><Archive size={14} /> This conversation is archived and read-only. Restore it from the Conversations page to continue.</div>}
      {conversationHasMoreMessages && <div className="conversation-history-note" role="status">Showing the latest 200 messages. Older messages remain saved.</div>}
      <div className="chat-messages" ref={messagesRef}>
        {messages.length === 0 ? <div className="chat-welcome"><div className="welcome-spark"><Sparkles size={23} /></div><h2>What would you like to think through?</h2><p>{runtimeMode === "direct-provider-development" ? `Choose a live model. Prompts go to ${selectedModel.providerName} and are billed to the API key owner.` : "Choose a simulated model, send a prompt, and inspect the demo usage charge. Nothing is sent to an external provider."}</p><div className="suggestion-grid">{suggestions.map((item) => <button className="suggestion" key={item.title} type="button" onClick={() => void sendPrompt(item.prompt)}><strong>{item.title}</strong>{item.prompt}</button>)}</div></div> : messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}>
          {message.role === "assistant" && <span className="message-avatar"><Sparkles size={14} /></span>}
          <div><div className="message-content">{message.content ? <MarkdownContent content={message.content} view={markdownView} isStreaming={isSending && message.id === messages[messages.length - 1]?.id} className="markdown-response" /> : isSending && message.role === "assistant" ? <span style={{ color: "#999" }}><LoaderCircle size={13} className="spin" /> Thinking…</span> : null}</div>
            {message.role === "assistant" && (message.usage || message.content) && <div className="message-meta"><span>{modelName(message.modelId ?? modelId, availableModels)}</span>{message.usage && (runtimeMode === "direct-provider-development"
              ? <><span>·</span><span>{message.usage.status === "provider-reported" && message.usage.inputTokens != null && message.usage.outputTokens != null ? `${(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} provider-reported tokens` : "Provider usage unavailable"}</span><span>·</span><span>Provider billed directly</span></>
              : <><span>·</span><span>{(message.usage.inputTokens ?? 0) + (message.usage.outputTokens ?? 0)} simulated tokens</span><span>·</span><span>{message.usage.customerChargeAtoms ? `${formatTzc(BigInt(message.usage.customerChargeAtoms))} TZC demo charge` : "No charge details"}</span></>)}</div>}
            {message.truncated && <div className="message-stream-warning" role="status">This reply reached the model&apos;s output limit. Ask it to continue for the rest.</div>}
            {message.streamWarning && <div className="message-stream-warning" role="status">{message.streamWarning}</div>}
          </div>
          {message.role === "user" && <span className="message-avatar user-avatar">TZ</span>}
        </div>)}
      </div>
      <div className="chat-composer">
        <form onSubmit={handleSubmit}>
          <div className="composer-box"><textarea ref={inputRef} aria-label="Message" placeholder={conversationArchivedAt ? "Restore this conversation to continue…" : "Message Think Zone…"} value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4_000} disabled={isSending || Boolean(conversationArchivedAt)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!isSending) void sendPrompt(); } }} />
            {isSending ? <button className="send-button stop" type="button" aria-label="Stop response" title="Stop response" onClick={stopGeneration}><Square size={13} fill="currentColor" /></button> : <button className="send-button" type="submit" aria-label="Send message" disabled={!prompt.trim()}><Send size={14} /></button>}
          </div>
        </form>
        <div className="composer-foot"><span>Enter to send · Shift + Enter for a new line</span><span>{runtimeMode === "direct-provider-development" ? "Provider billed directly · no TZC charge" : "Mock response · no provider connection"}</span></div>
      </div>
    </section>;
  }

  function renderUsageTable(rows: UsageRow[]) {
    return <div className="table-wrap"><table className="usage-table"><thead><tr><th>MODEL</th><th>DATE</th><th>TOKENS</th><th>PROVIDER COST</th><th>DEMO CHARGE</th><th>STATUS</th></tr></thead><tbody>{rows.map((row) => <tr key={row.requestId}>
      <td><div className="model-cell"><span className="model-glyph"><Sparkles size={12} /></span>{modelName(row.modelId)}</div></td><td>{shortDate(row.createdAt)}</td><td>{(row.inputTokens + row.outputTokens).toLocaleString()}</td><td>{formatUsdFromNano(row.providerCostNanoUsd)} <span style={{ color: "#a0a2ae" }}>simulated</span></td><td>{formatTzc(BigInt(row.customerChargeAtoms))} TZC</td><td><span className="status-pill"><span>●</span> Simulated</span></td>
    </tr>)}</tbody></table></div>;
  }

  function renderUsage() {
    if (runtimeMode === "direct-provider-development") {
      return <>
        {renderHeading("Usage & credits", "Provider usage is reported per response in the current chat.")}
        <section className="panel screen-panel"><div className="panel-head"><div><div className="panel-title">Direct provider usage</div><div className="panel-caption">This development path does not write to Think Zone’s wallet or usage ledger.</div></div><span className="topbar-tag">Not persisted</span></div><p className="page-subtitle" style={{ lineHeight: 1.7, margin: 0 }}>When available, the provider’s input and output token counts appear beneath each completed assistant response. Review the selected provider’s console for authoritative costs and invoices. A stopped or interrupted request may still incur provider charges.</p><button className="button-primary" type="button" style={{ marginTop: 18 }} onClick={() => openScreen("New chat")} disabled={!availableModels.length}><Plus size={14} /> Start a chat</button></section>
      </>;
    }
    const rows = overview?.usage ?? [];
    const recentCharges = rows.reduce((sum, row) => sum + BigInt(row.customerChargeAtoms), 0n);
    return <>
      {renderHeading("Usage & credits", "Inspect the local demo ledger and simulated request activity.", <button className="button-secondary" type="button" onClick={() => void refreshOverview()}><Activity size={13} /> Refresh</button>)}
      <div className="usage-summary">
        {renderMetric("Available credits", formatTzc(availableAtoms), "TZC", "Sample development balance", <Wallet size={15} />)}
        {renderMetric("Current reservations", formatTzc(reservedAtoms), "TZC", "Released or settled after response", <LockKeyhole size={14} />)}
        {renderMetric("Demo charges", formatTzc(recentCharges), "TZC", `${rows.length} simulated requests`, <Coins size={15} />)}
      </div>
      <section className="panel screen-panel"><div className="panel-head"><div><div className="panel-title">Requests</div><div className="panel-caption">Mock usage is estimated from text length; no provider supplied these counts.</div></div><span className="topbar-tag">This local session</span></div>{rows.length ? renderUsageTable(rows) : <div className="empty-state"><Activity className="empty-icon" size={20} /><div>No metered requests yet.</div><p style={{ margin: "6px 0 0" }}>Start a new chat to create a clearly labeled simulated usage entry.</p></div>}</section>
      <div className="notice-panel"><strong>How demo metering works.</strong> The local flow reserves credits before generating a simulated response, estimates input and output tokens from character counts, calculates a sample provider cost from a mock rate card, then settles the reservation. These estimates are for interface testing only and are not provider usage, prices, or a bill.</div>
    </>;
  }

  function renderCatalog() {
    if (runtimeMode === "direct-provider-development") {
      return <>
        {renderHeading("Model catalog", "Available chat models fetched from your configured providers.")}
        <div className="notice-panel" style={{ marginTop: 0 }}><strong>Development access only.</strong> Requests use the configured provider account and are billed there. Commercial eligibility, provider rate cards, persistent metering, and customer billing have not been approved or implemented.</div>
        <div className="model-grid">{availableModels.map((model) => <article className="panel model-card" key={model.id}>
          <div className="model-card-head"><div className={`model-card-icon ${model.accent ?? "violet"}`}><Sparkles size={17} /></div><span className="status-pill">Direct provider</span></div>
          <div className="model-name">{model.name}</div><div className="model-provider">{model.providerName}</div>
          <p className="model-description">{model.description ?? "Listed by the provider API. Model capabilities and pricing should be verified before commercial use."}</p>
          <div className="model-tags">{model.contextTokens ? <span className="model-tag">{model.contextTokens.toLocaleString()} token context</span> : null}<span className="model-tag">Provider usage when returned</span><span className="model-tag">Commercial review pending</span></div>
          <button className="button-secondary" style={{ marginTop: 15 }} type="button" onClick={() => { setModelId(model.id); openScreen("New chat"); }}>Use in chat <ChevronRight size={12} /></button>
        </article>)}</div>
        {!availableModels.length && <div className="empty-state">{modelError || "No configured provider returned any chat models."}</div>}
      </>;
    }
    return <>
      {renderHeading("Model catalog", "Available profiles in this workspace are local simulations only.")}
      <div className="notice-panel" style={{ marginTop: 0 }}><strong>Provider eligibility is pending.</strong> Real providers are hidden until credentials, verified usage reporting, and commercial terms are reviewed and implemented.</div>
      <div className="model-grid">{modelCatalog.map((model) => <article className="panel model-card" key={model.id}>
        <div className="model-card-head"><div className={`model-card-icon ${model.accent}`}><Sparkles size={17} /></div><span className="status-pill">Development mock</span></div>
        <div className="model-name">{model.name}</div><div className="model-provider">{model.provider}</div>
        <p className="model-description">{model.description}</p>
        <div className="model-tags"><span className="model-tag">{model.capability}</span><span className="model-tag">{model.contextTokens.toLocaleString()} token demo limit</span><span className="model-tag">Commercial review pending</span></div>
        <button className="button-secondary" style={{ marginTop: 15 }} type="button" onClick={() => { setModelId(model.id); openScreen("New chat"); }}>Use in local chat <ChevronRight size={12} /></button>
      </article>)}</div>
      <div className="notice-panel"><strong>Sample pricing policy.</strong> Demo charge uses a 40% target margin and a mock token rate card. Neither value is a launch price or provider price. See the billing documentation for the integer arithmetic used by the demo ledger.</div>
    </>;
  }

  function renderConversations() {
    const transcript = messages.filter((message) => message.persistable !== false && message.content.trim());
    return <>
      {renderHeading("Conversations", "Save chats to your account when you want them available across sessions.", <button type="button" className="button-primary" onClick={() => openScreen("New chat")}><Plus size={14} /> New chat</button>)}
      <div className="conversation-list-panel panel">
        <div className="panel-head"><div><div className="panel-title">Saved conversations</div><div className="panel-caption">Only you can access these saved transcripts.</div></div><div className="conversation-list-controls"><label className="archived-toggle"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Include archived</label><button className="button-secondary" type="button" onClick={() => void refreshConversations()} disabled={conversationsLoading}><Activity size={13} /> Refresh</button></div></div>
        {conversationsLoading ? <div className="empty-state"><LoaderCircle size={17} className="spin" /><div>Loading saved conversations…</div></div> : savedConversations.length ? <div className="saved-conversation-list">{savedConversations.map((conversation) => <article className={`saved-conversation ${conversation.archivedAt ? "archived" : ""}`} key={conversation.id}>
          <div className="saved-conversation-main">{renamingConversationId === conversation.id ? <form className="conversation-rename-form" onSubmit={(event) => { event.preventDefault(); void updateSavedConversation(conversation.id, { title: renameDraft }); }}><input autoFocus aria-label="Conversation title" maxLength={200} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} /><button className="icon-button conversation-action-icon" aria-label="Save title" type="submit" disabled={!renameDraft.trim() || conversationBusy}><Check size={14} /></button><button className="icon-button conversation-action-icon" aria-label="Cancel rename" type="button" onClick={() => setRenamingConversationId(null)}><X size={14} /></button></form> : <><div className="saved-conversation-title">{conversation.title}</div><div className="saved-conversation-meta"><span>{conversation.messageCount} messages</span><span>Updated {shortDate(new Date(conversation.updatedAt).getTime())}</span>{conversation.archivedAt && <span className="archived-label">Archived</span>}</div></>}</div>
          <div className="saved-conversation-actions"><button className="button-secondary" type="button" onClick={() => void openSavedConversation(conversation.id)} disabled={conversationBusy}><MessageSquare size={13} /> Open</button><button className="icon-button conversation-action-icon" type="button" aria-label={`Rename ${conversation.title}`} title="Rename" onClick={() => { setRenamingConversationId(conversation.id); setRenameDraft(conversation.title); }} disabled={conversationBusy}><Pencil size={13} /></button><button className="icon-button conversation-action-icon" type="button" aria-label={conversation.archivedAt ? `Restore ${conversation.title}` : `Archive ${conversation.title}`} title={conversation.archivedAt ? "Restore" : "Archive"} onClick={() => void updateSavedConversation(conversation.id, { archived: !conversation.archivedAt })} disabled={conversationBusy}>{conversation.archivedAt ? <RotateCcw size={13} /> : <Archive size={13} />}</button><button className="icon-button conversation-action-icon danger" type="button" aria-label={`Delete ${conversation.title}`} title="Delete permanently" onClick={() => void deleteSavedConversation(conversation.id)} disabled={conversationBusy}><Trash2 size={13} /></button></div>
        </article>)}</div> : <div className="empty-state"><MessageSquare className="empty-icon" size={20} /><div>{includeArchived ? "No saved conversations found." : "No active saved conversations."}</div><p style={{ margin: "6px 0 0" }}>Start a chat, then choose Save when you want to keep it in your account.</p></div>}
      </div>
      {transcript.length > 0 && <section className="panel current-transcript-panel"><div className="panel-head"><div><div className="panel-title">{conversationId ? conversationTitle || "Saved conversation" : "Current chat"}</div><div className="panel-caption">{conversationId ? "Saved to your account" : "This transcript is only in this browser until you save it."}</div></div><div className="transcript-actions">{renderMarkdownToggle()}{!conversationId && <button className="button-primary" type="button" onClick={() => void saveCurrentConversation()} disabled={isSending || conversationBusy}><FileText size={13} /> {conversationBusy ? "Saving…" : "Save conversation"}</button>}{!conversationId && <button className="button-secondary" type="button" onClick={() => setMessages([])}>Clear</button>}</div></div>{conversationHasMoreMessages && <div className="conversation-history-note" role="status">Showing the latest 200 messages. Older messages remain saved.</div>}<div className="conversation-transcript">{messages.map((message) => <article className={`transcript-message ${message.role}`} key={message.id}><div className="transcript-message-heading"><span>{message.role === "user" ? "You" : modelName(message.modelId ?? modelId, availableModels)}</span><time dateTime={new Date(message.createdAt).toISOString()}>{shortDate(message.createdAt)}</time></div>{message.content ? <MarkdownContent content={message.content} view={markdownView} isStreaming={isSending && message.id === messages[messages.length - 1]?.id} className="transcript-markdown" /> : <div className="transcript-pending">Generating…</div>}</article>)}</div></section>}
    </>;
  }

  function renderSubscription() {
    return <>
      {renderHeading("Subscription", "Manage monthly plans, credit top-ups, and payment history.")}
      <BillingPanel />
    </>;
  }

  function renderDeveloper() {
    return <>
      {renderHeading("Developer API", "Build on Think Zone when key management and metering are ready.")}
      <section className="panel" style={{ padding: 21, marginTop: 16 }}><div className="metric-icon" style={{ color: "#4475bd", background: "#edf5ff" }}><Code2 size={16} /></div><h2 style={{ fontSize: 16, margin: "14px 0 6px", letterSpacing: "-.03em" }}>Developer access is not enabled</h2><p className="page-subtitle" style={{ maxWidth: 620, lineHeight: 1.7 }}>There is no API-key creation, hashing, revocation, or production inference endpoint yet. The database schema includes a hashed-key foundation; the local demo chat route accepts only the browser demo flow and is not a developer API.</p></section>
      <div className="notice-panel"><strong>Security note.</strong> Never place provider credentials in browser code. Production API keys must be shown once, stored as a one-way hash, revocable, and bound to a server-authorized credit account.</div>
    </>;
  }

  function renderSettings() {
    return <>
      {renderHeading("Workspace settings", "Account and privacy controls for this development preview.")}
      <div className="settings-grid"><section className="panel"><div className="panel-head"><div><div className="panel-title">Profile</div><div className="panel-caption">Your account identity is managed by Google</div></div></div>
        <div className="setting-row"><div><div className="setting-label">Workspace</div><div className="setting-detail">Current demo scope</div></div><div className="setting-value">Personal workspace</div></div>
        <div className="setting-row"><div><div className="setting-label">Account</div><div className="setting-detail">Your Google account is connected</div></div><div className="setting-value">Google</div></div>
        <div className="setting-row"><div><div className="setting-label">Sessions</div><div className="setting-detail">Managed by Google sign-in</div></div><div className="setting-value">Active</div></div>
      </section><section className="panel"><div className="panel-head"><div><div className="panel-title">Privacy & controls</div><div className="panel-caption">Local development environment</div></div></div>
        <div className="setting-row"><div><div className="setting-label">Prompt storage</div><div className="setting-detail">Stored only when you choose Save conversation</div></div><div className="setting-value">Opt in</div></div>
        <div className="setting-row"><div><div className="setting-label">Provider requests</div><div className="setting-detail">{runtimeMode === "direct-provider-development" ? "Configured provider adapters" : "Development mock adapter only"}</div></div><div className="setting-value">{runtimeMode === "direct-provider-development" ? "Provider billed" : "Disabled externally"}</div></div>
        <div className="setting-row"><div><div className="setting-label">Saved conversations</div><div className="setting-detail">Rename, archive, restore, or permanently delete from Conversations</div></div><div className="setting-value">Account storage</div></div>
        <div className="setting-row"><div><div className="setting-label">Payments</div><div className="setting-detail">Available in the development billing panel</div></div><div className="setting-value">Test only</div></div>
      </section></div>
    </>;
  }
}

function LayersIcon() {
  return <Gauge size={15} />;
}
