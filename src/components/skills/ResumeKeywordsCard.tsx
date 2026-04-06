import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, RefreshCw, Copy, Check } from "lucide-react";

interface ResumeKeywordsCardProps {
  resumeKeywords: string;
  aiResumeKeywords: string | null;
  generatingResume: boolean;
  copiedField: string | null;
  onGenerate: () => void;
  onCopy: (text: string, field: string) => void;
}

export function ResumeKeywordsCard({
  resumeKeywords, aiResumeKeywords, generatingResume, copiedField, onGenerate, onCopy,
}: ResumeKeywordsCardProps) {
  const displayText = aiResumeKeywords || resumeKeywords;

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
          {aiResumeKeywords ? "AI-optimized keywords for your resume:" : "Top keywords from job descriptions — add these to your resume skills section:"}
        </p>
        <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed">{displayText}</div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onCopy(displayText, "resume")}>
          {copiedField === "resume" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiedField === "resume" ? "Copied!" : "Copy Keywords"}
        </Button>
      </CardContent>
    </Card>
  );
}
