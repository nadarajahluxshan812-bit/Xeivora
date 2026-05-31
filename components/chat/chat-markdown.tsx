"use client";

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
    <pre className="my-3 overflow-x-auto rounded-lg bg-[#111111] p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--xv-chat-muted)]">{language}</div>
      <code className="font-mono text-sm text-[#b8d29b]" {...props}>
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
