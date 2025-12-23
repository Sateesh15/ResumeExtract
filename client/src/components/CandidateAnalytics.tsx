import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Candidate } from "@shared/schema";
import {
  calculateSkillFrequency,
  calculateExperienceDistribution,
  findDuplicates,
} from "@/lib/deduplicationUtils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CandidateAnalyticsProps {
  candidates: Candidate[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function CandidateAnalytics({ candidates }: CandidateAnalyticsProps) {
  const duplicates = findDuplicates(candidates);
  const skillFreq = calculateSkillFrequency(candidates);
  const expDistribution = calculateExperienceDistribution(candidates);

  const topSkills = Array.from(skillFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ name: skill, count }));

  const sourceStats = new Map<string, number>();
  candidates.forEach((c) => {
    const source = c.sourceFile || "Unknown";
    sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
  });

  const sourceData = Array.from(sourceStats.entries()).map(([source, count]) => ({
    name: source,
    count,
  }));

  const expData = [
    { name: "Junior (0-2y)", value: expDistribution.junior },
    { name: "Mid (2-5y)", value: expDistribution.mid },
    { name: "Senior (5-10y)", value: expDistribution.senior },
    { name: "Expert (10+y)", value: expDistribution.expert },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Duplicate Stats */}
      {duplicates.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">🔍 Duplicates Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-red-800">
                Found <strong>{duplicates.length}</strong> potential duplicate groups
              </p>
              <div className="flex flex-wrap gap-2">
                {duplicates.map((dup, idx) => (
                  <Badge key={idx} variant="outline" className="bg-red-100">
                    {dup.reason === "email" && "📧 Email Match"}
                    {dup.reason === "phone" && "📱 Phone Match"}
                    {dup.reason === "name_similarity" &&
                      `👤 Name Similarity (${dup.similarity.toFixed(0)}%)`}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Top 10 Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSkills}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Experience Distribution */}
      {expData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Experience Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Source Statistics */}
      {sourceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📁 Candidates by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
