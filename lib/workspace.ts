import type { ModelOption } from "@/lib/chat-types";

export const workspaceNav = [
  {
    href: "/chat",
    label: "Chat",
    detail: "Conversation workspace"
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    detail: "Continuity metrics"
  },
  {
    href: "/memory",
    label: "Memory",
    detail: "Shared context"
  },
  {
    href: "/workflows",
    label: "Workflows",
    detail: "Continuity and routing"
  },
  {
    href: "/agents",
    label: "Agents",
    detail: "Specialist workers"
  },
  {
    href: "/settings",
    label: "Settings",
    detail: "Profile and preferences"
  }
] as const;

export const modelOptions: ModelOption[] = [
  {
    key: "orbit-auto",
    label: "Xeivora Auto",
    vendor: "Orchestration",
    description: "Let Xeivora choose the best model and route.",
    accent: "cyan"
  },
  {
    key: "gpt-4o",
    label: "GPT-4o",
    vendor: "OpenAI",
    description: "Balanced multimodal reasoning with fast live responses.",
    accent: "cyan"
  },
  {
    key: "claude",
    label: "Claude",
    vendor: "Anthropic",
    description: "Strong document reasoning, analysis, and policy drafting.",
    accent: "violet"
  },
  {
    key: "gemini",
    label: "Gemini",
    vendor: "Google",
    description: "Fast multimodal classification and broad context handling.",
    accent: "emerald"
  }
];
