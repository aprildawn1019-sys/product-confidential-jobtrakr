import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { clusterTintBg } from "./clusterColor";

const statusColors: Record<string, string> = {
  saved: "hsl(var(--muted-foreground))",
  applied: "hsl(var(--info))",
  screening: "hsl(var(--info))",
  interviewing: "hsl(var(--warning))",
  offer: "hsl(var(--success))",
  rejected: "hsl(var(--destructive))",
  withdrawn: "hsl(var(--muted-foreground))",
  closed: "hsl(var(--muted-foreground))",
};

function JobNode({ data, selected }: NodeProps) {
  const d = data as any;
  const color = statusColors[d.status] || "hsl(var(--border))";
  const tint = clusterTintBg(d.clusterHue);

  return (
    <div className="relative flex flex-col items-center" style={{ minWidth: 100 }}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div
        className={`flex items-center justify-center transition-all ${selected ? "ring-2 ring-ring ring-offset-2" : ""} ${d.highlighted ? "ring-3 ring-primary animate-[ping-ring_1.5s_ease-in-out_3]" : ""}`}
        style={{
          width: 48,
          height: 48,
          border: `3px solid ${color}`,
          background: tint || "hsl(var(--card))",
          transform: "rotate(45deg)",
          borderRadius: 6,
          opacity: d.dimmed ? 0.1 : 1,
        }}
      >
        <span className="text-sm" style={{ transform: "rotate(-45deg)" }}>💼</span>
      </div>
      <span className="mt-2 text-[10px] font-medium text-foreground max-w-[90px] truncate text-center">
        {d.label}
      </span>
      <span className="text-[9px] text-muted-foreground max-w-[90px] truncate text-center">
        {d.company}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

export default memo(JobNode);
