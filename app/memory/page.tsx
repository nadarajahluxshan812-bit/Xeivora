import { MemoryShell } from "@/components/memory/memory-shell";
import { requireViewer } from "@/lib/auth";

export default async function MemoryPage() {
  const viewer = await requireViewer("/memory");
  return <MemoryShell viewer={viewer} />;
}
