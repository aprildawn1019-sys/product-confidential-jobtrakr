import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Loader2 } from "lucide-react";

interface Snapshot {
  id: string;
  job_id: string | null;
  skills: string[];
  captured_at: string;
}

export default function SkillsInsights() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("90");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
      const { data } = await supabase
        .from("job_skills_snapshots")
        .select("*")
        .gte("captured_at", cutoff.toISOString())
        .order("captured_at", { ascending: true });
      setSnapshots((data as Snapshot[]) || []);
      setLoading(false);
    })();
  }, [dateRange]);

  // Top Skills bar chart data
  const topSkillsData = useMemo(() => {
    const counts: Record<string, number> = {};
    snapshots.forEach((s) => {
      s.skills.forEach((skill) => {
        const normalized = skill.trim().toLowerCase();
        counts[normalized] = (counts[normalized] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({
        skill: skill.charAt(0).toUpperCase() + skill.slice(1),
        count,
      }));
  }, [snapshots]);

  // Skills trend data (weekly buckets for top 5 skills)
  const { trendData, trendSkills } = useMemo(() => {
    // Find top 5 skills overall
    const counts: Record<string, number> = {};
    snapshots.forEach((s) =>
      s.skills.forEach((sk) => {
        const n = sk.trim().toLowerCase();
        counts[n] = (counts[n] || 0) + 1;
      })
    );
    const top5 = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s);

    if (top5.length === 0 || snapshots.length === 0) return { trendData: [], trendSkills: [] };

    // Group snapshots into weekly buckets
    const buckets: Record<string, Record<string, number>> = {};
    snapshots.forEach((s) => {
      const d = new Date(s.captured_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = {};
      s.skills.forEach((sk) => {
        const n = sk.trim().toLowerCase();
        if (top5.includes(n)) {
          buckets[key][n] = (buckets[key][n] || 0) + 1;
        }
      });
    });

    const data = Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, skills]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...top5.reduce((acc, s) => ({ ...acc, [s]: skills[s] || 0 }), {}),
      }));

    return { trendData: data, trendSkills: top5 };
  }, [snapshots]);

  const lineColors = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Skills Insights</h1>
          <p className="mt-1 text-muted-foreground">
            Analyze skills demand across {snapshots.length} tracked job descriptions
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-4 opacity-40" />
            <p className="font-medium">No skills data yet</p>
            <p className="text-sm">Skills are extracted automatically when you add jobs with descriptions, or use the AI PM Feed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Skills */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top Skills in Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkillsData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="skill" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Skills Trend */}
          {trendData.length > 1 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Skills Trend Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
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
                          stroke={lineColors[i]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={skill.charAt(0).toUpperCase() + skill.slice(1)}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
