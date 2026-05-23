export type WorkflowCheckpoint = {
  id: string;
  label: string;
  status: "saved" | "pending";
  summary: string;
};

export function createWorkflowCheckpoint(label: string, summary: string): WorkflowCheckpoint {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    label,
    status: "saved",
    summary
  };
}
