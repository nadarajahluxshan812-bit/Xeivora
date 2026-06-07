import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MEMORY_SECTIONS = [
  "goals",
  "requirements",
  "decisions",
  "constraints",
  "architecture",
  "facts"
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const items = await mvpStore.list("memory");
  const scoped = projectId
    ? (Array.isArray(items) ? items : []).filter(
        (item: { projectId?: string | null }) => item.projectId === projectId
      )
    : items;

  return NextResponse.json(scoped, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const section = MEMORY_SECTIONS.includes(body?.section) ? body.section : "facts";
  const viewer = await getViewer();

  return NextResponse.json(
    await mvpStore.create("memory", {
      type: body?.type || "reusable_context",
      section,
      projectId: body?.projectId || null,
      ownerId: viewer?.id ?? null,
      title: body?.title || "Untitled memory",
      content: body?.content || "",
      enabled: body?.enabled ?? true
    }),
    { status: 201 }
  );
}
