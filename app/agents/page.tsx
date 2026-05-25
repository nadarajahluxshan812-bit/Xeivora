import { AgentsShell } from "@/components/agents/agents-shell";
import { requireViewer } from "@/lib/auth";

export default async function AgentsPage() {
  const viewer = await requireViewer("/agents");
  return <AgentsShell viewer={viewer} />;
}
