"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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

export function ChatMarkdown({ content }: { content: string }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          code({ children, className, ...props }) {
            const code = stringifyChildren(children).replace(/\n$/, "");
            const inline = !className;

            if (inline) {
              return (
                <code className="rounded-md bg-[#1c1c1c] px-1.5 py-0.5 text-white/92" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="relative my-4 overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#171717]">
                <button
                  className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={async () => {
                    await navigator.clipboard.writeText(code);
                    setCopiedCode(code);
                    setTimeout(() => setCopiedCode(null), 1400);
                  }}
                  type="button"
                >
                  {copiedCode === code ? "Copied" : "Copy code"}
                </button>
                <pre className="overflow-x-auto px-4 py-5 text-sm leading-7 text-white/88">
                  <code {...props}>{code}</code>
                </pre>
              </div>
            );
          }
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
