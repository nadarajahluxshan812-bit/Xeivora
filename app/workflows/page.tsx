import { ResourceManager } from "@/components/mvp/resource-manager";

export default function WorkflowsPage() {
  return (
    <ResourceManager
      createLabel="Create workflow"
      createPayload={{
        id: "new-workflow",
        name: "New workflow template",
        description: "Define steps, provider routing, checkpoint rules, and continuity behavior.",
        steps: ["Receive prompt", "Plan", "Execute", "Checkpoint"],
        status: "draft"
      }}
      endpoint="/api/workflows"
      subtitle="Manage templates such as Research to Report, Code Request to Debug, Business Idea to Pitch, Multi-model Coding Continuation, and Provider Failover."
      title="Workflow templates"
    />
  );
}
