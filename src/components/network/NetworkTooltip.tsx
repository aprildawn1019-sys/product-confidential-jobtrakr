import { useEffect, useRef, useState } from "react";

interface NetworkTooltipProps {
  x: number;
  y: number;
  content: React.ReactNode;
  visible: boolean;
}

export default function NetworkTooltip({ x, y, content, visible }: NetworkTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), 200);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [visible]);

  if (!show || !content) return null;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-50 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left: x + 12, top: y - 8, maxWidth: 260 }}
    >
      {content}
    </div>
  );
}
