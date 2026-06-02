import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function AgentsPage() {
  const viewer = await requireViewer("/agents");
  return (
    <ComingSoonShell
      description="Agents are planned, but Xeivora is first perfecting project continuity so work can survive every model change."
      title="Agents are planned for later"
      viewer={viewer}
    />
  );
}
