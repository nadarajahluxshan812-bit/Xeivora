import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function SimulatePage() {
  const viewer = await requireViewer("/simulate");
  return (
    <ComingSoonShell
      description="Simulation tools are planned, but Xeivora is narrowing in on never losing project context across AI models first."
      title="Simulate is coming soon"
      viewer={viewer}
    />
  );
}
