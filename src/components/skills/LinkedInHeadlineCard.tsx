import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, Loader2, RefreshCw, Copy, Check } from "lucide-react";

interface LinkedInHeadlineCardProps {
  linkedInHeadline: string;
  aiLinkedInHeadline: string | null;
  generatingLinkedIn: boolean;
  copiedField: string | null;
  onGenerate: () => void;
  onCopy: (text: string, field: string) => void;
}

export function LinkedInHeadlineCard({
  linkedInHeadline, aiLinkedInHeadline, generatingLinkedIn, copiedField, onGenerate, onCopy,
}: LinkedInHeadlineCardProps) {
  const displayText = aiLinkedInHeadline || linkedInHeadline;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Linkedin className="h-5 w-5 text-primary" />
          LinkedIn Headline Builder
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={generatingLinkedIn}>
          {generatingLinkedIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {generatingLinkedIn ? "Generating..." : "AI Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {aiLinkedInHeadline ? "AI-crafted headline for maximum recruiter visibility:" : "Suggested headline based on top in-demand skills:"}
        </p>
        <div className="rounded-md bg-muted/50 p-3 text-sm font-medium">{displayText}</div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onCopy(displayText, "linkedin")}>
          {copiedField === "linkedin" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiedField === "linkedin" ? "Copied!" : "Copy Headline"}
        </Button>
      </CardContent>
    </Card>
  );
}
