/**
 * Pendo/Sankey-style left-to-right pipeline funnel with three milestones.
 *
 * Renders three stacked columns — Applications, Interviews, Offers — connected
 * by sloped color ribbons that visually fuse with the column bars to form one
 * continuous flow per lane. All numbers (counts + conversion %s) live in a
 * hover tooltip; at rest the chart is a clean shape with only column header
 * totals and right-edge lane labels.
 *
 * Hover behavior: hovering anywhere on a lane (any column rect or either
 * ribbon) highlights that entire lane end-to-end and dims the others, with a
 * single tooltip summarizing the lane's conversion at both stages.
 */

import { useMemo, useState } from "react";

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

const LANE_FILL: Record<FunnelLane, string> = {
  referral: "hsl(var(--success))",
  warm: "hsl(var(--info))",
  cold: "hsl(var(--text-tertiary))",
};

const COLUMN_WIDTH = 76;
const RIBBON_WIDTH = 150;
const RIGHT_LABEL_WIDTH = 76;

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
  const [hoveredLane, setHoveredLane] = useState<FunnelLane | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const totals = useMemo(() => {
    const sum = (k: Stage) => laneOrder.reduce((s, l) => s + data[l][k], 0);
    return {
      applications: sum("applications"),
      interviews: sum("interviews"),
      offers: sum("offers"),
    };
  }, [data, laneOrder]);

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

      const sparseApps = counts.applications < minLaneN;
      const sparseInts = counts.interviews < Math.max(2, Math.floor(minLaneN / 2));
      const appsToInts = counts.applications > 0 ? counts.interviews / counts.applications : 0;
      const intsToOffers = counts.interviews > 0 ? counts.offers / counts.interviews : 0;

      return { lane, bands, sparseApps, sparseInts, appsToInts, intsToOffers, counts };
    });
  }, [data, laneOrder, totals, height, minLaneN]);

  // Column X positions — ribbons butt flush against column edges so lanes read
  // as one continuous shape.
  const x_apps = 0;
  const x_r1_start = COLUMN_WIDTH;
  const x_r1_end = x_r1_start + RIBBON_WIDTH;
  const x_ints = x_r1_end;
  const x_r2_start = x_ints + COLUMN_WIDTH;
  const x_r2_end = x_r2_start + RIBBON_WIDTH;
  const x_offers = x_r2_end;
  const svgWidth = x_offers + COLUMN_WIDTH + RIGHT_LABEL_WIDTH;

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

  const StageHeader = ({ stage, width, total }: { stage: Stage; width: number; total: number }) => (
    <div style={{ width }}>
      {STAGE_HEADER[stage]}
      <div className="font-display normal-case tracking-normal text-foreground text-base font-semibold tabular-nums leading-none mt-0.5">
        {total}
      </div>
    </div>
  );

  /** Opacity for a given lane based on hover state. */
  const laneOpacity = (lane: FunnelLane, base: number) => {
    if (hoveredLane === null) return base;
    return hoveredLane === lane ? Math.min(1, base + 0.15) : base * 0.25;
  };

  const handleEnter = (lane: FunnelLane) => (e: React.MouseEvent) => {
    setHoveredLane(lane);
    const rect = e.currentTarget.getBoundingClientRect();
    const parent = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left - parent.left + rect.width / 2, y: rect.top - parent.top });
  };
  const handleMove = (e: React.MouseEvent) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const parent = svg.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - parent.left, y: e.clientY - parent.top });
  };
  const handleLeave = () => {
    setHoveredLane(null);
    setTooltipPos(null);
  };

  const hovered = hoveredLane ? segments.find((s) => s.lane === hoveredLane) : null;

  return (
    <div className="w-full overflow-x-auto">
      {/* Column headers */}
      <div
        className="flex items-baseline text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2 font-medium"
        style={{ width: svgWidth, minWidth: svgWidth }}
      >
        <StageHeader stage="applications" width={COLUMN_WIDTH} total={totals.applications} />
        <div style={{ width: RIBBON_WIDTH }} />
        <StageHeader stage="interviews" width={COLUMN_WIDTH} total={totals.interviews} />
        <div style={{ width: RIBBON_WIDTH }} />
        <StageHeader stage="offers" width={COLUMN_WIDTH + RIGHT_LABEL_WIDTH} total={totals.offers} />
      </div>

      <div className="relative" style={{ width: svgWidth }}>
        <svg
          width={svgWidth}
          height={height}
          viewBox={`0 0 ${svgWidth} ${height}`}
          role="img"
          aria-label="Pipeline funnel from applications to interviews to offers, segmented by sourcing lane. Hover a lane for conversion rates."
          className="block"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          {segments.map((s) => {
            const a = s.bands.applications;
            const i = s.bands.interviews;
            const o = s.bands.offers;
            const fill = LANE_FILL[s.lane];
            // Slight base opacity so columns + ribbons read as the same material.
            const baseColumnOpacity = 0.92;
            const baseRibbonOpacity = 0.55;

            return (
              <g
                key={`lane-${s.lane}`}
                onMouseEnter={handleEnter(s.lane)}
                style={{ cursor: "pointer", transition: "opacity 120ms ease-out" }}
              >
                {/* Apps column rect — no rounded corners on inner edge so it
                    fuses with ribbon 1. */}
                {a.h > 0 && (
                  <rect
                    x={x_apps}
                    y={a.top}
                    width={COLUMN_WIDTH}
                    height={a.h}
                    fill={fill}
                    opacity={laneOpacity(s.lane, baseColumnOpacity)}
                  />
                )}
                {/* Ribbon 1: Apps → Ints */}
                {(a.h > 0 || i.h > 0) && (
                  <path
                    d={ribbonPath(x_r1_start, x_r1_end, a.top, a.h, i.top, i.h)}
                    fill={fill}
                    opacity={laneOpacity(s.lane, baseRibbonOpacity)}
                  />
                )}
                {/* Interviews column rect */}
                {i.h > 0 && (
                  <rect
                    x={x_ints}
                    y={i.top}
                    width={COLUMN_WIDTH}
                    height={i.h}
                    fill={fill}
                    opacity={laneOpacity(s.lane, baseColumnOpacity)}
                  />
                )}
                {/* Ribbon 2: Ints → Offers */}
                {(i.h > 0 || o.h > 0) && (
                  <path
                    d={ribbonPath(x_r2_start, x_r2_end, i.top, i.h, o.top, o.h)}
                    fill={fill}
                    opacity={laneOpacity(s.lane, baseRibbonOpacity)}
                  />
                )}
                {/* Offers column rect */}
                {o.h > 0 && (
                  <rect
                    x={x_offers}
                    y={o.top}
                    width={COLUMN_WIDTH}
                    height={o.h}
                    fill={fill}
                    opacity={laneOpacity(s.lane, baseColumnOpacity)}
                  />
                )}
              </g>
            );
          })}

          {/* Right-edge lane labels — anchored to the offers segment if present,
              otherwise to the apps segment so the lane is still identifiable. */}
          {segments.map((s) => {
            const a = s.bands.applications;
            const o = s.bands.offers;
            const anchorY = o.h > 0 ? o.top + o.h / 2 : a.top + a.h / 2;
            const isDimmed = hoveredLane !== null && hoveredLane !== s.lane;
            return (
              <text
                key={`label-${s.lane}`}
                x={x_offers + COLUMN_WIDTH + 10}
                y={anchorY}
                textAnchor="start"
                dominantBaseline="middle"
                className="text-[10px] uppercase tracking-wider"
                fill="hsl(var(--muted-foreground))"
                opacity={isDimmed ? 0.35 : 1}
                style={{ transition: "opacity 120ms ease-out", pointerEvents: "none" }}
              >
                {LANE_LABEL[s.lane]}
              </text>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && tooltipPos && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-3 py-2 shadow-lg text-popover-foreground"
            style={{
              left: Math.min(Math.max(tooltipPos.x + 12, 0), svgWidth - 220),
              top: Math.max(tooltipPos.y - 8, 0),
              width: 210,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: LANE_FILL[hovered.lane] }}
              />
              <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                {LANE_LABEL[hovered.lane]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Apps</div>
                <div className="font-display text-sm font-semibold tabular-nums">{hovered.counts.applications}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Ivs</div>
                <div className="font-display text-sm font-semibold tabular-nums">{hovered.counts.interviews}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Offers</div>
                <div className="font-display text-sm font-semibold tabular-nums">{hovered.counts.offers}</div>
              </div>
            </div>
            <div className="space-y-1 border-t border-border/60 pt-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Apps → Ivs</span>
                <span className="font-display font-semibold tabular-nums">
                  {hovered.sparseApps ? "—" : `${Math.round(hovered.appsToInts * 100)}%`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Ivs → Offers</span>
                <span className="font-display font-semibold tabular-nums">
                  {hovered.sparseInts ? "—" : `${Math.round(hovered.intsToOffers * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

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
          Hover a lane for conversion rates · Need ≥{minLaneN} apps to qualify
        </span>
      </div>
    </div>
  );
}
