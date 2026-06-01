type DesktopBridgeResult<T = Record<string, unknown>> = {
  error?: string;
  success: boolean;
} & T;

type DesktopFileNode = {
  children?: DesktopFileNode[] | null;
  extension: string | null;
  isDirectory: boolean;
  name: string;
  path: string;
};

type DesktopFolderChangedEvent = {
  eventType: string;
  filename: string;
  folderPath: string;
};

type DesktopStateSnapshot = {
  allowedRootPath: string | null;
  firstLaunchCompleted: boolean;
};

type XeivoraDesktopBridge = {
  getState: () => Promise<DesktopStateSnapshot>;
  getVersion: () => Promise<string>;
  isDesktop: boolean;
  openFile: () => Promise<string | null>;
  openFolder: () => Promise<string | null>;
  onFileChanged: (callback: (payload: DesktopFolderChangedEvent) => void) => () => void;
  onFirstLaunchCompleted: (callback: (value: boolean) => void) => () => void;
  onFolderOpened: (callback: (folderPath: string) => void) => () => void;
  onNavigate: (callback: (href: string) => void) => () => void;
  onNewChat: (callback: () => void) => () => void;
  platform: string;
  readFile: (filePath: string) => Promise<DesktopBridgeResult<{ content?: string }>>;
  readFolder: (folderPath: string | null) => Promise<DesktopBridgeResult<{ structure?: DesktopFileNode[] }>>;
  runCommand: (
    command: string,
    cwd?: string | null
  ) => Promise<DesktopBridgeResult<{ error?: string | null; exitCode?: number; stderr?: string; stdout?: string }>>;
  stopWatchingFolder: () => Promise<DesktopBridgeResult>;
  storeGet: (key: string) => Promise<unknown>;
  storeSet: (key: string, value: unknown) => Promise<boolean>;
  watchFolder: (folderPath: string) => Promise<DesktopBridgeResult>;
  writeFile: (filePath: string, content: string) => Promise<DesktopBridgeResult>;
};

declare global {
  interface Window {
    xeivora?: XeivoraDesktopBridge;
  }
}

export {};
