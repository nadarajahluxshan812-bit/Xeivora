"use client";

import { useEffect, useMemo, useState } from "react";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { AuthUser } from "@/lib/auth-types";

type ResourceItem = Record<string, unknown> & {
  id: string;
  title?: string;
  name?: string;
  content?: string;
  description?: string;
};

export function ResourceManager({
  endpoint,
  title,
  subtitle,
  createLabel,
  createPayload,
  viewer = null
}: {
  endpoint: string;
  title: string;
  subtitle: string;
  createLabel: string;
  createPayload: ResourceItem;
  viewer?: AuthUser | null;
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
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel="Memory" viewer={viewer} />
        <div className="space-y-4">
          <section className="glow-shell p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-kicker">Persistent context</div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">{title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/56">{subtitle}</p>
              </div>
              <button
                className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                onClick={createItem}
                type="button"
              >
                {createLabel}
              </button>
            </div>
          </section>

          <section className="glass-panel p-5">
            <input
              className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              value={query}
            />
          </section>

          <section className="glass-panel p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {loading ? <p className="text-white/42">Loading...</p> : null}
              {filtered.map((item) => (
                <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/72 p-5 text-white" key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{item.title || item.name}</h2>
                      <p className="mt-2 text-sm leading-7 text-white/56">
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
      </div>
    </main>
  );
}
