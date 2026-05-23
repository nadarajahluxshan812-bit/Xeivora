export type ConversationResponse =
  | "Hey 👋 How can I help today?"
  | "I’m Xeivora — an AI continuity platform designed to keep workflows running across multiple AI systems without losing context or progress."
  | "Nice to meet you, Luxshan. I’ll remember that for this workspace.";

export type ConversationMemorySnapshot = {
  userName: string | null;
  preferences: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  workspaceInfo: {
    currentFocus: string | null;
  };
};

export type RememberedConversationUpdate = {
  updated: boolean;
  userName: string | null;
  preferences: Array<{
    key: string;
    value: string;
    label: string;
  }>;
  workspaceFocus: string | null;
};

// Runtime implementation lives in `conversation-handler.js` because the local
// Express server currently runs in CommonJS without a TypeScript loader.
