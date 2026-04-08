import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, RefreshCw, Copy, Check, Flame, TrendingUp, Minus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { RankedSkill } from "./skillsInsightsUtils";

interface ResumeKeywordsCardProps {
  resumeKeywords: string;
  aiResumeKeywords: string | null;
  generatingResume: boolean;
  copiedField: string | null;
  demandData?: RankedSkill[];
  onGenerate: () => void;
  onCopy: (text: string, field: string) => void;
}

function getDemandTier(skill: string, demandData: RankedSkill[]): { level: "high" | "moderate" | "low"; pct: number } {
  const lower = skill.trim().toLowerCase();
  const match = demandData.find(d => d.skill === lower || d.label.toLowerCase() === lower);
  if (!match) return { level: "low", pct: 0 };
  if (match.pct >= 30) return { level: "high", pct: match.pct };
  if (match.pct >= 15) return { level: "moderate", pct: match.pct };
  return { level: "low", pct: match.pct };
}

const tierConfig = {
  high: { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", label: "High demand" },
  moderate: { icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "Moderate demand" },
  low: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted/50 border-border", label: "In demand" },
};

export function ResumeKeywordsCard({
  resumeKeywords, aiResumeKeywords, generatingResume, copiedField, demandData, onGenerate, onCopy,
}: ResumeKeywordsCardProps) {
  const displayText = aiResumeKeywords || resumeKeywords;
  const keywords = displayText.split(",").map(k => k.trim()).filter(Boolean);
  const hasDemandData = demandData && demandData.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Resume Keywords
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={generatingResume}>
          {generatingResume ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {generatingResume ? "Generating..." : "AI Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {aiResumeKeywords
            ? "AI-optimized keywords for your resume:"
            : "Keywords from the overlap of your skills and market demand:"}
        </p>
        {hasDemandData && !aiResumeKeywords ? (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((keyword) => {
              const { level, pct } = getDemandTier(keyword, demandData);
              const config = tierConfig[level];
              const Icon = config.icon;
              return (
                <Tooltip key={keyword}>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg}`}>
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      {keyword}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {config.label} — appears in {pct}% of job descriptions
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed">{displayText}</div>
        )}
        <div className="flex items-center justify-between mt-3">
          <Button variant="outline" size="sm" onClick={() => onCopy(displayText, "resume")}>
            {copiedField === "resume" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedField === "resume" ? "Copied!" : "Copy Keywords"}
          </Button>
          {hasDemandData && !aiResumeKeywords && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" /> High</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-amber-500" /> Moderate</span>
              <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-muted-foreground" /> Low</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
