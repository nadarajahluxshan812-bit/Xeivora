import { Suspense } from "react";

import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";
import { requireViewer } from "@/lib/auth";

export default async function ProjectWorkspacePage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewer = await requireViewer(`/dashboard/${projectId}`);

  return (
    <Suspense fallback={null}>
      <ProjectWorkspaceShell projectId={projectId} viewer={viewer} />
    </Suspense>
  );
}
