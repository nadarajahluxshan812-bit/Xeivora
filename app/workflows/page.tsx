import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function WorkflowsPage() {
  const viewer = await requireViewer("/workflows");
  return <ComingSoonShell feature="Workflows" viewer={viewer} />;
}
