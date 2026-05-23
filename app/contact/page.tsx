import { MarketingHero, MarketingPageShell } from "@/components/marketing/marketing-shell";

export default function ContactPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Contact"
        title="Talk to Xeivora."
        subtitle="Use this MVP contact page to capture early product interest, investor conversations, and pilot requests."
      />
      <section className="mx-auto max-w-3xl px-4 pb-24 md:px-6">
        <form className="grid gap-4 rounded-[2rem] border border-white/10 bg-white p-7 text-slate-950">
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="Name" />
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="Email" type="email" />
          <textarea className="min-h-36 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="What would you like to build with Xeivora?" />
          <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950" type="button">
            Send message
          </button>
          <p className="text-sm text-slate-500">MVP note: wire this form to your CRM or email provider before production launch.</p>
        </form>
      </section>
    </MarketingPageShell>
  );
}
