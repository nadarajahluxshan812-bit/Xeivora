"use client";

import { FileText, FolderKanban, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSearchInput,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { UploadedFileSummary, WorkspaceProject } from "@/lib/chat-types";

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type FileCategory = "Code" | "Documents" | "Images" | "Audio" | "Video";

const FILE_CATEGORY_ORDER: FileCategory[] = ["Code", "Documents", "Images", "Audio", "Video"];

const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".rb", ".go", ".rs", ".java", ".kt", ".c", ".h",
  ".cpp", ".cc", ".cs", ".php", ".swift", ".html", ".css", ".scss", ".sass", ".json",
  ".sh", ".bash", ".zsh", ".sql", ".yml", ".yaml", ".toml", ".vue", ".svelte", ".lua", ".r"
];

// Presentation-only categorisation derived from stored mimeType/name/kind. Storage is unchanged.
function categorizeFile(file: UploadedFileSummary): FileCategory {
  const mime = (file.mimeType || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (mime.startsWith("image/") || file.kind === "image") {
    return "Images";
  }
  if (mime.startsWith("audio/")) {
    return "Audio";
  }
  if (mime.startsWith("video/")) {
    return "Video";
  }
  if (file.kind === "json" || CODE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Code";
  }
  return "Documents";
}

export function FilesShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [files, setFiles] = useState<UploadedFileSummary[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProjects(Array.isArray(payload) ? payload : []));
  }, []);

  const projectId = searchParams.get("project") || projects[0]?.id || null;
  const activeProject = projects.find((project) => project.id === projectId) || null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }

    const suffix = params.toString() ? `?${params}` : "";
    void fetch(`/api/files${suffix}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setFiles(Array.isArray(payload) ? payload : []));
  }, [projectId]);

  const filteredFiles = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      return files;
    }

    return files.filter((file) =>
      `${file.name} ${file.summary || ""} ${file.previewText || ""}`.toLowerCase().includes(lower)
    );
  }, [files, query]);

  const groupedFiles = useMemo(() => {
    const map: Record<FileCategory, UploadedFileSummary[]> = {
      Code: [],
      Documents: [],
      Images: [],
      Audio: [],
      Video: []
    };
    for (const file of filteredFiles) {
      map[categorizeFile(file)].push(file);
    }
    return map;
  }, [filteredFiles]);

  return (
    <WorkspacePageShell statusLabel="Project Files" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <WorkspacePageHero
          description="Files stay attached to the project so every model can continue with the same source material, screenshots, specs, and structured context."
          eyebrow="Project workspace"
          title="Files that travel with the work"
        />

        <WorkspaceCard className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <WorkspaceSectionTitle>{activeProject?.name || "Project files"}</WorkspaceSectionTitle>
              <p className="mt-2 max-w-[42rem] text-sm leading-7 text-[var(--site-subtle)]">
                Every file below stays available when you resume the project or switch models, so Xeivora can continue without rebuilding context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <WorkspaceBadge tone="learning">{filteredFiles.length} files attached</WorkspaceBadge>
              <WorkspaceBadge tone="standby">Context preserved across models</WorkspaceBadge>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceSearchInput onChange={setQuery} placeholder="Search files, summaries, or extracted text" value={query} />

        {filteredFiles.length ? (
          <div className="space-y-6">
            {FILE_CATEGORY_ORDER.filter((category) => groupedFiles[category].length > 0).map((category) => (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <WorkspaceSectionTitle>{category}</WorkspaceSectionTitle>
                  <WorkspaceBadge tone="standby">{groupedFiles[category].length}</WorkspaceBadge>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {groupedFiles[category].map((file) => (
                    <WorkspaceCard className="p-5" key={file.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-[15px] font-medium text-[var(--site-text)]">{file.name}</h2>
                            <WorkspaceBadge tone={file.analysisStatus === "ready" ? "learning" : "standby"}>
                              {file.analysisStatus}
                            </WorkspaceBadge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[var(--site-subtle)]">
                            <span>{file.kind.toUpperCase()}</span>
                            <span>{formatBytes(file.size)}</span>
                            <span>{new Date(file.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[var(--site-subtle)]">
                            {file.summary || file.previewText || "Xeivora stored this file for continuity across the project."}
                          </p>
                        </div>
                      </div>
                    </WorkspaceCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            description="Attach a spec, screenshot, transcript, or code artifact in Chat and it will appear here as part of the project continuity trail."
            title="No project files yet"
          />
        )}

        <WorkspaceCard className="p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div>
              <WorkspaceSectionTitle>Why files matter for continuity</WorkspaceSectionTitle>
              <p className="mt-2 max-w-[46rem] text-sm leading-7 text-[var(--site-subtle)]">
                Xeivora remembers which files shaped the work, so when you return later or hand off to a different model, the same project evidence stays attached to the conversation.
              </p>
            </div>
          </div>
        </WorkspaceCard>
      </div>
    </WorkspacePageShell>
  );
}
