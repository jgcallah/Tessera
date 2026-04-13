import { describe, it, expect, beforeEach } from "vitest";
import {
  saveProject,
  loadProject,
  listProjects,
  deleteProject,
  renameProject,
} from "./project-storage";
import type { ProjectSummary } from "./project-storage";
import type { ProjectData } from "./project";
import { createDefaultGridConfig } from "./grid-config";
import { createDefaultSpaceConfig } from "./space-config";
import { createDefaultBinConfig } from "./bin-config";
import { createDefaultBaseplateConfig } from "./baseplate-config";

function createTestProjectData(): ProjectData {
  return {
    version: 1,
    gridConfig: createDefaultGridConfig(),
    spaceConfig: createDefaultSpaceConfig(),
    binConfig: createDefaultBinConfig(),
    baseplateConfig: createDefaultBaseplateConfig(),
    layout: { items: [], gridUnitsX: 9, gridUnitsY: 7 },
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ── Save & Load ──────────────────────────────────────────────────────────────

describe("saveProject", () => {
  it("saves a project and returns its id", () => {
    const id = saveProject("My Drawer", createTestProjectData());
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("saves to an existing id (overwrite)", () => {
    const id = saveProject("My Drawer", createTestProjectData());
    const data = createTestProjectData();
    data.spaceConfig.width = 999;
    saveProject("My Drawer", data, id);
    const loaded = loadProject(id);
    expect(loaded?.data.spaceConfig.width).toBe(999);
  });
});

describe("loadProject", () => {
  it("loads a previously saved project", () => {
    const data = createTestProjectData();
    const id = saveProject("Test", data);
    const loaded = loadProject(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe("Test");
    expect(loaded!.data.gridConfig.baseUnit).toBe(42);
  });

  it("returns null for unknown id", () => {
    expect(loadProject("nonexistent")).toBeNull();
  });
});

// ── List ─────────────────────────────────────────────────────────────────────

describe("listProjects", () => {
  it("returns empty array when no projects saved", () => {
    expect(listProjects()).toEqual([]);
  });

  it("lists saved projects", () => {
    saveProject("Project A", createTestProjectData());
    saveProject("Project B", createTestProjectData());
    const list = listProjects();
    expect(list).toHaveLength(2);
    const names = list.map((p: ProjectSummary) => p.name);
    expect(names).toContain("Project A");
    expect(names).toContain("Project B");
  });

  it("includes id, name, and savedAt in each entry", () => {
    saveProject("Test", createTestProjectData());
    const list = listProjects();
    const entry = list[0]!;
    expect(entry.id).toBeTruthy();
    expect(entry.name).toBe("Test");
    expect(entry.savedAt).toBeTruthy();
  });

  it("returns projects in saved order (most recent last added)", () => {
    saveProject("Project A", createTestProjectData());
    saveProject("Project B", createTestProjectData());
    const list = listProjects();
    expect(list).toHaveLength(2);
    // Both present
    const names = list.map((p) => p.name);
    expect(names).toContain("Project A");
    expect(names).toContain("Project B");
  });
});

// ── Delete ───────────────────────────────────────────────────────────────────

describe("deleteProject", () => {
  it("removes a project by id", () => {
    const id = saveProject("Test", createTestProjectData());
    deleteProject(id);
    expect(loadProject(id)).toBeNull();
    expect(listProjects()).toHaveLength(0);
  });

  it("does nothing for unknown id", () => {
    saveProject("Test", createTestProjectData());
    deleteProject("nonexistent");
    expect(listProjects()).toHaveLength(1);
  });
});

// ── Rename ───────────────────────────────────────────────────────────────────

describe("renameProject", () => {
  it("updates the project name", () => {
    const id = saveProject("Old Name", createTestProjectData());
    renameProject(id, "New Name");
    const loaded = loadProject(id);
    expect(loaded!.name).toBe("New Name");
  });
});
