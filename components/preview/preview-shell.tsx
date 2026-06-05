"use client";

import { CheckCircle2, ExternalLink, MonitorPlay, Rocket, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import { ProjectWorkspaceTabs } from "@/components/workspace/project-workspace-tabs";
import type { AuthUser } from "@/lib/auth-types";
import type { WorkspacePreviewVersion, WorkspaceProject } from "@/lib/chat-types";

type PreviewStatus = WorkspacePreviewVersion["status"];

function formatPreviewStatus(status: PreviewStatus) {
  if (status === "deploy_ready") {
    return "deploy-ready";
  }

  return status;
}

export function PreviewShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [previews, setPreviews] = useState<WorkspacePreviewVersion[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProjects(Array.isArray(payload) ? payload : []));
  }, []);

  const projectId = searchParams.get("project") || projects[0]?.id || null;
  const sessionId = searchParams.get("session");
  const activeProject = projects.find((project) => project.id === projectId) || null;

  async function loadPreviews() {
    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    if (sessionId) {
      params.set("sessionId", sessionId);
    }
    params.set("limit", "24");
    const response = await fetch(`/api/previews?${params}`, { cache: "no-store" });
    const payload = await response.json();
    setPreviews(Array.isArray(payload) ? payload : []);
  }

  useEffect(() => {
    void loadPreviews();
  }, [projectId, sessionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadPreviews();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [projectId, sessionId]);

  const latestPreview = previews[0] || null;
  const previewSrc = latestPreview?.routePath || "/";
  const previewPayload = latestPreview?.previewPayload || null;

  const previewStatusLabel = useMemo(() => {
    if (!latestPreview) {
      return "Waiting for the next coding checkpoint";
    }
    if (latestPreview.status === "approved") {
      return `Preview Version ${latestPreview.versionNumber} approved`;
    }
    if (latestPreview.status === "deploy_ready") {
      return `Preview Version ${latestPreview.versionNumber} is deploy-ready`;
    }
    return `Preview Version ${latestPreview.versionNumber} live`;
  }, [latestPreview]);

  async function updatePreview(previewId: string, status: PreviewStatus) {
    setUpdatingId(previewId);
    await fetch(`/api/previews/${previewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        approvedAt: status === "approved" ? new Date().toISOString() : undefined,
        deployedAt: status === "deploy_ready" ? new Date().toISOString() : undefined
      })
    });
    setUpdatingId(null);
    await loadPreviews();
  }

  return (
    <WorkspacePageShell statusLabel="Preview" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <WorkspacePageHero
          description="Watch your project evolve in real time. Xeivora tracks visual checkpoints while AI is working, then remembers which preview was approved and which version was marked deploy-ready."
          eyebrow="Project workspace"
          title="Live Preview keeps visual progress inside project continuity"
        />

        <ProjectWorkspaceTabs active="preview" projectId={projectId} sessionId={sessionId} className="pt-1" />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <WorkspaceCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[color:var(--site-border)] px-5 py-4">
              <div>
                <div className="text-[15px] font-medium text-[var(--site-text)]">{activeProject?.name || "Live Preview"}</div>
                <div className="mt-1 text-[12px] text-[var(--site-subtle)]">{previewStatusLabel}</div>
              </div>
              <div className="flex items-center gap-2">
                <WorkspaceBadge tone="learning">Auto-refresh on</WorkspaceBadge>
                {previewPayload?.renderMode === "html" && previewPayload.srcDoc ? (
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--site-border)] text-[var(--site-subtle)] transition hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
                    onClick={() => {
                      const nextWindow = window.open("", "_blank", "noopener,noreferrer");
                      if (nextWindow) {
                        nextWindow.document.open();
                        nextWindow.document.write(previewPayload.srcDoc || "");
                        nextWindow.document.close();
                      }
                    }}
                    type="button"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                ) : (
                  <a
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--site-border)] text-[var(--site-subtle)] transition hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
                    href={previewSrc}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--site-border)] text-[var(--site-subtle)] transition hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {latestPreview ? (
              <div className="bg-[var(--site-panel)] p-4">
                <div className="overflow-hidden rounded-[16px] border border-[color:var(--site-border)] bg-[var(--site-bg)]">
                  {previewPayload?.renderMode === "html" && previewPayload.srcDoc ? (
                    <iframe
                      className="h-[680px] w-full bg-white"
                      key={`${latestPreview.id}-${refreshKey}-${previewPayload.srcDoc.length}`}
                      sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
                      srcDoc={previewPayload.srcDoc}
                      title={`Preview Version ${latestPreview.versionNumber}`}
                    />
                  ) : (
                    <div className="flex h-[680px] items-center justify-center p-8 text-center">
                      <div>
                        <div className="text-[18px] font-medium text-[var(--site-text)]">Preview could not render this output.</div>
                        <p className="mt-3 max-w-[420px] text-[14px] leading-7 text-[var(--site-subtle)]">
                          {previewPayload?.reason || "Xeivora can currently render HTML, CSS, and JavaScript preview output here."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <WorkspaceEmptyState
                  description="Ask Xeivora to continue coding work and a live preview version will appear here automatically."
                  title="No preview version yet"
                />
              </div>
            )}
          </WorkspaceCard>

          <div className="space-y-4">
            <WorkspaceCard className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                  <MonitorPlay className="h-4 w-4" />
                </div>
                <div>
                  <WorkspaceSectionTitle>Preview memory</WorkspaceSectionTitle>
                  <p className="mt-2 text-sm leading-7 text-[var(--site-subtle)]">
                    Preview versions become part of project history, so you can later see what changed, which version was approved, and which version was ready for the next handoff.
                  </p>
                </div>
              </div>
            </WorkspaceCard>

            <WorkspaceCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSectionTitle>Preview versions</WorkspaceSectionTitle>
                <WorkspaceBadge tone="standby">{previews.length} tracked</WorkspaceBadge>
              </div>
              <div className="mt-4 space-y-3">
                {previews.length ? (
                  previews.map((preview) => (
                    <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4" key={preview.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[14px] font-medium text-[var(--site-text)]">
                            Version {preview.versionNumber} · {preview.title}
                          </div>
                          <p className="mt-2 text-[13px] leading-6 text-[var(--site-subtle)]">{preview.summary}</p>
                        </div>
                        <WorkspaceBadge tone={preview.status === "approved" || preview.status === "deploy_ready" ? "learning" : "standby"}>
                          {formatPreviewStatus(preview.status)}
                        </WorkspaceBadge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--site-subtle)]">
                        <span>{preview.routePath}</span>
                        <span>{new Date(preview.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>

                      {preview.changedFiles.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {preview.changedFiles.map((file) => (
                            <WorkspaceBadge key={`${preview.id}-${file}`} tone="standby">
                              {file}
                            </WorkspaceBadge>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {preview.status !== "approved" ? (
                          <WorkspaceButton
                            className="px-3 py-2 text-[12px]"
                            disabled={updatingId === preview.id}
                            onClick={() => void updatePreview(preview.id, "approved")}
                            variant="secondary"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </WorkspaceButton>
                        ) : null}
                        {preview.status !== "deploy_ready" ? (
                          <WorkspaceButton
                            className="px-3 py-2 text-[12px]"
                            disabled={updatingId === preview.id}
                            onClick={() => void updatePreview(preview.id, "deploy_ready")}
                            variant="secondary"
                          >
                            <Rocket className="h-4 w-4" />
                            Mark deploy-ready
                          </WorkspaceButton>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-[var(--site-subtle)]">Preview history will appear as Xeivora generates code checkpoints.</div>
                )}
              </div>
            </WorkspaceCard>
          </div>
        </div>
      </div>
    </WorkspacePageShell>
  );
}
