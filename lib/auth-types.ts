export type AuthProvider = "password" | "google";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: AuthProvider;
  plan: "Starter" | "Plus" | "Pro" | "Enterprise";
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  preferences: {
    memoryEnabled: boolean;
    orchestrationMode: "auto" | "guided";
    workspaceDensity: "comfortable" | "compact";
  };
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
  token: string;
};

export type AuthSessionPayload = {
  authenticated: boolean;
  user: AuthUser | null;
  expiresAt?: string | null;
};
