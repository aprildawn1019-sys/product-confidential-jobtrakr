import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { useSkillsInsights } from "@/components/skills/useSkillsInsights";
import { ResumeKeywordsCard } from "@/components/skills/ResumeKeywordsCard";
import { LinkedInHeadlineCard } from "@/components/skills/LinkedInHeadlineCard";
import { SkillGapCard } from "@/components/skills/SkillGapCard";
import { TopSkillsChart } from "@/components/skills/TopSkillsChart";
import { SkillsTrendChart } from "@/components/skills/SkillsTrendChart";

export default function SkillsInsights() {
  const {
    loading, filteredSnapshots, dateRange, setDateRange, sourceFilter, setSourceFilter,
    trendScale, setTrendScale, backfilling, resetting, backfillProgress,
    copiedField, addingSkill, removingSkill, generatingResume, generatingLinkedIn,
    aiResumeKeywords, aiLinkedInHeadline,
    topSkillsData, allSkillsRanked, trendData, trendSkills,
    matchedSkills, gapSkills, resumeKeywords, linkedInHeadline, profileSkills,
    handleCopy, handleGenerateAIContent, handleAddSkillToProfile,
    handleRemoveSkillFromProfile, handleBackfill, handleResetAndReextract,
  } = useSkillsInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Skills Insights</h1>
          <p className="mt-1 text-muted-foreground">
            Analyze skills demand across {filteredSnapshots.length} tracked job descriptions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="tracked">Tracked Jobs</SelectItem>
              <SelectItem value="search">Job Search</SelectItem>
              <SelectItem value="feed">AI PM Feed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleBackfill} disabled={backfilling}>
            {backfilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {backfillProgress.total > 0 && `${backfillProgress.done}/${backfillProgress.total}`}
              </>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Refresh All Skills</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAndReextract}
            disabled={resetting || backfilling}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {backfillProgress.total > 0 && `${backfillProgress.done}/${backfillProgress.total}`}
              </>
            ) : (
              <><RotateCcw className="h-4 w-4" /> Reset & Re-extract</>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredSnapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-4 opacity-40" />
            <p className="font-medium">No skills data yet</p>
            <p className="text-sm">Skills are extracted automatically when you add jobs with descriptions. Use "Refresh All Skills" to backfill existing jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {allSkillsRanked.length > 0 && (
            <ResumeKeywordsCard
              resumeKeywords={resumeKeywords}
              aiResumeKeywords={aiResumeKeywords}
              generatingResume={generatingResume}
              copiedField={copiedField}
              onGenerate={() => handleGenerateAIContent("resume_keywords")}
              onCopy={handleCopy}
            />
          )}

          {linkedInHeadline && (
            <LinkedInHeadlineCard
              linkedInHeadline={linkedInHeadline}
              aiLinkedInHeadline={aiLinkedInHeadline}
              generatingLinkedIn={generatingLinkedIn}
              copiedField={copiedField}
              onGenerate={() => handleGenerateAIContent("linkedin_headline")}
              onCopy={handleCopy}
            />
          )}

          {profileSkills && allSkillsRanked.length > 0 && (
            <SkillGapCard
              matchedSkills={matchedSkills}
              gapSkills={gapSkills}
              profileSkills={profileSkills}
              addingSkill={addingSkill}
              removingSkill={removingSkill}
              onAddSkill={handleAddSkillToProfile}
              onRemoveSkill={handleRemoveSkillFromProfile}
            />
          )}

          <TopSkillsChart data={topSkillsData} />

          <SkillsTrendChart
            trendData={trendData}
            trendSkills={trendSkills}
            trendScale={trendScale}
            onScaleChange={setTrendScale}
          />
        </div>
      )}
    </div>
  );
}
