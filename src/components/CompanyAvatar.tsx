import { cn } from "@/lib/utils";

const palette = [
  "bg-info text-info-foreground",
  "bg-warning text-warning-foreground",
  "bg-success text-success-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-[hsl(280,60%,50%)] text-white",
  "bg-[hsl(340,65%,50%)] text-white",
];

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface CompanyAvatarProps {
  company: string;
  size?: "sm" | "md";
  className?: string;
}

export default function CompanyAvatar({ company, size = "sm", className }: CompanyAvatarProps) {
  const colorIndex = hashStr(company.toLowerCase()) % palette.length;
  const initial = company.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg font-bold shrink-0",
        size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base",
        palette[colorIndex],
        className
      )}
    >
      {initial}
    </div>
  );
}
