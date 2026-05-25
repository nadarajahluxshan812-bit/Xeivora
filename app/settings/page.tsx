import { SettingsShell } from "@/components/settings/settings-shell";
import { requireViewer } from "@/lib/auth";

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  return <SettingsShell initialUser={viewer} />;
}
