/**
 * Pendo-style left-to-right pipeline funnel with three milestones.
 *
 * Renders three stacked columns — Applications, Interviews, Offers — each
 * normalized to the same pixel height. Sloped color ribbons connect each
 * lane's segment across columns. Per-lane conversion % is rendered between
 * each pair of columns (apps→interviews, interviews→offers).
 *
 * Each column is normalized to fully fill `height` so columns are NOT drawn
 * proportional to absolute totals (otherwise Offers would be a near-invisible
 * sliver). Column header values still show the raw totals.
 */

import { useMemo } from "react";

export type FunnelLane = "referral" | "warm" | "cold";

export interface FunnelLaneCounts {
  applications: number;
  interviews: number;
  offers: number;
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
 */
const LANE_FILL: Record<FunnelLane, string> = {
  referral: "hsl(var(--success))",
  warm: "hsl(var(--info))",
  cold: "hsl(var(--text-tertiary))",
};

const COLUMN_WIDTH = 76;
const RIBBON_WIDTH = 130;
const PCT_LABEL_WIDTH = 56;
const RIGHT_LABEL_WIDTH = 72;

type Stage = "applications" | "interviews" | "offers";

const STAGE_HEADER: Record<Stage, string> = {
  applications: "Applications",
  interviews: "Interviews",
  offers: "Offers",
};

export function PipelineLaneFunnel({
  laneOrder = ["referral", "warm", "cold"],
  data,
  minLaneN = 5,
  height = 240,
}: PipelineLaneFunnelProps) {
  const totals = useMemo(() => {
    const sum = (k: Stage) => laneOrder.reduce((s, l) => s + data[l][k], 0);
    return {
      applications: sum("applications"),
      interviews: sum("interviews"),
      offers: sum("offers"),
    };
  }, [data, laneOrder]);

  // Compute per-lane vertical bands in EACH of the three columns (each column
  // normalized to fill `height`). Stages with zero total collapse to height 0
  // but still render their "0%" badge in place.
  const segments = useMemo(() => {
    const cursors: Record<Stage, number> = { applications: 0, interviews: 0, offers: 0 };
    return laneOrder.map((lane) => {
      const counts = data[lane];
      const bands: Record<Stage, { top: number; h: number; n: number }> = {
        applications: { top: 0, h: 0, n: counts.applications },
        interviews: { top: 0, h: 0, n: counts.interviews },
        offers: { top: 0, h: 0, n: counts.offers },
      };
      (["applications", "interviews", "offers"] as Stage[]).forEach((stage) => {
        const total = totals[stage];
        const h = total > 0 ? (counts[stage] / total) * height : 0;
        bands[stage] = { top: cursors[stage], h, n: counts[stage] };
        cursors[stage] += h;
      });

      const sparse = counts.applications < minLaneN;
      const appsToInts = counts.applications > 0 ? counts.interviews / counts.applications : 0;
      const intsToOffers = counts.interviews > 0 ? counts.offers / counts.interviews : 0;

      return { lane, bands, sparse, appsToInts, intsToOffers, counts };
    });
  }, [data, laneOrder, totals, height, minLaneN]);

  // Column X positions
  const x_apps = 0;
  const x_ribbon1_start = COLUMN_WIDTH;
  const x_ribbon1_end = COLUMN_WIDTH + RIBBON_WIDTH;
  const x_pct1 = x_ribbon1_end;
  const x_ints = x_pct1 + PCT_LABEL_WIDTH;
  const x_ribbon2_start = x_ints + COLUMN_WIDTH;
  const x_ribbon2_end = x_ribbon2_start + RIBBON_WIDTH;
  const x_pct2 = x_ribbon2_end;
  const x_offers = x_pct2 + PCT_LABEL_WIDTH;
  const svgWidth = x_offers + COLUMN_WIDTH + RIGHT_LABEL_WIDTH;

  /** Build a closed cubic-bezier ribbon path between two stacked segments. */
  const ribbonPath = (
    leftX: number,
    rightX: number,
    leftTop: number,
    leftH: number,
    rightTop: number,
    rightH: number,
  ) => {
    const cx1 = leftX + (rightX - leftX) * 0.5;
    const cx2 = rightX - (rightX - leftX) * 0.5;
    const leftBottom = leftTop + leftH;
    const rightBottom = rightTop + rightH;
    return [
      `M ${leftX} ${leftTop}`,
      `C ${cx1} ${leftTop}, ${cx2} ${rightTop}, ${rightX} ${rightTop}`,
      `L ${rightX} ${rightBottom}`,
      `C ${cx2} ${rightBottom}, ${cx1} ${leftBottom}, ${leftX} ${leftBottom}`,
      "Z",
    ].join(" ");
  };

  /** Header cell for a stage column. */
  const StageHeader = ({ stage, width, total }: { stage: Stage; width: number; total: number }) => (
    <div style={{ width }}>
      {STAGE_HEADER[stage]}
      <div className="font-display normal-case tracking-normal text-foreground text-base font-semibold tabular-nums leading-none mt-0.5">
        {total}
      </div>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto">
      {/* Column headers */}
      <div
        className="flex items-baseline text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2 font-medium"
        style={{ width: svgWidth, minWidth: svgWidth }}
      >
        <StageHeader stage="applications" width={COLUMN_WIDTH} total={totals.applications} />
        <div style={{ width: RIBBON_WIDTH + PCT_LABEL_WIDTH }} />
        <StageHeader stage="interviews" width={COLUMN_WIDTH} total={totals.interviews} />
        <div style={{ width: RIBBON_WIDTH + PCT_LABEL_WIDTH }} />
        <StageHeader stage="offers" width={COLUMN_WIDTH + RIGHT_LABEL_WIDTH} total={totals.offers} />
      </div>

      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        role="img"
        aria-label="Pipeline funnel from applications to interviews to offers, segmented by sourcing lane"
        className="block"
      >
        {/* Ribbons: Applications → Interviews */}
        {segments.map((s) => {
          const a = s.bands.applications;
          const i = s.bands.interviews;
          if (a.h === 0 && i.h === 0) return null;
          return (
            <path
              key={`r1-${s.lane}`}
              d={ribbonPath(x_ribbon1_start, x_ribbon1_end, a.top, a.h, i.top, i.h)}
              fill={LANE_FILL[s.lane]}
              opacity={0.18}
            />
          );
        })}

        {/* Ribbons: Interviews → Offers */}
        {segments.map((s) => {
          const i = s.bands.interviews;
          const o = s.bands.offers;
          if (i.h === 0 && o.h === 0) return null;
          return (
            <path
              key={`r2-${s.lane}`}
              d={ribbonPath(x_ribbon2_start, x_ribbon2_end, i.top, i.h, o.top, o.h)}
              fill={LANE_FILL[s.lane]}
              opacity={0.18}
            />
          );
        })}

        {/* Column: Applications */}
        {segments.map((s) => {
          const b = s.bands.applications;
          return (
            <g key={`apps-${s.lane}`}>
              <rect x={x_apps} y={b.top} width={COLUMN_WIDTH} height={b.h} fill={LANE_FILL[s.lane]} rx={2} />
              {b.h >= 24 && (
                <text
                  x={x_apps + COLUMN_WIDTH / 2}
                  y={b.top + b.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-[11px] font-medium"
                  style={{ pointerEvents: "none" }}
                >
                  {LANE_LABEL[s.lane]} · {b.n}
                </text>
              )}
            </g>
          );
        })}

        {/* Column: Interviews */}
        {segments.map((s) => {
          const b = s.bands.interviews;
          if (b.h === 0) return null;
          return (
            <g key={`ints-${s.lane}`}>
              <rect x={x_ints} y={b.top} width={COLUMN_WIDTH} height={b.h} fill={LANE_FILL[s.lane]} rx={2} />
              {b.h >= 24 && (
                <text
                  x={x_ints + COLUMN_WIDTH / 2}
                  y={b.top + b.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-[11px] font-medium"
                  style={{ pointerEvents: "none" }}
                >
                  {b.n}
                </text>
              )}
            </g>
          );
        })}

        {/* Column: Offers */}
        {segments.map((s) => {
          const b = s.bands.offers;
          if (b.h === 0) return null;
          return (
            <g key={`offers-${s.lane}`}>
              <rect x={x_offers} y={b.top} width={COLUMN_WIDTH} height={b.h} fill={LANE_FILL[s.lane]} rx={2} />
              {b.h >= 24 && (
                <text
                  x={x_offers + COLUMN_WIDTH / 2}
                  y={b.top + b.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-[11px] font-medium"
                  style={{ pointerEvents: "none" }}
                >
                  {b.n}
                </text>
              )}
            </g>
          );
        })}

        {/* Conversion % labels: Applications → Interviews (between cols 1 & 2) */}
        {segments.map((s) => {
          const i = s.bands.interviews;
          const a = s.bands.applications;
          const anchorY = i.h > 0 ? i.top + i.h / 2 : a.top + a.h / 2;
          const labelText = s.sparse ? "—" : `${Math.round(s.appsToInts * 100)}%`;
          const subText = s.sparse ? `${i.n}/${a.n} apps` : `${i.n}/${a.n}`;
          return (
            <g key={`pct1-${s.lane}`}>
              <text
                x={x_pct1 + 6}
                y={anchorY - 2}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-foreground text-[13px] font-display font-semibold tabular-nums"
              >
                {labelText}
              </text>
              <text
                x={x_pct1 + 6}
                y={anchorY + 11}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {subText}
              </text>
            </g>
          );
        })}

        {/* Conversion % labels: Interviews → Offers (between cols 2 & 3) */}
        {segments.map((s) => {
          const o = s.bands.offers;
          const i = s.bands.interviews;
          const anchorY = o.h > 0 ? o.top + o.h / 2 : i.h > 0 ? i.top + i.h / 2 : s.bands.applications.top + s.bands.applications.h / 2;
          // Suppress when the upstream interview count is too small to be meaningful.
          const sparseInts = i.n < Math.max(2, Math.floor(minLaneN / 2));
          const labelText = sparseInts ? "—" : `${Math.round(s.intsToOffers * 100)}%`;
          const subText = sparseInts ? `${o.n}/${i.n} ivs` : `${o.n}/${i.n}`;
          return (
            <g key={`pct2-${s.lane}`}>
              <text
                x={x_pct2 + 6}
                y={anchorY - 2}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-foreground text-[13px] font-display font-semibold tabular-nums"
              >
                {labelText}
              </text>
              <text
                x={x_pct2 + 6}
                y={anchorY + 11}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {subText}
              </text>
            </g>
          );
        })}

        {/* Right-edge lane labels alongside Offers column (so lanes are still
            identifiable when an Offers segment is height 0). */}
        {segments.map((s) => {
          const a = s.bands.applications;
          const o = s.bands.offers;
          const anchorY = o.h > 0 ? o.top + o.h / 2 : a.top + a.h / 2;
          return (
            <text
              key={`lane-${s.lane}`}
              x={x_offers + COLUMN_WIDTH + 8}
              y={anchorY}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px] uppercase tracking-wider"
            >
              {LANE_LABEL[s.lane]}
            </text>
          );
        })}
      </svg>

      {/* Legend strip */}
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
