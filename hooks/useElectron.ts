"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DesktopFileNode = {
  children?: DesktopFileNode[] | null;
  extension: string | null;
  isDirectory: boolean;
  name: string;
  path: string;
};

function getElectronApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.xeivora ?? null;
}

export function useElectron() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [openFolderPath, setOpenFolderPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<DesktopFileNode[]>([]);
  const [fileTreeLoading, setFileTreeLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState("");
  const [firstLaunchComplete, setFirstLaunchComplete] = useState(true);
  const activeFileRef = useRef<string | null>(null);

  const folderLabel = useMemo(() => {
    if (!openFolderPath) {
      return null;
    }

    const parts = openFolderPath.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || openFolderPath;
  }, [openFolderPath]);

  const hydrateFolder = useCallback(async (folderPath: string | null) => {
    const api = getElectronApi();
    if (!api || !folderPath) {
      setOpenFolderPath(null);
      setFileTree([]);
      return;
    }

    setFileTreeLoading(true);

    try {
      const result = await api.readFolder(folderPath);
      if (result.success) {
        setOpenFolderPath(folderPath);
        setFileTree(result.structure || []);
        await api.watchFolder(folderPath);
      }
    } finally {
      setFileTreeLoading(false);
    }
  }, []);

  const refreshActiveFile = useCallback(async (filePath: string | null) => {
    const api = getElectronApi();
    if (!api || !filePath) {
      return;
    }

    const result = await api.readFile(filePath);
    if (result.success) {
      setActiveFile(filePath);
      setActiveFileContent(result.content || "");
    }
  }, []);

  useEffect(() => {
    const api = getElectronApi();
    if (!api) {
      return undefined;
    }

    setIsDesktop(Boolean(api.isDesktop));
    setPlatform(api.platform);

    let mounted = true;
    void api.getState().then((state) => {
      if (!mounted) {
        return;
      }

      setFirstLaunchComplete(Boolean(state?.firstLaunchCompleted));
      if (state?.allowedRootPath) {
        void hydrateFolder(state.allowedRootPath);
      }
    });

    const unlistenFolder = api.onFolderOpened((folderPath) => {
      void hydrateFolder(folderPath);
    });

    const unlistenFileChanged = api.onFileChanged(() => {
      void hydrateFolder(openFolderPath || null);
      if (activeFileRef.current) {
        void refreshActiveFile(activeFileRef.current);
      }
    });

    const unlistenFirstLaunch = api.onFirstLaunchCompleted((value) => {
      setFirstLaunchComplete(Boolean(value));
    });

    return () => {
      mounted = false;
      unlistenFolder?.();
      unlistenFileChanged?.();
      unlistenFirstLaunch?.();
      void api.stopWatchingFolder?.();
    };
  }, [hydrateFolder, openFolderPath, refreshActiveFile]);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  const openFolder = useCallback(async () => {
    const api = getElectronApi();
    if (!api) {
      return null;
    }

    const folderPath = await api.openFolder();
    if (folderPath) {
      await hydrateFolder(folderPath);
    }
    return folderPath;
  }, [hydrateFolder]);

  const openFileInEditor = useCallback(async (filePath: string) => {
    const api = getElectronApi();
    if (!api) {
      return;
    }

    const result = await api.readFile(filePath);
    if (result.success) {
      setActiveFile(filePath);
      setActiveFileContent(result.content || "");
    }
  }, []);

  const saveFile = useCallback(async (filePath: string, content: string) => {
    const api = getElectronApi();
    if (!api) {
      return false;
    }

    const result = await api.writeFile(filePath, content);
    if (result.success) {
      setActiveFileContent(content);
      return true;
    }

    return false;
  }, []);

  const runCommand = useCallback(
    async (command: string) => {
      const api = getElectronApi();
      if (!api) {
        return null;
      }

      return api.runCommand(command, openFolderPath);
    },
    [openFolderPath]
  );

  const readFileForAI = useCallback(async (filePath: string) => {
    const api = getElectronApi();
    if (!api) {
      return null;
    }

    const result = await api.readFile(filePath);
    return result.success ? result.content || "" : null;
  }, []);

  const completeFirstLaunch = useCallback(async () => {
    const api = getElectronApi();
    if (!api) {
      setFirstLaunchComplete(true);
      return;
    }

    await api.storeSet("desktop.firstLaunchCompleted", true);
    setFirstLaunchComplete(true);
  }, []);

  return {
    activeFile,
    activeFileContent,
    completeFirstLaunch,
    fileTree,
    fileTreeLoading,
    firstLaunchComplete,
    folderLabel,
    isDesktop,
    openFileInEditor,
    openFolder,
    openFolderPath,
    platform,
    readFileForAI,
    runCommand,
    saveFile,
    setActiveFile,
    setActiveFileContent
  };
}
