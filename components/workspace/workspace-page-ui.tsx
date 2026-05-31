"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from "react";
import { Search } from "lucide-react";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { AuthUser } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

const cardClassName =
  "rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#1a1410] p-6 text-[#f0ead8] transition-colors duration-150 hover:border-[rgba(201,100,66,0.35)]";

export function WorkspacePageShell({
  children,
  statusLabel = "Workspace",
  viewer = null
}: {
  children: ReactNode;
  statusLabel?: string;
  viewer?: AuthUser | null;
}) {
  return (
    <main className="min-h-screen bg-[#0e0b08] text-[#f0ead8]">
      <div className="mx-auto grid min-h-screen max-w-[1680px] gap-0 md:grid-cols-[232px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel={statusLabel} viewer={viewer} />
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
      <div className="text-[11px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.35)]">{eyebrow}</div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <h1 className="text-[clamp(36px,4vw,42px)] font-bold tracking-[-0.03em] text-white">{title}</h1>
          <p className="mt-4 max-w-[640px] text-base leading-[1.6] text-[rgba(255,255,255,0.5)]">{description}</p>
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
  return <h2 className={cn("text-base font-medium text-white", className)}>{children}</h2>;
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
          "bg-[#c96442] text-white hover:bg-[#a04e32]",
        variant === "secondary" &&
          "border border-[rgba(201,100,66,0.3)] bg-transparent text-[rgba(240,234,216,0.7)] hover:border-[#c96442] hover:text-[#f0ead8]",
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
        "flex h-11 items-center gap-3 rounded-[8px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] px-4 text-[#f0ead8] transition-colors focus-within:border-[#c96442]",
        className
      )}
    >
      <Search className="h-4 w-4 text-[rgba(240,234,216,0.35)]" />
      <input
        className="w-full bg-transparent text-sm text-[#f0ead8] outline-none placeholder:text-[rgba(240,234,216,0.3)]"
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
    <div className="rounded-[8px] border border-dashed border-[rgba(201,100,66,0.2)] bg-[#120e0a] px-6 py-10 text-center">
      <div className="text-base font-medium text-white">{title}</div>
      <p className="mx-auto mt-3 max-w-[28rem] text-sm leading-7 text-[rgba(255,255,255,0.55)]">{description}</p>
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
          "border-transparent bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]",
        tone === "learning" &&
          "border-[rgba(201,100,66,0.3)] bg-[rgba(201,100,66,0.12)] text-[#c96442]"
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
    <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
      <div className="h-full rounded-full bg-[#c96442]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
      <div className="text-[10px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.3)]">{label}</div>
      <div className="mt-3 text-[32px] font-bold leading-none text-white">{value}</div>
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
      <span className="text-[12px] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.5)]">{label}</span>
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
        "h-11 rounded-[8px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] px-4 text-sm text-[#f0ead8] outline-none transition-colors placeholder:text-[rgba(240,234,216,0.3)] focus:border-[#c96442]",
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
        "min-h-[120px] rounded-[8px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] px-4 py-3 text-sm text-[#f0ead8] outline-none transition-colors placeholder:text-[rgba(240,234,216,0.3)] focus:border-[#c96442]",
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
        checked ? "bg-[#c96442]" : "bg-[rgba(255,255,255,0.12)]"
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
