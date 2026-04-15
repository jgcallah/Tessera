import { describe, it, expect } from "vitest";
import {
  serializeProject,
  deserializeProject,
  validateProjectData,
} from "./project";
import type { ProjectData } from "./project";
import { createDefaultGridConfig } from "./grid-config";
import { createDefaultSpaceConfig } from "./space-config";
import { createDefaultBinConfig } from "./bin-config";
import { createDefaultBaseplateConfig } from "./baseplate-config";

function createTestProject(): Omit<ProjectData, "version"> {
  return {
    gridConfig: createDefaultGridConfig(),
    spaceConfig: createDefaultSpaceConfig(),
    binConfig: createDefaultBinConfig(),
    baseplateConfig: createDefaultBaseplateConfig(),
    layout: { items: [], gridUnitsX: 9, gridUnitsY: 7 },
    baseplateLayout: {
      items: [{ id: "bp-1", gridX: 0, gridY: 0, gridUnitsX: 3, gridUnitsY: 2 }],
      spacers: [{ id: "sp-1", side: "right", offset: 0, length: 2 }],
      gridUnitsX: 9,
      gridUnitsY: 7,
    },
  };
}

// ── Serialization ────────────────────────────────────────────────────────────

describe("serializeProject", () => {
  it("returns a JSON string", () => {
    const json = serializeProject(createTestProject());
    expect(typeof json).toBe("string");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes version field", () => {
    const json = serializeProject(createTestProject());
    const parsed = JSON.parse(json) as ProjectData;
    expect(parsed.version).toBe(1);
  });

  it("round-trips all configs", () => {
    const original = createTestProject();
    const json = serializeProject(original);
    const restored = deserializeProject(json);
    expect(restored.gridConfig).toEqual(original.gridConfig);
    expect(restored.spaceConfig).toEqual(original.spaceConfig);
    expect(restored.binConfig).toEqual(original.binConfig);
    expect(restored.baseplateConfig).toEqual(original.baseplateConfig);
    expect(restored.layout).toEqual(original.layout);
    expect(restored.baseplateLayout).toEqual(original.baseplateLayout);
  });
});

// ── Deserialization ──────────────────────────────────────────────────────────

describe("deserializeProject", () => {
  it("parses valid project JSON", () => {
    const json = serializeProject(createTestProject());
    const project = deserializeProject(json);
    expect(project.version).toBe(1);
    expect(project.gridConfig.baseUnit).toBe(42);
  });

  it("throws on invalid JSON", () => {
    expect(() => deserializeProject("not json")).toThrow("Invalid JSON");
  });

  it("throws on missing version", () => {
    const json = JSON.stringify({ gridConfig: {} });
    expect(() => deserializeProject(json)).toThrow("Invalid project data");
  });

  it("throws on wrong version", () => {
    const data = { ...createTestProject(), version: 99 };
    const json = JSON.stringify(data);
    expect(() => deserializeProject(json)).toThrow("Invalid project data");
  });

  it("throws on missing required fields", () => {
    const json = JSON.stringify({ version: 1 });
    expect(() => deserializeProject(json)).toThrow("Invalid project data");
  });
});

// ── Validation ───────────────────────────────────────────────────────────────

describe("validateProjectData", () => {
  it("validates correct project data", () => {
    const data = JSON.parse(serializeProject(createTestProject()));
    expect(validateProjectData(data)).toBe(true);
  });

  it("rejects null", () => {
    expect(validateProjectData(null)).toBe(false);
  });

  it("rejects string", () => {
    expect(validateProjectData("hello")).toBe(false);
  });

  it("rejects missing version", () => {
    expect(validateProjectData({ gridConfig: {} })).toBe(false);
  });

  it("rejects missing gridConfig", () => {
    const data = { version: 1, spaceConfig: {}, binConfig: {}, baseplateConfig: {}, layout: { items: [] } };
    expect(validateProjectData(data)).toBe(false);
  });

  it("rejects gridConfig without baseUnit", () => {
    const data = JSON.parse(serializeProject(createTestProject()));
    data.gridConfig = { mode: "gridfinity" }; // missing baseUnit
    expect(validateProjectData(data)).toBe(false);
  });
});
