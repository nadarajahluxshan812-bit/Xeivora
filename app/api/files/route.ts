import { NextResponse } from "next/server";
import fs from "node:fs/promises";

import { getViewer } from "@/lib/auth";

const {
  createUploadedFile,
  createUploadTarget,
  detectFileKind,
  listFiles,
  updateUploadedFile
} = require("@/lib/server/workspace-store");
const { parseFileRecord } = require("@/lib/server/file-parser");
const { enforceRateLimit } = require("@/lib/server/rate-limit");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const projectId = searchParams.get("projectId");

  return NextResponse.json(await listFiles({ sessionId, projectId }), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, {
    scope: "file-upload",
    max: 12,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many uploads in a short period. Please wait a moment and try again."
      },
      { status: 429 }
    );
  }

  const viewer = await getViewer();
  const formData = await request.formData();
  const sessionId = (formData.get("sessionId") as string | null) || null;
  const projectId = (formData.get("projectId") as string | null) || null;
  const fileEntries = formData
    .getAll("files")
    .filter((entry): entry is File => typeof File !== "undefined" && entry instanceof File);

  if (!fileEntries.length) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  const uploaded = [];

  for (const file of fileEntries) {
    const target = createUploadTarget(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(target.absolutePath, buffer);

    const record = await createUploadedFile({
      id: target.fileId,
      sessionId,
      projectId,
      ownerId: viewer?.id ?? null,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      kind: detectFileKind(file.name, file.type || "application/octet-stream"),
      size: file.size,
      storagePath: target.absolutePath,
      analysisStatus: "processing"
    });

    try {
      const parsed = await parseFileRecord(record);
      uploaded.push(
        await updateUploadedFile(record.id, {
          extractedText: parsed.extractedText,
          previewText: parsed.previewText,
          summary: parsed.summary,
          analysisStatus: "ready"
        })
      );
    } catch (error) {
      uploaded.push(
        await updateUploadedFile(record.id, {
          summary: "Xeivora stored the file, but analysis did not complete.",
          analysisStatus: "failed",
          previewText: error instanceof Error ? error.message : "Analysis failed."
        })
      );
    }
  }

  return NextResponse.json(
    {
      files: uploaded
    },
    { status: 201 }
  );
}
