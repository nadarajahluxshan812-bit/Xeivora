import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function IntegrationsPage() {
  const viewer = await requireViewer("/integrations");
  return (
    <ComingSoonShell
      description="App connections are planned, but Xeivora is currently focused on making project memory and cross-model continuity feel effortless first."
      title="Integrations are coming soon"
      viewer={viewer}
    />
  );
}
