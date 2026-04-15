import { useId } from "react";
import type {
  PrintBedConfig,
  PrintSheet,
  PackingResult,
  Placement,
  PackableItem,
} from "../lib/print-planner";
import { getBinColor } from "../lib/bin-colors";
import { BinShape, BaseplateShape } from "./partShapes";

const SHEET_SCALE = 1.0; // px per mm for sheet visualization

interface PrintSheetsViewProps {
  bedConfig: PrintBedConfig;
  packingResult: PackingResult | null;
  hasItems: boolean;
}

export function PrintSheetsView({
  bedConfig,
  packingResult,
  hasItems,
}: PrintSheetsViewProps): React.JSX.Element {
  if (!hasItems) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">
          Place bins or baseplates to generate a print plan.
        </p>
      </div>
    );
  }

  if (!packingResult) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">
          Fix bed configuration to see sheets.
        </p>
      </div>
    );
  }

  if (packingResult.sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">
          No parts fit on the current build plate.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap content-start gap-4"
      data-testid="sheet-list"
    >
      {packingResult.sheets.map((sheet) => (
        <SheetView key={sheet.index} sheet={sheet} bedConfig={bedConfig} />
      ))}
    </div>
  );
}

function SheetView({
  sheet,
  bedConfig,
}: {
  sheet: PrintSheet;
  bedConfig: PrintBedConfig;
}) {
  const svgW = bedConfig.bedWidth * SHEET_SCALE;
  const svgH = bedConfig.bedLength * SHEET_SCALE;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-400">
        Sheet {sheet.index + 1}{" "}
        <span className="text-zinc-600">
          ({sheet.placements.length} parts)
        </span>
      </p>
      <svg
        width={svgW}
        height={svgH}
        className="rounded border border-zinc-700 bg-zinc-900 shadow-inner"
        data-testid={`sheet-${sheet.index}`}
      >
        {sheet.placements.map((p, i) => (
          <PlacementShape key={i} placement={p} />
        ))}
      </svg>
    </div>
  );
}

function colorFor(item: PackableItem): string {
  const ux = item.gridUnitsX ?? 1;
  const uy = item.gridUnitsY ?? 1;
  return getBinColor(ux, uy);
}

function PlacementShape({
  placement,
}: {
  placement: Placement;
}): React.JSX.Element {
  const { item, x, y, rotated } = placement;
  const kind = item.kind ?? "bin";
  const w = item.width * SHEET_SCALE;
  const h = item.length * SHEET_SCALE;
  const px = x * SHEET_SCALE;
  const py = y * SHEET_SCALE;
  const color = colorFor(item);
  const cx = px + w / 2;
  const cy = py + h / 2 + 3;
  const label = rotated ? `${item.label} ↻` : item.label;

  if (kind === "baseplate") {
    const cellsAcross = rotated
      ? (item.gridUnitsY ?? 1)
      : (item.gridUnitsX ?? 1);
    const cellsDown = rotated
      ? (item.gridUnitsX ?? 1)
      : (item.gridUnitsY ?? 1);
    return (
      <g>
        <BaseplateShape
          x={px}
          y={py}
          width={w}
          height={h}
          cellsX={cellsAcross}
          cellsY={cellsDown}
          color={color}
          showMagnetHoles={item.showMagnetHoles ?? false}
          showScrewHoles={item.showScrewHoles ?? false}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          className="pointer-events-none select-none fill-zinc-100 text-[9px] font-mono"
        >
          {label}
        </text>
      </g>
    );
  }

  if (kind === "spacer") {
    return (
      <SpacerPlacement
        px={px}
        py={py}
        w={w}
        h={h}
        color={color}
        rotated={rotated}
        cellsLong={
          rotated ? (item.gridUnitsX ?? 1) : (item.gridUnitsY ?? 1)
        }
        showMagnetHoles={item.showMagnetHoles ?? false}
        showScrewHoles={item.showScrewHoles ?? false}
      />
    );
  }

  if (kind === "snap-clip") {
    return (
      <rect
        x={px}
        y={py}
        width={w}
        height={h}
        rx={1}
        fill="#52525b"
        stroke="#71717a"
        strokeWidth={0.5}
      />
    );
  }

  // Bin (default) — rendered below via BinShape
  return <BinPlacement px={px} py={py} w={w} h={h} color={color} item={item} rotated={rotated} label={label} cx={cx} cy={cy} />;
}

function SpacerPlacement({
  px,
  py,
  w,
  h,
  color,
  rotated,
  cellsLong,
  showMagnetHoles,
  showScrewHoles,
}: {
  px: number;
  py: number;
  w: number;
  h: number;
  color: string;
  rotated: boolean;
  cellsLong: number;
  showMagnetHoles: boolean;
  showScrewHoles: boolean;
}): React.JSX.Element {
  const clipId = useId();
  // The long axis in screen space swaps on rotation. Full-cell size is
  // length / cellsLong (always = gridConfig.baseUnit at SHEET_SCALE=1).
  const longAxisPx = rotated ? w : h;
  const shortAxisPx = rotated ? h : w;
  const fullCell = longAxisPx / Math.max(1, cellsLong);
  const shortPad = (fullCell - shortAxisPx) / 2;

  const baseX = rotated ? px : px - shortPad;
  const baseY = rotated ? py - shortPad : py;
  const baseW = rotated ? longAxisPx : fullCell;
  const baseH = rotated ? fullCell : longAxisPx;
  const bpCellsX = rotated ? cellsLong : 1;
  const bpCellsY = rotated ? 1 : cellsLong;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={px} y={py} width={w} height={h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <BaseplateShape
          x={baseX}
          y={baseY}
          width={baseW}
          height={baseH}
          cellsX={bpCellsX}
          cellsY={bpCellsY}
          color={color}
          showMagnetHoles={showMagnetHoles}
          showScrewHoles={showScrewHoles}
        />
      </g>
      {/* Outer outline — long-side cut edges have no rim material when the
          spacer is thinner than a socket, so a colored stroke makes the
          spacer's actual extent visible. */}
      <rect
        x={px}
        y={py}
        width={w}
        height={h}
        rx={Math.min(w, h) * 0.08}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeOpacity={0.95}
      />
    </g>
  );
}

function BinPlacement({
  px,
  py,
  w,
  h,
  color,
  item,
  rotated,
  label,
  cx,
  cy,
}: {
  px: number;
  py: number;
  w: number;
  h: number;
  color: string;
  item: PackableItem;
  rotated: boolean;
  label: string;
  cx: number;
  cy: number;
}): React.JSX.Element {
  const cellsAcross = rotated
    ? (item.gridUnitsY ?? 1)
    : (item.gridUnitsX ?? 1);
  const cellsDown = rotated
    ? (item.gridUnitsX ?? 1)
    : (item.gridUnitsY ?? 1);
  return (
    <g>
      <BinShape
        x={px}
        y={py}
        width={w}
        height={h}
        cellsX={cellsAcross}
        cellsY={cellsDown}
        color={color}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        className="pointer-events-none select-none fill-zinc-100 text-[9px] font-mono"
      >
        {label}
      </text>
    </g>
  );
}
