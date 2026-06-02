import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function IntegrationsPage() {
  const viewer = await requireViewer("/integrations");
  return <ComingSoonShell feature="Integrations" viewer={viewer} />;
}
