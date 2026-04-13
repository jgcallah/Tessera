import type { ProjectData } from "./project";

const STORAGE_KEY = "tessera-projects";

export interface ProjectSummary {
  id: string;
  name: string;
  savedAt: string; // ISO date string
}

interface StoredProject {
  summary: ProjectSummary;
  data: ProjectData;
}

interface StorageIndex {
  projects: ProjectSummary[];
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

function getIndex(): StorageIndex {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { projects: [] };
  try {
    return JSON.parse(raw) as StorageIndex;
  } catch {
    return { projects: [] };
  }
}

function setIndex(index: StorageIndex): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
}

function projectKey(id: string): string {
  return `tessera-project-${id}`;
}

function generateId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function saveProject(
  name: string,
  data: ProjectData,
  existingId?: string
): string {
  const id = existingId ?? generateId();
  const now = new Date().toISOString();

  const summary: ProjectSummary = { id, name, savedAt: now };
  const stored: StoredProject = { summary, data };

  localStorage.setItem(projectKey(id), JSON.stringify(stored));

  // Update index
  const index = getIndex();
  const existing = index.projects.findIndex((p) => p.id === id);
  if (existing !== -1) {
    index.projects[existing] = summary;
  } else {
    index.projects.push(summary);
  }
  setIndex(index);

  return id;
}

export function loadProject(
  id: string
): { name: string; data: ProjectData } | null {
  const raw = localStorage.getItem(projectKey(id));
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredProject;
    return { name: stored.summary.name, data: stored.data };
  } catch {
    return null;
  }
}

export function listProjects(): ProjectSummary[] {
  const index = getIndex();
  // Most recently saved first
  return [...index.projects].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id));
  const index = getIndex();
  index.projects = index.projects.filter((p) => p.id !== id);
  setIndex(index);
}

export function renameProject(id: string, newName: string): void {
  const raw = localStorage.getItem(projectKey(id));
  if (!raw) return;

  const stored = JSON.parse(raw) as StoredProject;
  stored.summary.name = newName;
  stored.summary.savedAt = new Date().toISOString();
  localStorage.setItem(projectKey(id), JSON.stringify(stored));

  // Update index
  const index = getIndex();
  const entry = index.projects.find((p) => p.id === id);
  if (entry) {
    entry.name = newName;
    entry.savedAt = stored.summary.savedAt;
  }
  setIndex(index);
}
