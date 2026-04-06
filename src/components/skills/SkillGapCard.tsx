import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, AlertTriangle, Loader2, PlusCircle, X } from "lucide-react";
import type { RankedSkill, ProfileSkills } from "./skillsInsightsUtils";

interface SkillGapCardProps {
  matchedSkills: RankedSkill[];
  gapSkills: RankedSkill[];
  profileSkills: ProfileSkills;
  addingSkill: string | null;
  removingSkill: string | null;
  onAddSkill: (label: string) => void;
  onRemoveSkill: (label: string) => void;
}

export function SkillGapCard({
  matchedSkills, gapSkills, profileSkills, addingSkill, removingSkill, onAddSkill, onRemoveSkill,
}: SkillGapCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Skill Gap Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              You Have ({matchedSkills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.length === 0 && (
                <p className="text-sm text-muted-foreground">No matching skills found. Update your profile.</p>
              )}
              {matchedSkills.map(s => (
                <Badge
                  key={s.skill}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:opacity-80 transition-opacity gap-1 group/skill"
                  onClick={() => onRemoveSkill(s.label)}
                >
                  {s.label}
                  {s.pct >= 50 && <span className="text-primary font-bold">★</span>}
                  {removingSkill === s.skill ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3 opacity-0 group-hover/skill:opacity-100 transition-opacity" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Skills Gap ({gapSkills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {gapSkills.length === 0 && (
                <p className="text-sm text-muted-foreground">Great — you cover all top skills!</p>
              )}
              {gapSkills.map(s => (
                <Badge
                  key={s.skill}
                  variant={s.pct >= 50 ? "destructive" : "outline"}
                  className="text-xs cursor-pointer hover:opacity-80 transition-opacity gap-1"
                  onClick={() => onAddSkill(s.label)}
                >
                  {addingSkill === s.skill ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <PlusCircle className="h-3 w-3" />
                  )}
                  {s.label}
                  <span className="text-[10px] opacity-70">({s.pct}%)</span>
                </Badge>
              ))}
            </div>
            {gapSkills.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">Click a skill to add it to your Search Profile</p>
            )}
          </div>
        </div>
        {!profileSkills.skills?.length && !profileSkills.technical_skills?.length && (
          <p className="mt-4 text-sm text-muted-foreground">
            💡 Add skills to your Job Search Profile to see gap analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
