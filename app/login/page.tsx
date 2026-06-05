import { redirect } from "next/navigation";

import { AuthShell, LoginForm } from "@/components/auth/auth-shell";
import { getViewer, sanitizeNextPath } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = (await searchParams) || {};
  const nextPath = sanitizeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;

  if (viewer) {
    redirect(nextPath);
  }

  return (
    <AuthShell
      eyebrow="Secure access"
      subtitle="Enter your workspace to continue projects, files, Project Memory, timeline, previews, and progress with the same momentum."
      title="Enter your workspace"
    >
      <LoginForm initialError={error} mode="login" nextPath={nextPath} />
    </AuthShell>
  );
}
