import { TimelineShell } from "@/components/timeline/timeline-shell";
import { requireViewer } from "@/lib/auth";

export default async function TimelinePage() {
  const viewer = await requireViewer("/timeline");
  return <TimelineShell viewer={viewer} />;
}
