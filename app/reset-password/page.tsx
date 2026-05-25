import { redirect } from "next/navigation";

import { AuthShell, ResetPasswordForm } from "@/components/auth/auth-shell";
import { getViewer } from "@/lib/auth";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = (await searchParams) || {};
  const token = typeof params.token === "string" ? params.token : null;
  const error = typeof params.error === "string" ? params.error : null;

  if (viewer) {
    redirect("/chat");
  }

  return (
    <AuthShell
      eyebrow="Secure password reset"
      subtitle="Choose a new password and re-enter the same continuous Xeivora workspace you left."
      title="Set a new password"
    >
      <ResetPasswordForm initialError={error} mode="reset-password" resetToken={token} />
    </AuthShell>
  );
}
