import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth-types";

const { listProjects } = require("@/lib/server/workspace-store");

export type OwnedProject = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  status?: string;
  ownerId?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type Resolved =
  | { ok: true; viewer: AuthUser; project: OwnedProject }
  | { ok: false; response: NextResponse };

/**
 * Resolve a project the current viewer is allowed to act on.
 *
 * - No authenticated viewer  -> 401.
 * - Project missing OR owned by someone else -> 404 (never 403), so we don't
 *   leak the existence of other users' projects to id enumeration.
 *
 * Legacy projects created before ownership existed have no owner id; they stay
 * accessible to any authenticated viewer (we can't retroactively attribute
 * them). Every project created after this change is stamped with its owner and
 * is therefore strictly scoped.
 */
export async function resolveOwnedProject(projectId: string): Promise<Resolved> {
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  const projects: OwnedProject[] = await listProjects();
  const project = projects.find((item) => item.id === projectId);
  const ownerId = project?.ownerId ?? project?.userId ?? null;

  if (!project || (ownerId && ownerId !== viewer.id)) {
    return { ok: false, response: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  }

  return { ok: true, viewer, project };
}
