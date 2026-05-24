"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";

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
  const [collapsedCode, setCollapsedCode] = useState<Record<string, boolean>>({});
  const remarkPlugins: Pluggable[] = [remarkGfm as unknown as Pluggable];

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          code({ children, className, ...props }) {
            const code = stringifyChildren(children).replace(/\n$/, "");
            const inline = !className;
            const codeKey = `${className || "plain"}:${code.slice(0, 80)}`;
            const isCollapsed = Boolean(collapsedCode[codeKey]);

            if (inline) {
              return (
                <code className="rounded-md bg-[#1c1c1c] px-1.5 py-0.5 text-white/92" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="relative my-4 overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#171717]">
                <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-3 py-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/46">
                    {className?.replace("language-", "") || "code"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[10px] uppercase tracking-[0.16em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
                      onClick={() =>
                        setCollapsedCode((current) => ({
                          ...current,
                          [codeKey]: !current[codeKey]
                        }))
                      }
                      type="button"
                    >
                      {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                    </button>
                    <button
                      className="inline-flex h-8 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[10px] uppercase tracking-[0.16em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
                      onClick={async () => {
                        await navigator.clipboard.writeText(code);
                        setCopiedCode(code);
                        setTimeout(() => setCopiedCode(null), 1400);
                      }}
                      type="button"
                    >
                      {copiedCode === code ? "Copied" : "Copy code"}
                    </button>
                  </div>
                </div>
                {!isCollapsed ? (
                  <pre className="overflow-x-auto px-4 py-5 text-sm leading-7 text-white/88">
                    <code {...props}>{code}</code>
                  </pre>
                ) : null}
              </div>
            );
          }
        }}
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={remarkPlugins}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
