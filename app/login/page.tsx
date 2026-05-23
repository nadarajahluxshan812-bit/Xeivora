import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/marketing-shell";

export default function LoginPage() {
  return (
    <MarketingPageShell>
      <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-20 md:px-6">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white p-7 text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Login</p>
          <h1 className="mt-4 text-3xl font-semibold">Open your Xeivora workspace</h1>
          <div className="mt-7 grid gap-4">
            <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="Email" type="email" />
            <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="Password" type="password" />
            <Link className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-slate-950" href="/chat">
              Continue to MVP
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-500">Authentication placeholder for MVP. The workspace is local-first for now.</p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
