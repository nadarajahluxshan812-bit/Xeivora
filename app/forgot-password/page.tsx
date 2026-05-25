import { redirect } from "next/navigation";

import { AuthShell, ForgotPasswordForm } from "@/components/auth/auth-shell";
import { getViewer } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const viewer = await getViewer();
  if (viewer) {
    redirect("/chat");
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      subtitle="Recover access to your Xeivora workspace without losing your conversations, files, or memory continuity."
      title="Recover your workspace"
    >
      <ForgotPasswordForm mode="forgot-password" />
    </AuthShell>
  );
}
