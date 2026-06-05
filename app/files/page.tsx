import { FilesShell } from "@/components/files/files-shell";
import { requireViewer } from "@/lib/auth";

export default async function FilesPage() {
  const viewer = await requireViewer("/files");
  return <FilesShell viewer={viewer} />;
}
