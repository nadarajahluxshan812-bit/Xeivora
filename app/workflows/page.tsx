import { WorkflowsShell } from "@/components/workflows/workflows-shell";
import { requireViewer } from "@/lib/auth";

export default async function WorkflowsPage() {
  const viewer = await requireViewer("/workflows");
  return <WorkflowsShell viewer={viewer} />;
}
