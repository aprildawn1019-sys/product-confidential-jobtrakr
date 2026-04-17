import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NETWORK_ROLES } from "@/types/jobTracker";
import { clusterTintBg } from "./clusterColor";

const warmthColors: Record<string, string> = {
  hot: "hsl(var(--destructive))",
  warm: "hsl(var(--warning))",
  cold: "hsl(var(--info))",
  champion: "hsl(var(--success))",
};

function ContactNode({ data, selected }: NodeProps) {
  const d = data as any;
  const borderColor = warmthColors[d.warmth] || "hsl(var(--border))";
  const roleInfo = NETWORK_ROLES.find(r => r.value === d.networkRole);
  const hasReferral = d.hasReferral;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ minWidth: 100 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div
        className={`relative flex items-center justify-center rounded-full transition-all ${selected ? "ring-2 ring-ring ring-offset-2" : ""} ${d.highlighted ? "ring-3 ring-primary animate-[ping-ring_1.5s_ease-in-out_3]" : ""}`}
        style={{
          width: 56,
          height: 56,
          border: `3px solid ${borderColor}`,
          background: "hsl(var(--card))",
          boxShadow: hasReferral ? `0 0 12px ${warmthColors.champion || "hsl(var(--success))"}` : undefined,
          opacity: d.dimmed ? 0.1 : 1,
        }}
      >
        <span className="text-lg font-bold text-foreground">
          {(d.label as string)?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
        </span>
        {roleInfo && (
          <span className="absolute -top-1 -right-1 text-xs" title={roleInfo.label}>
            {roleInfo.emoji}
          </span>
        )}
      </div>
      <span className="mt-1 text-[10px] font-medium text-foreground max-w-[90px] truncate text-center">
        {d.label}
      </span>
      {d.company && (
        <span className="text-[9px] text-muted-foreground max-w-[90px] truncate text-center">
          {d.company}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

export default memo(ContactNode);
