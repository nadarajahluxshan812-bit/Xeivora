import { NextResponse } from "next/server";

import { resolveOwnedProject } from "@/lib/project-access";

const {
  getProjectVercel,
  isVercelConfigured,
  listDeploymentRecords,
  listVercelDeployments,
  updateDeploymentRecord
} = require("@/lib/server/vercel");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeploymentRecord = {
  id: string;
  vercelDeploymentId: string;
  url: string | null;
  target: string;
  state: string;
};

type LiveDeployment = { id: string; url: string | null; state: string };

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const gate = await resolveOwnedProject(projectId);
  if (!gate.ok) {
    return gate.response;
  }

  const configured = isVercelConfigured();
  const link = await getProjectVercel(projectId);
  let records: DeploymentRecord[] = await listDeploymentRecords(projectId);
  let deployments: LiveDeployment[] = [];

  if (configured && link) {
    try {
      deployments = await listVercelDeployments({ projectId: link.vercelProjectId, limit: 20 });

      // Refresh our trigger records' state from Vercel's authoritative list.
      const liveById = new Map(deployments.map((dep) => [dep.id, dep]));
      const terminal = new Set(["READY", "ERROR", "CANCELED"]);
      records = await Promise.all(
        records.map(async (record) => {
          const live = liveById.get(record.vercelDeploymentId);
          if (live && live.state !== record.state && !terminal.has(record.state)) {
            const updated = await updateDeploymentRecord(record.id, {
              state: live.state,
              url: live.url || record.url
            });
            return (updated as DeploymentRecord) || record;
          }
          return record;
        })
      );
    } catch {
      // Fall back to stored records if Vercel is unreachable.
    }
  }

  return NextResponse.json(
    { configured, link: link || null, deployments, records },
    { headers: { "Cache-Control": "no-store" } }
  );
}
