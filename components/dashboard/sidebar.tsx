import Link from "next/link";

import { OrbitLogo } from "@/components/orbit-logo";

const navItems = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Workflows", href: "#workflows" },
  { label: "Agents", href: "#agents" },
  { label: "Integrations", href: "#integrations" },
  { label: "Memory", href: "#memory" },
  { label: "Analytics", href: "#analytics" },
  { label: "Settings", href: "#settings" }
];

type DashboardSidebarProps = {
  connectionState: string;
};

export function DashboardSidebar({ connectionState }: DashboardSidebarProps) {
  return (
    <aside className="glass-panel sticky top-6 flex h-fit flex-col gap-6 p-5">
      <div className="flex items-start justify-between gap-4">
        <OrbitLogo compact />
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-cyan-100/80">
          {connectionState}
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4">
        <div className="text-sm font-medium text-white">Xeivora Core</div>
        <p className="mt-2 text-sm leading-6 text-white/55">
          A live orchestration layer coordinating agents, tools, and memory from one control plane.
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item, index) => (
          <a
            className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
              index === 0
                ? "border border-cyan-300/25 bg-cyan-300/10 text-white shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white"
            }`}
            href={item.href}
            key={item.label}
          >
            <span>{item.label}</span>
            <span className="text-white/30">0{index + 1}</span>
          </a>
        ))}
      </nav>

      <div className="rounded-[1.6rem] border border-white/8 bg-slate-950/70 p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Deployment</div>
        <div className="mt-2 text-sm font-medium text-white">Production-ready for Railway</div>
        <p className="mt-2 text-sm leading-6 text-white/52">
          Xeivora now runs as a standard Next.js production app with server routes, PostgreSQL support, and custom domain readiness.
        </p>
        <Link
          className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-cyan-300/35 hover:text-white"
          href="/"
        >
          Back to landing page
        </Link>
      </div>
    </aside>
  );
}
