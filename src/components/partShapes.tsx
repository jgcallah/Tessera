/**
 * Shared SVG "looking down on the part" shapes for bins, baseplates, and
 * spacers. Wall thicknesses and corner radii are derived from real
 * Gridfinity dimensions (in mm) scaled against the per-cell size — so a
 * 4×4 baseplate has the same wall thickness as a 1×1, matching what you'd
 * see looking straight down at the printed part.
 */

// ── Gridfinity-derived ratios ──────────────────────────────────────────────
// All ratios are length / 42 mm (one grid cell).

/** Bin exterior wall thickness, 1.2 mm ÷ 42 mm. */
const BIN_WALL_RATIO = 1.2 / 42;
/** Bin outer corner radius, 3.75 mm ÷ 42 mm. */
const BIN_CORNER_RATIO = 3.75 / 42;

/** Half of the baseplate rim wall (2.4 mm shared between two cells). */
const BASEPLATE_HALF_RIM_RATIO = 1.2 / 42;
/** Baseplate outer corner radius, 4.0 mm ÷ 42 mm. */
const BASEPLATE_CORNER_RATIO = 4.0 / 42;
/** Extra inset from the socket wall to the cavity, 0.4 mm ÷ 42 mm. */
const BASEPLATE_LEDGE_RATIO = 0.4 / 42;
/** Total inset from cell edge to socket interior. */
const SOCKET_INSET_RATIO = BASEPLATE_HALF_RIM_RATIO + BASEPLATE_LEDGE_RATIO;
/** Magnet hole diameter (6 mm) ÷ 42 mm. */
const MAGNET_HOLE_RATIO = 6 / 42;
/** Screw hole diameter (3 mm) ÷ 42 mm. */
const SCREW_HOLE_RATIO = 3 / 42;
/** Magnet hole center offset from socket center, 13 mm ÷ 42 mm. */
const MAGNET_OFFSET_RATIO = 13 / 42;

/** Minimum drawn thickness/radius in px — below this, anti-aliasing blurs it out. */
const MIN_PX = 0.75;

// ── Bin ────────────────────────────────────────────────────────────────────

interface BinShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Gridfinity cells along each axis — used to scale thickness realistically. */
  cellsX: number;
  cellsY: number;
  /** Body color (wall/rim). */
  color: string;
  /** Body opacity — useful for ghost/preview states. */
  opacity?: number;
  /** Number of divider walls along each axis (0 = no dividers). */
  dividersX?: number;
  dividersY?: number;
  /** Draw a scoop curve on the −Y (top) interior wall. */
  includeScoop?: boolean;
}

export function BinShape({
  x,
  y,
  width,
  height,
  cellsX,
  cellsY,
  color,
  opacity = 1,
  dividersX = 0,
  dividersY = 0,
  includeScoop = false,
}: BinShapeProps): React.JSX.Element {
  const cellSize = Math.min(
    width / Math.max(1, cellsX),
    height / Math.max(1, cellsY)
  );
  const wall = Math.max(MIN_PX, cellSize * BIN_WALL_RATIO);
  const outerRx = Math.max(MIN_PX, cellSize * BIN_CORNER_RATIO);
  const innerRx = Math.max(0.5, outerRx - wall);
  const cavX = x + wall;
  const cavY = y + wall;
  const cavW = Math.max(0, width - 2 * wall);
  const cavH = Math.max(0, height - 2 * wall);
  const scoopRadius = Math.min(cavH * 0.6, cavW * 0.6);

  return (
    <g opacity={opacity}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={outerRx}
        fill={color}
      />
      {cavW > 0 && cavH > 0 && (
        <rect
          x={cavX}
          y={cavY}
          width={cavW}
          height={cavH}
          rx={innerRx}
          fill="#09090b"
          fillOpacity={0.55}
        />
      )}
      {includeScoop && cavW > 0 && cavH > 0 && (
        <path
          d={`M ${cavX} ${cavY + cavH}
              L ${cavX} ${cavY + cavH - scoopRadius}
              A ${scoopRadius} ${scoopRadius} 0 0 0 ${cavX + scoopRadius} ${cavY + cavH}
              Z`}
          fill={color}
          fillOpacity={0.8}
        />
      )}
      {Array.from({ length: dividersX }).map((_, i) => {
        const px = cavX + ((i + 1) / (dividersX + 1)) * cavW;
        return (
          <line
            key={`dx${i}`}
            x1={px}
            x2={px}
            y1={cavY}
            y2={cavY + cavH}
            stroke={color}
            strokeWidth={wall}
            strokeLinecap="butt"
          />
        );
      })}
      {Array.from({ length: dividersY }).map((_, i) => {
        const py = cavY + ((i + 1) / (dividersY + 1)) * cavH;
        return (
          <line
            key={`dy${i}`}
            x1={cavX}
            x2={cavX + cavW}
            y1={py}
            y2={py}
            stroke={color}
            strokeWidth={wall}
            strokeLinecap="butt"
          />
        );
      })}
    </g>
  );
}

// ── Baseplate ──────────────────────────────────────────────────────────────

interface BaseplateShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  cellsX: number;
  cellsY: number;
  color: string;
  opacity?: number;
  /** Four corner magnet hole indicators per socket. */
  showMagnetHoles?: boolean;
  /** Central screw hole indicator per socket. */
  showScrewHoles?: boolean;
}

export function BaseplateShape({
  x,
  y,
  width,
  height,
  cellsX,
  cellsY,
  color,
  opacity = 1,
  showMagnetHoles = false,
  showScrewHoles = false,
}: BaseplateShapeProps): React.JSX.Element {
  if (cellsX <= 0 || cellsY <= 0) return <g />;
  const cellW = width / cellsX;
  const cellH = height / cellsY;
  const cellSize = Math.min(cellW, cellH);
  const socketInset = Math.max(MIN_PX, cellSize * SOCKET_INSET_RATIO);
  const socketW = Math.max(0, cellW - 2 * socketInset);
  const socketH = Math.max(0, cellH - 2 * socketInset);
  const socketRx = Math.max(0.5, cellSize * BIN_CORNER_RATIO - socketInset);
  const outerRx = Math.max(MIN_PX, cellSize * BASEPLATE_CORNER_RATIO);
  const magnetR = Math.max(0.35, (cellSize * MAGNET_HOLE_RATIO) / 2);
  const screwR = Math.max(0.25, (cellSize * SCREW_HOLE_RATIO) / 2);
  const magnetOffset = cellSize * MAGNET_OFFSET_RATIO;

  return (
    <g opacity={opacity}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={outerRx}
        fill={color}
        fillOpacity={0.92}
      />
      {Array.from({ length: cellsX }).map((_, ix) =>
        Array.from({ length: cellsY }).map((_, iy) => {
          const sx = x + ix * cellW + socketInset;
          const sy = y + iy * cellH + socketInset;
          const cx = sx + socketW / 2;
          const cy = sy + socketH / 2;
          return (
            <g key={`${ix}-${iy}`}>
              <rect
                x={sx}
                y={sy}
                width={socketW}
                height={socketH}
                rx={socketRx}
                fill="#09090b"
                fillOpacity={0.72}
                stroke="#000"
                strokeOpacity={0.4}
                strokeWidth={0.5}
              />
              {showMagnetHoles && (
                <>
                  <circle
                    cx={cx - magnetOffset}
                    cy={cy - magnetOffset}
                    r={magnetR}
                    fill="#000"
                    fillOpacity={0.7}
                  />
                  <circle
                    cx={cx + magnetOffset}
                    cy={cy - magnetOffset}
                    r={magnetR}
                    fill="#000"
                    fillOpacity={0.7}
                  />
                  <circle
                    cx={cx - magnetOffset}
                    cy={cy + magnetOffset}
                    r={magnetR}
                    fill="#000"
                    fillOpacity={0.7}
                  />
                  <circle
                    cx={cx + magnetOffset}
                    cy={cy + magnetOffset}
                    r={magnetR}
                    fill="#000"
                    fillOpacity={0.7}
                  />
                </>
              )}
              {showScrewHoles && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={screwR}
                  fill="#000"
                  fillOpacity={0.8}
                />
              )}
            </g>
          );
        })
      )}
    </g>
  );
}

// ── Spacer ─────────────────────────────────────────────────────────────────

interface SpacerShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity?: number;
}

export function SpacerShape({
  x,
  y,
  width,
  height,
  color,
  opacity = 1,
}: SpacerShapeProps): React.JSX.Element {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={Math.min(width, height) * 0.2}
      fill={color}
      opacity={opacity}
    />
  );
}
