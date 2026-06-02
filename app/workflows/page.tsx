import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function WorkflowsPage() {
  const viewer = await requireViewer("/workflows");
  return (
    <ComingSoonShell
      description="Workflow automation is planned, but Xeivora is currently focused on preserving project context and memory first."
      title="Workflows are coming soon"
      viewer={viewer}
    />
  );
}
