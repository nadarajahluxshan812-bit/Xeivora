import { IntegrationsShell } from "@/components/integrations/integrations-shell";
import { requireViewer } from "@/lib/auth";

export default async function IntegrationsPage() {
  const viewer = await requireViewer("/integrations");
  return <IntegrationsShell viewer={viewer} />;
}
