/**
 * Pendo-style left-to-right pipeline funnel.
 *
 * Renders a stacked Applications column on the left, sloped color ribbons in
 * the middle, and a stacked Interviews column on the right. Per-lane
 * conversion % is rendered to the right of each interview segment.
 *
 * Both columns are normalized to the same pixel height so each column is
 * fully filled (heights are NOT proportional to absolute totals — otherwise
 * Interviews would render as a near-invisible sliver).
 */

import { useMemo } from "react";

export type FunnelLane = "referral" | "warm" | "cold";

export interface FunnelLaneCounts {
  applications: number;
  interviews: number;
}

export interface PipelineLaneFunnelProps {
  /** Top → bottom lane order; we render in this order. */
  laneOrder?: FunnelLane[];
  data: Record<FunnelLane, FunnelLaneCounts>;
  /** Below this app count, suppress conversion % (show "—" instead). */
  minLaneN?: number;
  /** Total height of each column in pixels. */
  height?: number;
}

const LANE_LABEL: Record<FunnelLane, string> = {
  referral: "Referral",
  warm: "Warm",
  cold: "Cold",
};

/**
 * Lane fill colors, expressed as CSS color expressions referencing HSL tokens.
 * Kept as raw expressions (not Tailwind classes) so they can be used in inline
 * SVG `fill` attributes.
 */
const LANE_FILL: Record<FunnelLane, string> = {
  referral: "hsl(var(--success))",
  warm: "hsl(var(--info))",
  cold: "hsl(var(--text-tertiary))",
};

const COLUMN_WIDTH = 88;
const RIBBON_WIDTH = 180;
const RIGHT_LABEL_WIDTH = 96;

export function PipelineLaneFunnel({
  laneOrder = ["referral", "warm", "cold"],
  data,
  minLaneN = 5,
  height = 240,
}: PipelineLaneFunnelProps) {
  const totals = useMemo(() => {
    const totalApps = laneOrder.reduce((s, l) => s + data[l].applications, 0);
    const totalInts = laneOrder.reduce((s, l) => s + data[l].interviews, 0);
    return { totalApps, totalInts };
  }, [data, laneOrder]);

  // Compute per-lane vertical bands in BOTH columns (each column normalized
  // to fill `height`). For the right column we cap at `totalInts || 1` to
  // avoid divide-by-zero — if there are zero interviews, every right segment
  // collapses to height 0 and we still render the "0%" badge in place.
  const segments = useMemo(() => {
    const { totalApps, totalInts } = totals;
    let appCursor = 0;
    let intCursor = 0;
    return laneOrder.map((lane) => {
      const apps = data[lane].applications;
      const ints = data[lane].interviews;

      const appH = totalApps > 0 ? (apps / totalApps) * height : 0;
      const appTop = appCursor;
      appCursor += appH;

      const intH = totalInts > 0 ? (ints / totalInts) * height : 0;
      const intTop = intCursor;
      intCursor += intH;

      const sparse = apps < minLaneN;
      const conversion = apps > 0 ? ints / apps : 0;

      return { lane, apps, ints, appH, appTop, intH, intTop, sparse, conversion };
    });
  }, [data, laneOrder, totals, height, minLaneN]);

  const svgWidth = COLUMN_WIDTH + RIBBON_WIDTH + COLUMN_WIDTH + RIGHT_LABEL_WIDTH;
  const leftColumnX = 0;
  const ribbonStartX = COLUMN_WIDTH;
  const ribbonEndX = COLUMN_WIDTH + RIBBON_WIDTH;
  const rightColumnX = ribbonEndX;

  return (
    <div className="w-full overflow-x-auto">
      {/* Column headers */}
      <div
        className="flex items-baseline text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2 font-medium"
        style={{ width: svgWidth, minWidth: svgWidth }}
      >
        <div style={{ width: COLUMN_WIDTH }}>
          Applications
          <div className="font-display normal-case tracking-normal text-foreground text-base font-semibold tabular-nums leading-none mt-0.5">
            {totals.totalApps}
          </div>
        </div>
        <div style={{ width: RIBBON_WIDTH }} />
        <div style={{ width: COLUMN_WIDTH + RIGHT_LABEL_WIDTH }}>
          Interviews
          <div className="font-display normal-case tracking-normal text-foreground text-base font-semibold tabular-nums leading-none mt-0.5">
            {totals.totalInts}
          </div>
        </div>
      </div>

      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        role="img"
        aria-label="Pipeline funnel from applications to interviews, segmented by sourcing lane"
        className="block"
      >
        {/* Ribbons (drawn first so segments render over them) */}
        {segments.map((s) => {
          // Skip ribbon when either side has zero height (nothing to flow).
          if (s.appH === 0 && s.intH === 0) return null;

          const leftTop = s.appTop;
          const leftBottom = s.appTop + s.appH;
          const rightTop = s.intTop;
          const rightBottom = s.intTop + s.intH;
          const cx1 = ribbonStartX + RIBBON_WIDTH * 0.5;
          const cx2 = ribbonEndX - RIBBON_WIDTH * 0.5;

          // Cubic bezier path: top edge L→R, then bottom edge R→L, closed.
          const path = [
            `M ${ribbonStartX} ${leftTop}`,
            `C ${cx1} ${leftTop}, ${cx2} ${rightTop}, ${ribbonEndX} ${rightTop}`,
            `L ${ribbonEndX} ${rightBottom}`,
            `C ${cx2} ${rightBottom}, ${cx1} ${leftBottom}, ${ribbonStartX} ${leftBottom}`,
            "Z",
          ].join(" ");

          return (
            <path
              key={`ribbon-${s.lane}`}
              d={path}
              fill={LANE_FILL[s.lane]}
              opacity={0.18}
            />
          );
        })}

        {/* Left column: Applications, stacked */}
        {segments.map((s) => (
          <g key={`left-${s.lane}`}>
            <rect
              x={leftColumnX}
              y={s.appTop}
              width={COLUMN_WIDTH}
              height={s.appH}
              fill={LANE_FILL[s.lane]}
              rx={2}
            />
            {s.appH >= 24 && (
              <text
                x={leftColumnX + COLUMN_WIDTH / 2}
                y={s.appTop + s.appH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-[11px] font-medium"
                style={{ pointerEvents: "none" }}
              >
                {LANE_LABEL[s.lane]} · {s.apps}
              </text>
            )}
          </g>
        ))}

        {/* Right column: Interviews, stacked */}
        {segments.map((s) => (
          <g key={`right-${s.lane}`}>
            {s.intH > 0 && (
              <rect
                x={rightColumnX}
                y={s.intTop}
                width={COLUMN_WIDTH}
                height={s.intH}
                fill={LANE_FILL[s.lane]}
                rx={2}
              />
            )}
            {s.intH >= 24 && (
              <text
                x={rightColumnX + COLUMN_WIDTH / 2}
                y={s.intTop + s.intH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-[11px] font-medium"
                style={{ pointerEvents: "none" }}
              >
                {s.ints}
              </text>
            )}
          </g>
        ))}

        {/* Right-side conversion % labels — anchored to where the right segment
            *would* be even if its height is 0, so 0% lanes still get a tag. */}
        {segments.map((s) => {
          // Anchor: midpoint of the interview segment if non-zero, else
          // midpoint of the corresponding application segment (so the label
          // sits visually adjacent to the failing lane).
          const anchorY = s.intH > 0
            ? s.intTop + s.intH / 2
            : s.appTop + s.appH / 2;

          const labelText = s.sparse
            ? "—"
            : `${Math.round(s.conversion * 100)}%`;

          const subText = s.sparse
            ? `${s.ints}/${s.apps} apps`
            : `${s.ints}/${s.apps}`;

          return (
            <g key={`pct-${s.lane}`}>
              <text
                x={rightColumnX + COLUMN_WIDTH + 12}
                y={anchorY - 2}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-foreground text-[15px] font-display font-semibold tabular-nums"
              >
                {labelText}
              </text>
              <text
                x={rightColumnX + COLUMN_WIDTH + 12}
                y={anchorY + 12}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {subText}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend strip — small dots, labels match column colors */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {laneOrder.map((lane) => (
          <div key={lane} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: LANE_FILL[lane] }}
            />
            <span>{LANE_LABEL[lane]}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          Need ≥{minLaneN} apps per lane to show conversion %
        </span>
      </div>
    </div>
  );
}
