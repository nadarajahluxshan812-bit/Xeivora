"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from "react";
import { Search } from "lucide-react";

import { WorkspaceSidebar, type WorkspaceSidebarProps } from "@/components/workspace/workspace-sidebar";
import type { AuthUser } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

const cardClassName =
  "rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-6 text-[var(--site-text)] transition-colors duration-150 hover:border-[color:var(--site-border-strong)]";

export function WorkspacePageShell({
  children,
  sidebarProps,
  statusLabel = "Workspace",
  viewer = null
}: {
  children: ReactNode;
  sidebarProps?: Partial<WorkspaceSidebarProps>;
  statusLabel?: string;
  viewer?: AuthUser | null;
}) {
  return (
    <main className="min-h-screen bg-[var(--site-bg)] text-[var(--site-text)]">
      <div className="mx-auto grid min-h-screen max-w-[1680px] gap-0 md:grid-cols-[232px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel={statusLabel} viewer={viewer} {...sidebarProps} />
        <section className="min-w-0 px-5 py-8 md:px-8 md:py-9 xl:px-10">{children}</section>
      </div>
    </main>
  );
}

export function WorkspacePageHero({
  actions,
  description,
  eyebrow,
  title
}: {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="space-y-5">
      <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--site-subtle)]">{eyebrow}</div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <h1 className="text-[clamp(36px,4vw,42px)] font-bold tracking-[-0.03em] text-[var(--site-text)]">{title}</h1>
          <p className="mt-4 max-w-[640px] text-base leading-[1.6] text-[var(--site-subtle)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}

export function WorkspaceCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn(cardClassName, className)}>{children}</section>;
}

export function WorkspaceSectionTitle({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={cn("text-base font-medium text-[var(--site-text)]", className)}>{children}</h2>;
}

export function WorkspaceButton({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[8px] px-5 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--site-accent)] text-[var(--site-inverse)] hover:bg-[var(--site-accent-strong)]",
        variant === "secondary" &&
          "border border-[color:var(--site-border-strong)] bg-transparent text-[var(--site-muted)] hover:border-[var(--site-accent)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]",
        variant === "danger" &&
          "border border-[rgba(239,68,68,0.4)] bg-transparent text-[rgba(239,68,68,0.7)] hover:border-[rgba(239,68,68,0.8)] hover:text-[rgba(239,68,68,0.95)]",
        className
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function WorkspaceSearchInput({
  className = "",
  onChange,
  placeholder,
  value
}: {
  className?: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label
      className={cn(
        "flex h-11 items-center gap-3 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 text-[var(--site-text)] transition-colors focus-within:border-[var(--site-accent)]",
        className
      )}
    >
      <Search className="h-4 w-4 text-[var(--site-subtle)]" />
      <input
        className="w-full bg-transparent text-sm text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function WorkspaceEmptyState({
  action,
  description,
  title
}: {
  action?: ReactNode;
  description: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[8px] border border-dashed border-[color:var(--site-border-strong)] bg-[var(--site-panel)] px-6 py-10 text-center">
      <div className="text-base font-medium text-[var(--site-text)]">{title}</div>
      <p className="mx-auto mt-3 max-w-[28rem] text-sm leading-7 text-[var(--site-subtle)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function WorkspaceBadge({
  children,
  tone = "standby"
}: {
  children: ReactNode;
  tone?: "live" | "standby" | "learning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]",
        tone === "live" &&
          "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] text-[#22c55e]",
        tone === "standby" &&
          "border-transparent bg-[var(--site-ghost-bg)] text-[var(--site-subtle)]",
        tone === "learning" &&
          "border-[color:var(--site-border-strong)] bg-[var(--site-accent-soft)] text-[var(--site-accent)]"
      )}
    >
      {children}
    </span>
  );
}

export function WorkspaceProgressBar({
  value
}: {
  value: number;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--site-ghost-bg)]">
      <div className="h-full rounded-full bg-[var(--site-accent)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function WorkspaceStatCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <WorkspaceCard className="p-5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--site-subtle)]">{label}</div>
      <div className="mt-3 text-[32px] font-bold leading-none text-[var(--site-text)]">{value}</div>
    </WorkspaceCard>
  );
}

export function WorkspaceField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] uppercase tracking-[0.06em] text-[var(--site-subtle)]">{label}</span>
      {children}
    </label>
  );
}

export function WorkspaceInput(
  props: InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 text-sm text-[var(--site-text)] outline-none transition-colors placeholder:text-[var(--site-subtle)] focus:border-[var(--site-accent)]",
        props.className
      )}
    />
  );
}

export function WorkspaceTextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[120px] rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 py-3 text-sm text-[var(--site-text)] outline-none transition-colors placeholder:text-[var(--site-subtle)] focus:border-[var(--site-accent)]",
        props.className
      )}
    />
  );
}

export function WorkspaceToggle({
  checked,
  onClick
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-[var(--site-accent)]" : "bg-[var(--site-border)]"
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
