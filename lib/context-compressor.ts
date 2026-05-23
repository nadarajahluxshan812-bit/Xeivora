export type ContinuationPacket = {
  goal: string;
  current_progress: string;
  completed_work: string[];
  remaining_work: string[];
  important_decisions: string[];
  code_file_state: string;
  output_style: string;
  provider_previously_used: string;
  instruction: "Do not restart. Continue from this exact point.";
};

export function createContinuationPacket(input: Omit<ContinuationPacket, "instruction">): ContinuationPacket {
  return {
    ...input,
    instruction: "Do not restart. Continue from this exact point."
  };
}
