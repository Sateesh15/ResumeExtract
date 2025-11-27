import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { Candidate, ExtractionJob } from "@shared/schema";
import { CandidateFilter } from '@/components/CandidateFilter';
import { useState, useEffect } from 'react';
import msalInstance from "@/lib/msalInstance";

// ✅ NEW: Helper function to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const accounts = msalInstance.getAllAccounts();
  let headers: Record<string, string> = {};

  if (accounts && accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        account: accounts[0],
        scopes: ["api://5b21943f-59c2-4cf9-ad62-056b6302e168/access"],
      } as any);

      if (response?.accessToken) {
        headers["Authorization"] = `Bearer ${response.accessToken}`;
      }
    } catch (err) {
      console.error("[Home] Token acquisition failed:", err);
      try {
        const popupResponse = await msalInstance.acquireTokenPopup({
          account: accounts[0],
          scopes: ["api://5b21943f-59c2-4cf9-ad62-056b6302e168/access"],
        } as any);

        if (popupResponse?.accessToken) {
          headers["Authorization"] = `Bearer ${popupResponse.accessToken}`;
        }
      } catch (popupErr) {
        console.error("[Home] Popup token acquisition also failed:", popupErr);
      }
    }
  }

  return headers;
}

export default function Home() {
  const { data: candidates, isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery<ExtractionJob[]>({
    queryKey: ["/api/jobs"],
  });

  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (candidates) {
      setFilteredCandidates(candidates);
    }
  }, [candidates]);

  const stats = {
    totalCandidates: candidates?.length || 0,
    flaggedCandidates: candidates?.filter((c) => c.flagged).length || 0,
    completedJobs: jobs?.filter((j) => j.status === "completed").length || 0,
    processingJobs: jobs?.filter((j) => j.status === "processing").length || 0,
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {

      // ✅ Get authorization header
    const headers = await getAuthHeaders();

      const res = await fetch(`/api/candidates/${id}`, {
        method: "DELETE",
        headers, // ✅ Include Authorization
        credentials: "include",

      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "✅ Deleted",
        description: "Candidate has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "❌ Delete failed",
        description: "Could not delete candidate.",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // ✅ Get authorization header
      const headers = await getAuthHeaders();

      const res = await fetch("/api/candidates", {
        method: "DELETE",
        headers, // ✅ Include Authorization
      credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete all");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "✅ All deleted",
        description: `${data.deletedCount} candidates removed.`,
      });
    },
    onError: () => {
      toast({
        title: "❌ Delete failed",
        description: "Could not delete candidates.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteOne = (id: string) => {
    if (window.confirm("Are you sure you want to delete this candidate?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm("⚠️ Are you sure? This will delete ALL candidates!")) {
      deleteAllMutation.mutate();
    }
  };

  const handleFilterChange = async (criteria: any) => {
    try {

      // ✅ Get authorization header
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";

       const response = await fetch('/api/candidates/filter', {
      method: 'POST',
      headers, // ✅ Include Authorization
      body: JSON.stringify(criteria),
      credentials: "include",
    });
      
      const data = await response.json();
      if (data && data.candidates && Array.isArray(data.candidates)) {
        setFilteredCandidates(data.candidates);
      } else {
        if (candidates) {
          setFilteredCandidates(candidates);
        }
      }
    } catch (error) {
      console.error('Filter error:', error);
      if (candidates) {
        setFilteredCandidates(candidates);
      }
    }
  };

  // ✅ NEW - Export Filtered Candidates to Excel
  const handleExportFiltered = async () => {
    if (filteredCandidates.length === 0) {
      toast({
        title: "No data to export",
        description: "Please select candidates first",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {

      // ✅ Get authorization header
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";

      // Send filtered candidate IDs to backend
      const candidateIds = filteredCandidates.map(c => c.id);
      
       const response = await fetch('/api/export-filtered', {
      method: 'POST',
      headers, // ✅ Include Authorization
      body: JSON.stringify({ candidateIds }),
      credentials: "include",
    });
    
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered-candidates-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Export successful",
        description: `Exported ${filteredCandidates.length} candidates to Excel`,
      });
    } catch (error) {
      toast({
        title: "❌ Export failed",
        description: error instanceof Error ? error.message : "Could not export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>Bulk Upload & Filter</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload multiple resumes and automatically filter based on your recruitment criteria
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/bulk-upload">
              <Button className="w-full" variant="default">
                Bulk Upload with Filter
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Candidate Filter Component */}
      {!loadingCandidates && candidates && candidates.length > 0 && (
        <div className="mb-8">
          <CandidateFilter
            onFilterChange={handleFilterChange}
            totalCount={candidates?.length || 0}
            filteredCount={filteredCandidates.length}
          />
        </div>
      )}

      {/* Recent Uploads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Uploads</CardTitle>
          <div className="flex gap-2">
            {/* ✅ NEW - Export Filtered Button */}
            {filteredCandidates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFiltered}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : `Export Filtered (${filteredCandidates.length})`}
              </Button>
            )}
            
            {stats.totalCandidates > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loadingCandidates ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredCandidates && filteredCandidates.length > 0 ? (
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
                  {filteredCandidates.slice(0, 5).map((candidate) => (
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
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <Link href={candidate.extractionMode === "ai" ? "/ai" : "/manual"}>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteOne(candidate.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No candidates match your filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
