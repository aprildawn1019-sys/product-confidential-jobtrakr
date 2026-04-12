import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const priorityBorders: Record<string, string> = {
  dream: "hsl(var(--warning))",
  strong: "hsl(var(--muted-foreground))",
  interested: "hsl(var(--border))",
};

function CompanyNode({ data, selected }: NodeProps) {
  const d = data as any;
  const borderColor = priorityBorders[d.priority] || "hsl(var(--border))";

  return (
    <div className="relative flex flex-col items-center" style={{ minWidth: 110 }}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div
        className={`flex items-center justify-center rounded-lg transition-all ${selected ? "ring-2 ring-ring ring-offset-2" : ""}`}
        style={{
          width: 64,
          height: 48,
          border: `3px solid ${borderColor}`,
          background: "hsl(var(--card))",
          opacity: d.dimmed ? 0.1 : 1,
        }}
      >
        <span className="text-sm font-bold text-foreground">🏢</span>
      </div>
      <span className="mt-1 text-[10px] font-semibold text-foreground max-w-[100px] truncate text-center">
        {d.label}
      </span>
      {d.isTarget && (
        <span className="text-[9px] text-warning">★ {d.priority || "target"}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

export default memo(CompanyNode);
