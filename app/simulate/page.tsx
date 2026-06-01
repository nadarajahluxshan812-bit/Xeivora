import { SimulateShell } from "@/components/simulate/simulate-shell";
import { requireViewer } from "@/lib/auth";

export default async function SimulatePage() {
  const viewer = await requireViewer("/simulate");
  return <SimulateShell viewer={viewer} />;
}
