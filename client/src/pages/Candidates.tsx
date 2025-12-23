import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Download, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { Link } from "wouter";
import type { Candidate } from "@shared/schema";
import { CandidateFilter } from '@/components/CandidateFilter';
import { CandidateAnalytics } from '@/components/CandidateAnalytics';
import { useState, useEffect } from 'react';
import msalInstance from "@/lib/msalInstance";

// ✅ Helper function to get auth headers
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
      console.error("[Candidates] Token acquisition failed:", err);
      try {
        const popupResponse = await msalInstance.acquireTokenPopup({
          account: accounts[0],
          scopes: ["api://5b21943f-59c2-4cf9-ad62-056b6302e168/access"],
        } as any);

        if (popupResponse?.accessToken) {
          headers["Authorization"] = `Bearer ${popupResponse.accessToken}`;
        }
      } catch (popupErr) {
        console.error("[Candidates] Popup token acquisition also failed:", popupErr);
      }
    }
  }

  return headers;
}

export default function Candidates() {
  const { data: candidates, isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (candidates) {
      // Apply search filter if exists
      if (searchTerm.trim()) {
        const filtered = candidates.filter(c =>
          c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.emails?.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
          c.phones?.some(p => p.includes(searchTerm))
        );
        setFilteredCandidates(filtered);
      } else {
        setFilteredCandidates(candidates);
      }
    }
  }, [candidates, searchTerm]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/candidates/${id}`, {
        method: "DELETE",
        headers,
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
      const headers = await getAuthHeaders();
      const res = await fetch("/api/candidates", {
        method: "DELETE",
        headers,
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
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";

      const response = await fetch('/api/candidates/filter', {
        method: 'POST',
        headers,
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
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";

      const candidateIds = filteredCandidates.map(c => c.id);

      const response = await fetch('/api/export-filtered', {
        method: 'POST',
        headers,
        body: JSON.stringify({ candidateIds }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

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

  const stats = {
    totalCandidates: candidates?.length || 0,
    filteredCount: filteredCandidates.length,
    flaggedCandidates: filteredCandidates?.filter((c) => c.flagged).length || 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="page-candidates">
      {/* Header with Back Button */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">Candidate Management</h1>
          <p className="text-muted-foreground">
            Filter, search, and export candidates from your database
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCandidates ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalCandidates}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCandidates ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">{stats.filteredCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagged for Review</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCandidates ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold text-red-600">{stats.flaggedCandidates}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      {!loadingCandidates && candidates && candidates.length > 0 && (
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Component */}
      {!loadingCandidates && candidates && candidates.length > 0 && (
        <div className="mb-8">
          <CandidateFilter
            onFilterChange={handleFilterChange}
            totalCount={candidates?.length || 0}
            filteredCount={filteredCandidates.length}
          />
        </div>
      )}

      {/* Analytics Toggle & Display */}
      {!loadingCandidates && candidates && candidates.length > 0 && (
        <>
          <div className="mb-8">
            <Button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="w-full"
              variant="outline"
              size="lg"
            >
              {showAnalytics ? '📊 Hide Analytics' : '📊 Show Analytics'}
            </Button>
          </div>

          {showAnalytics && filteredCandidates.length > 0 && (
            <div className="mb-8">
              <CandidateAnalytics candidates={filteredCandidates} />
            </div>
          )}
        </>
      )}

      {/* Candidates Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Candidates List</CardTitle>
          <div className="flex gap-2 flex-wrap justify-end">
            {filteredCandidates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFiltered}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : `Export (${filteredCandidates.length})`}
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
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredCandidates && filteredCandidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-candidates">
                <thead className="border-b bg-gray-50">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 font-medium">Skills</th>
                    <th className="text-left py-3 px-4 font-medium">Experience</th>
                    <th className="text-left py-3 px-4 font-medium">Source</th>
                    <th className="text-left py-3 px-4 font-medium">Extracted</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate, idx) => (
                    <tr
                      key={candidate.id}
                      className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      data-testid={`row-candidate-${candidate.id}`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium truncate max-w-[200px]">
                          {candidate.fullName || "No name"}
                        </p>
                        {candidate.flagged && (
                          <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            Flagged
                          </span>
                        )}
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
                          {candidate.skills?.slice(0, 2).join(", ") || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-muted-foreground">
                          {candidate.experience?.length || 0} jobs
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
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No candidates match your filter criteria</p>
              {searchTerm && <p className="text-sm mt-2">Try clearing your search</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Info */}
      {filteredCandidates.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredCandidates.length} of {stats.totalCandidates} candidates
        </div>
      )}
    </div>
  );
}