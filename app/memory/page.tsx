import { ResourceManager } from "@/components/mvp/resource-manager";

export default function MemoryPage() {
  return (
    <ResourceManager
      createLabel="Create memory"
      createPayload={{
        id: "new-memory",
        type: "reusable_context",
        title: "New reusable context",
        content: "Add project notes, user preferences, or workflow state here.",
        enabled: true
      }}
      endpoint="/api/memory"
      subtitle="View, create, delete, and search conversation memory, user preferences, project notes, workflow history, reusable context, provider history, and coding checkpoints."
      title="Memory system"
    />
  );
}
