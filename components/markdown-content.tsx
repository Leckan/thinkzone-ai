"use client";

import { Streamdown } from "streamdown";

type MarkdownContentProps = {
  content: string;
  view: "rendered" | "source";
  isStreaming?: boolean;
  className?: string;
};

export function MarkdownContent({ content, view, isStreaming = false, className }: MarkdownContentProps) {
  if (view === "source") {
    return <pre className={`${className ?? ""} markdown-source`}>{content}</pre>;
  }

  return (
    <Streamdown className={className} mode="streaming" isAnimating={isStreaming}>
      {content}
    </Streamdown>
  );
}
