import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { Candidate, ExtractionJob } from "@shared/schema";

export default function Home() {
  const { data: candidates, isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery<ExtractionJob[]>({
    queryKey: ["/api/jobs"],
  });

  const stats = {
    totalCandidates: candidates?.length || 0,
    flaggedCandidates: candidates?.filter((c) => c.flagged).length || 0,
    completedJobs: jobs?.filter((j) => j.status === "completed").length || 0,
    processingJobs: jobs?.filter((j) => j.status === "processing").length || 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="page-home">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Resume Extractor Dashboard</h1>
        <p className="text-muted-foreground">
          Extract and manage candidate information from PDF and EML files
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingCandidates ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-total-candidates">
                {stats.totalCandidates}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-flagged">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged for Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingCandidates ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold text-destructive" data-testid="text-flagged-candidates">
                {stats.flaggedCandidates}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingJobs ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-completed-jobs">
                {stats.completedJobs}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-processing">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingJobs ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-processing-jobs">
                {stats.processingJobs}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>Manual Extraction</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload files and manually map candidate information to structured fields
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/manual">
              <Button className="w-full" data-testid="button-manual-extractor">
                Start Manual Extraction
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>AI-Assisted Extraction</CardTitle>
            <p className="text-sm text-muted-foreground">
              Let AI automatically extract and structure candidate information with confidence scores
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/ai">
              <Button className="w-full" data-testid="button-ai-extractor">
                Start AI Extraction
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCandidates ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-recent-uploads">
                <thead className="border-b">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 font-medium">Source</th>
                    <th className="text-left py-3 px-4 font-medium">Extracted</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.slice(0, 5).map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="border-b hover-elevate"
                      data-testid={`row-recent-${candidate.id}`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium truncate max-w-[200px]">
                          {candidate.fullName || "No name"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {candidate.emails?.[0] || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {candidate.phones?.[0] || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {candidate.sourceFile}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-muted-foreground">
                          {new Date(candidate.extractedAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={candidate.extractionMode === "ai" ? "/ai" : "/manual"}>
                          <Button size="sm" variant="outline" data-testid={`button-view-recent-${candidate.id}`}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No candidates yet. Start extracting resumes to see them here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
