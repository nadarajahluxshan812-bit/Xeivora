export type LightweightMemoryPreference = {
  key: string;
  label: string;
  value: string;
};

export type LightweightMemorySnapshot = {
  workspaceId: string;
  userName: string | null;
  preferences: LightweightMemoryPreference[];
  workspaceInfo: {
    currentFocus: string | null;
  };
  session: {
    lastTopic: string | null;
    updatedAt: string | null;
  };
};

export type LightweightMemoryUpdate = {
  updated: boolean;
  userName: string | null;
  preferences: LightweightMemoryPreference[];
  workspaceFocus: string | null;
};

// Runtime implementation lives in `lightweight-memory.js` because the local
// Express server currently runs in CommonJS without a TypeScript loader.
