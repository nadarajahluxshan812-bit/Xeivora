"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ResourceItem = Record<string, unknown> & { id: string; title?: string; name?: string; content?: string; description?: string };

export function ResourceManager({
  endpoint,
  title,
  subtitle,
  createLabel,
  createPayload
}: {
  endpoint: string;
  title: string;
  subtitle: string;
  createLabel: string;
  createPayload: ResourceItem;
}) {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const response = await fetch(endpoint, { cache: "no-store" });
    setItems(await response.json());
    setLoading(false);
  }

  async function createItem() {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPayload)
    });
    await load();
  }

  async function deleteItem(id: string) {
    await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(lower));
  }, [items, query]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70" href="/chat">
            Back to chat
          </Link>
          <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950" onClick={createItem} type="button">
            {createLabel}
          </button>
        </div>
        <section className="rounded-[2rem] border border-white/10 bg-white p-7 text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Xeivora MVP</p>
          <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
          <p className="mt-4 max-w-2xl text-slate-600">{subtitle}</p>
          <input
            className="mt-7 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            value={query}
          />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {loading ? <p className="text-slate-500">Loading...</p> : null}
            {filtered.map((item) => (
              <article className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white" key={item.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{item.title || item.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/56">
                      {String(item.content || item.description || item.role || "Ready")}
                    </p>
                  </div>
                  <button className="text-sm text-white/45 hover:text-white" onClick={() => deleteItem(item.id)} type="button">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
