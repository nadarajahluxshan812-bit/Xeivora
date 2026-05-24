import { NextResponse } from "next/server";

const { deleteUploadedFile, getFile } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const file = await getFile(fileId);

  return NextResponse.json(file || { error: "File not found." }, {
    status: file ? 200 : 404,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const deleted = await deleteUploadedFile(fileId);

  return NextResponse.json(
    {
      deleted
    },
    {
      status: deleted ? 200 : 404,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
