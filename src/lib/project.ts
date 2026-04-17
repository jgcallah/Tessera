import type { GridConfig } from "./grid-config";
import { validateGridConfig } from "./grid-config";
import type { SpaceConfig } from "./space-config";
import { validateSpaceConfig } from "./space-config";
import type { BinConfig } from "./bin-config";
import { validateBinConfig } from "./bin-config";
import type { BaseplateConfig } from "./baseplate-config";
import { validateBaseplateConfig } from "./baseplate-config";
import type { LayoutState } from "./layout";
import type { BaseplateLayoutState } from "./baseplate-layout";
import type { PrintBedConfig } from "./print-planner";
import { validatePrintBedConfig } from "./print-planner";

export interface ProjectData {
  version: 1;
  gridConfig: GridConfig;
  spaceConfig: SpaceConfig;
  binConfig: BinConfig;
  baseplateConfig: BaseplateConfig;
  layout: LayoutState;
  baseplateLayout?: BaseplateLayoutState;
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

  const failure = findValidationFailure(parsed);
  if (failure !== null) {
    throw new Error(`Invalid project data: ${failure}`);
  }

  return parsed as ProjectData;
}

export function validateProjectData(data: unknown): data is ProjectData {
  return findValidationFailure(data) === null;
}

function findValidationFailure(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return "root";

  const obj = data as Record<string, unknown>;

  if (obj["version"] !== 1) return "version";

  const requiredKeys = [
    "gridConfig",
    "spaceConfig",
    "binConfig",
    "baseplateConfig",
    "layout",
  ] as const;
  for (const key of requiredKeys) {
    if (typeof obj[key] !== "object" || obj[key] === null) return key;
  }

  const gc = obj["gridConfig"] as Record<string, unknown>;
  if (typeof gc["baseUnit"] !== "number") return "gridConfig";
  if (typeof gc["mode"] !== "string") return "gridConfig";

  const sc = obj["spaceConfig"] as Record<string, unknown>;
  if (typeof sc["width"] !== "number") return "spaceConfig";

  const layout = obj["layout"] as Record<string, unknown>;
  if (!Array.isArray(layout["items"])) return "layout";

  const gridCheck = validateGridConfig(obj["gridConfig"] as GridConfig);
  if (!gridCheck.valid) return `gridConfig (${gridCheck.errors[0]})`;

  const spaceCheck = validateSpaceConfig(obj["spaceConfig"] as SpaceConfig);
  if (!spaceCheck.valid) return `spaceConfig (${spaceCheck.errors[0]})`;

  const binCheck = validateBinConfig(obj["binConfig"] as BinConfig);
  if (!binCheck.valid) return `binConfig (${binCheck.errors[0]})`;

  const bpCheck = validateBaseplateConfig(
    obj["baseplateConfig"] as BaseplateConfig
  );
  if (!bpCheck.valid) return `baseplateConfig (${bpCheck.errors[0]})`;

  if (obj["printBed"] !== undefined) {
    if (typeof obj["printBed"] !== "object" || obj["printBed"] === null) {
      return "printBed";
    }
    const pbCheck = validatePrintBedConfig(obj["printBed"] as PrintBedConfig);
    if (!pbCheck.valid) return `printBed (${pbCheck.errors[0]})`;
  }

  if (obj["baseplateLayout"] !== undefined) {
    if (!isValidBaseplateLayoutShape(obj["baseplateLayout"])) {
      return "baseplateLayout";
    }
  }

  return null;
}

const SPACER_SIDES = new Set(["left", "right", "top", "bottom"]);

function isValidBaseplateLayoutShape(bl: unknown): boolean {
  if (typeof bl !== "object" || bl === null) return false;
  const obj = bl as Record<string, unknown>;
  if (!Array.isArray(obj["items"])) return false;
  if (!Array.isArray(obj["spacers"])) return false;
  if (typeof obj["gridUnitsX"] !== "number") return false;
  if (typeof obj["gridUnitsY"] !== "number") return false;

  for (const raw of obj["items"]) {
    if (typeof raw !== "object" || raw === null) return false;
    const it = raw as Record<string, unknown>;
    if (typeof it["id"] !== "string") return false;
    if (typeof it["gridX"] !== "number") return false;
    if (typeof it["gridY"] !== "number") return false;
    if (typeof it["gridUnitsX"] !== "number") return false;
    if (typeof it["gridUnitsY"] !== "number") return false;
  }

  for (const raw of obj["spacers"]) {
    if (typeof raw !== "object" || raw === null) return false;
    const sp = raw as Record<string, unknown>;
    if (typeof sp["id"] !== "string") return false;
    if (typeof sp["side"] !== "string" || !SPACER_SIDES.has(sp["side"])) {
      return false;
    }
    if (typeof sp["offset"] !== "number") return false;
    if (typeof sp["length"] !== "number") return false;
  }

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
