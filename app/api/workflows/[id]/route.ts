import { NextResponse } from "next/server";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const item = await mvpStore.update("workflows", id, body || {});

  return NextResponse.json(item || { error: "Workflow not found." }, {
    status: item ? 200 : 404
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await mvpStore.remove("workflows", id);

  return NextResponse.json(
    {
      deleted
    },
    { status: deleted ? 200 : 404 }
  );
}
