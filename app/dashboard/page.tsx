import { ProjectsShell } from "@/components/projects/projects-shell";
import { requireViewer } from "@/lib/auth";

export default async function DashboardPage() {
  const viewer = await requireViewer("/dashboard");
  return <ProjectsShell viewer={viewer} />;
}
