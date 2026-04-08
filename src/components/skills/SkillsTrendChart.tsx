import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Info } from "lucide-react";
import { formatSkillLabel, TREND_LINE_COLORS } from "./skillsInsightsUtils";

interface SkillsTrendChartProps {
  trendData: any[];
  trendSkills: string[];
  trendScale: "weeks" | "months";
  onScaleChange: (scale: "weeks" | "months") => void;
}

export function SkillsTrendChart({ trendData, trendSkills, trendScale, onScaleChange }: SkillsTrendChartProps) {
  if (trendData.length <= 1) return null;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Skills Trend Over Time
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-sm">
              Tracks how often the top 5 most demanded skills appear in job descriptions over time, grouped by week or month. Helps you spot rising or declining skill requirements in the market.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <Select value={trendScale} onValueChange={(v) => onScaleChange(v as "weeks" | "months")}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weeks">Weeks</SelectItem>
            <SelectItem value="months">Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
              {trendSkills.map((skill, i) => (
                <Line
                  key={skill}
                  type="monotone"
                  dataKey={skill}
                  stroke={TREND_LINE_COLORS[i % TREND_LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={formatSkillLabel(skill)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
