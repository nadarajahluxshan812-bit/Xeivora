import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function AgentsPage() {
  const viewer = await requireViewer("/agents");
  return <ComingSoonShell feature="Agents" viewer={viewer} />;
}
