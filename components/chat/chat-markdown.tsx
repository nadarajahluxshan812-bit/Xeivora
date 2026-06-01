"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function stringifyChildren(children: ReactNode): string {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map(stringifyChildren).join("");
  }

  return children ? String(children) : "";
}

type CodeBlockProps = ComponentPropsWithoutRef<"code"> & {
  className?: string;
  children?: ReactNode;
};

function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const language = className?.replace("language-", "") || "text";
  const code = stringifyChildren(children).replace(/\n$/, "");
  const inline = !className;
  const [copied, setCopied] = useState(false);

  if (inline) {
    return (
      <code
        className="rounded-md bg-[var(--xv-chat-inline-code-bg)] px-1.5 py-0.5 text-[var(--xv-chat-inline-code-text)]"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-[var(--xv-chat-code-border)] bg-[var(--xv-chat-code-bg)] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--xv-chat-muted)]">{language}</div>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-[var(--xv-chat-border)] px-2 py-1 text-[10px] text-[var(--xv-chat-muted)] transition hover:border-[var(--xv-chat-border-strong)] hover:text-[var(--xv-chat-text)]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            } catch {
              setCopied(false);
            }
          }}
          type="button"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <code className="font-mono text-sm text-[var(--xv-chat-code-text)]" {...props}>
        {code}
      </code>
    </pre>
  );
}

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          code: CodeBlock
        }}
        remarkPlugins={[remarkGfm as never]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
