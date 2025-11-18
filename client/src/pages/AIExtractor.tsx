import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUploadZone } from "@/components/FileUploadZone";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateDetailModal } from "@/components/CandidateDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Search, Filter, Upload } from "lucide-react";
import type { Candidate } from "@shared/schema";
import { Trash2 } from "lucide-react";


type UploadResponse = {
  totalFiles?: number;
  filesProcessed?: number;
  message?: string;
};

export default function AIExtractor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [autoExtract, setAutoExtract] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState([0.6]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: candidates, isLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    select: (data) => data.filter((c) => c.extractionMode === "ai"),
  });

// const uploadMutation = useMutation<UploadResponse, Error, File[]>({
//   mutationFn: async (files: File[]): Promise<UploadResponse> => {
//     const formData = new FormData();
//     files.forEach((file) => formData.append("files", file));
//     formData.append("mode", "ai");
//     formData.append("autoExtract", autoExtract.toString());

//     // apiRequest returns Response
//     const res: Response = await apiRequest("POST", "/api/upload", formData);

//     // You MUST convert to JSON here
//     const data = (await res.json()) as UploadResponse;

//     return data; // React Query receives UploadResponse
//   },

//   onSuccess: (data) => {
//     queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });

//     // data is no longer UNKNOWN — now correctly typed
//     const fileCount = data.totalFiles ?? data.filesProcessed ?? 1;

//     toast({
//       title: "Upload successful",
//       description: `${fileCount} file(s) uploaded and ${
//         autoExtract ? "extraction started" : "queued"
//       }.`,
//     });
//   },

//   onError: () => {
//     toast({
//       title: "Upload failed",
//       description: "Failed to upload files. Please try again.",
//       variant: "destructive",
//     });
//   },
// });

const uploadMutation = useMutation<UploadResponse, Error, File[]>({
  mutationFn: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("file", file)); // ✅ Use "file" not "files"
    formData.append("mode", "ai");
    formData.append("autoExtract", autoExtract.toString());

    // ✅ Use fetch directly, NOT apiRequest
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData, // ✅ FormData is sent directly
      // DO NOT set Content-Type header - browser will set it automatically
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    const data = (await res.json()) as UploadResponse;
    return data;
  },

  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    const fileCount = data.totalFiles ?? data.filesProcessed ?? 1;

    toast({
      title: "Upload successful",
      description: `${fileCount} file(s) uploaded and ${
        autoExtract ? "extraction started" : "queued"
      }.`,
    });
  },

  onError: (error) => {
    console.error("Upload error:", error);
    toast({
      title: "Upload failed",
      description: error.message || "Failed to upload files. Please try again.",
      variant: "destructive",
    });
  },
});

  const updateMutation = useMutation({
    mutationFn: async (candidate: Candidate) => {
      return await apiRequest("POST", `/api/candidates/${candidate.id}`, candidate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate updated",
        description: "Changes have been saved successfully.",
      });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      return await apiRequest("POST", `/api/candidates/${candidateId}/flag`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate flagged",
        description: "This candidate has been flagged for deep extraction.",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/export?format=xlsx");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candidates-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return blob;
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: "Candidate data has been exported to Excel.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ✅ DELETE MUTATIONS
const deleteMutation = useMutation({
  mutationFn: async (candidateId: string) => {
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "DELETE",
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
    const res = await fetch("/api/candidates", {
      method: "DELETE",
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

const handleDeleteCandidate = (candidateId: string) => {
  if (window.confirm("Are you sure you want to delete this candidate?")) {
    deleteMutation.mutate(candidateId);
  }
};

const handleDeleteAll = () => {
  if (window.confirm("⚠️ Are you sure? This will delete ALL candidates!")) {
    deleteAllMutation.mutate();
  }
};


  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setModalOpen(true);
  };

  const handleSaveCandidate = (candidate: Candidate) => {
    updateMutation.mutate(candidate);
  };

  const handleFlagCandidate = (candidate: Candidate) => {
    flagMutation.mutate(candidate.id);
  };

  const filteredCandidates = candidates?.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.emails?.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phones?.some((p) => p.includes(searchQuery));

    const matchesThreshold =
      !c.confidence || c.confidence.overall >= confidenceThreshold[0];

    return matchesSearch && matchesThreshold;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="page-ai-extractor">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">AI Agent Extractor</h1>
        <p className="text-muted-foreground">
          Automatically extract candidate information using AI with confidence scoring
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          disabled={uploadMutation.isPending}
          multiple={true}
        />
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Extraction Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-extract">Auto-Extract on Upload</Label>
              <p className="text-sm text-muted-foreground">
                Automatically run AI extraction when files are uploaded
              </p>
            </div>
            <Switch
              id="auto-extract"
              checked={autoExtract}
              onCheckedChange={setAutoExtract}
              data-testid="switch-auto-extract"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Confidence Threshold: {Math.round(confidenceThreshold[0] * 100)}%</Label>
              <span className="text-sm text-muted-foreground">
                {filteredCandidates?.length || 0} candidates shown
              </span>
            </div>
            <Slider
              value={confidenceThreshold}
              onValueChange={setConfidenceThreshold}
              min={0}
              max={1}
              step={0.05}
              className="min-w-48"
              data-testid="slider-confidence-threshold"
            />
            <p className="text-xs text-muted-foreground">
              Filter candidates by minimum confidence score
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Export */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-candidates"
          />
        </div>
         {/* ✅ ADD Delete All button */}
  {candidates && candidates.length > 0 && (
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
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || !candidates || candidates.length === 0}
          data-testid="button-export-excel"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : filteredCandidates && filteredCandidates.length > 0 ? (
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onView={handleViewCandidate}
                onFlag={handleFlagCandidate}
              />
            ))}
          </div>
        ) : candidates && candidates.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Filter className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No candidates match your current filters. Try adjusting the confidence threshold or search query.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                No candidates yet. Upload resume files to start AI extraction.
              </p>
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, EML
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSaveCandidate}
        onFlag={handleFlagCandidate}
      />
    </div>
  );
}
