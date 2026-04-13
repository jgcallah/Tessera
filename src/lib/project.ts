import type { GridConfig } from "./grid-config";
import type { SpaceConfig } from "./space-config";
import type { BinConfig } from "./bin-config";
import type { BaseplateConfig } from "./baseplate-config";
import type { LayoutState } from "./layout";
import type { PrintBedConfig } from "./print-planner";

export interface ProjectData {
  version: 1;
  gridConfig: GridConfig;
  spaceConfig: SpaceConfig;
  binConfig: BinConfig;
  baseplateConfig: BaseplateConfig;
  layout: LayoutState;
  printBed?: PrintBedConfig;
}

export function serializeProject(
  data: Omit<ProjectData, "version">
): string {
  const project: ProjectData = { version: 1, ...data };
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): ProjectData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }

  if (!validateProjectData(parsed)) {
    throw new Error("Invalid project data");
  }

  return parsed;
}

export function validateProjectData(data: unknown): data is ProjectData {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (obj["version"] !== 1) return false;

  const requiredKeys = [
    "gridConfig",
    "spaceConfig",
    "binConfig",
    "baseplateConfig",
    "layout",
  ];
  for (const key of requiredKeys) {
    if (typeof obj[key] !== "object" || obj[key] === null) return false;
  }

  // Validate gridConfig has expected shape
  const gc = obj["gridConfig"] as Record<string, unknown>;
  if (typeof gc["baseUnit"] !== "number") return false;
  if (typeof gc["mode"] !== "string") return false;

  // Validate spaceConfig
  const sc = obj["spaceConfig"] as Record<string, unknown>;
  if (typeof sc["width"] !== "number") return false;

  // Validate layout
  const layout = obj["layout"] as Record<string, unknown>;
  if (!Array.isArray(layout["items"])) return false;

  return true;
}

export function downloadProjectFile(
  data: ProjectData,
  filename = "tessera-project.json"
): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
