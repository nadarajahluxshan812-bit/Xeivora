import { redirect } from "next/navigation";

import { AuthShell, SignupForm } from "@/components/auth/auth-shell";
import { getViewer, sanitizeNextPath } from "@/lib/auth";

export default async function SignupPage({
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
      eyebrow="Create your workspace"
      subtitle="Set up Xeivora once and keep projects, files, Project Memory, timeline, previews, and progress connected."
      title="Start free"
    >
      <SignupForm initialError={error} mode="signup" nextPath={nextPath} />
    </AuthShell>
  );
}
