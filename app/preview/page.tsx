import { PreviewShell } from "@/components/preview/preview-shell";
import { requireViewer } from "@/lib/auth";

export default async function PreviewPage() {
  const viewer = await requireViewer("/preview");
  return <PreviewShell viewer={viewer} />;
}
