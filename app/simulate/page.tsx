import { ComingSoonShell } from "@/components/workspace/coming-soon-shell";
import { requireViewer } from "@/lib/auth";

export default async function SimulatePage() {
  const viewer = await requireViewer("/simulate");
  return <ComingSoonShell feature="Simulate" viewer={viewer} />;
}
