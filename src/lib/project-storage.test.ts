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

  it("records baseplate and spacer counts in the summary", () => {
    const data = createTestProjectData();
    data.baseplateLayout = {
      items: [
        { id: "bp-a", gridX: 0, gridY: 0, gridUnitsX: 2, gridUnitsY: 2 },
        { id: "bp-b", gridX: 2, gridY: 0, gridUnitsX: 2, gridUnitsY: 2 },
      ],
      spacers: [
        { id: "sp-a", side: "right", offset: 0, length: 1 },
        { id: "sp-b", side: "right", offset: 1, length: 1 },
        { id: "sp-c", side: "right", offset: 2, length: 1 },
      ],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    saveProject("WithBaseplates", data);
    const entry = listProjects()[0]!;
    expect(entry.baseplateCount).toBe(2);
    expect(entry.spacerCount).toBe(3);
  });

  it("records zero baseplate/spacer counts when baseplateLayout is absent", () => {
    saveProject("PlainProject", createTestProjectData());
    const entry = listProjects()[0]!;
    expect(entry.baseplateCount).toBe(0);
    expect(entry.spacerCount).toBe(0);
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
