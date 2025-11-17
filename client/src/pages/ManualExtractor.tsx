import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Save, Download, Trash2, Plus, Loader } from "lucide-react";
import type { InsertCandidate, Candidate } from "@shared/schema";

type ManualUploadResponse = {
  success: boolean;
  rawText: string;
  attachments: any[];
  filename: string;
};

type ExtractedData = {
  fullName: string | null;
  emails: string[];
  phones: string[];
  summary: string | null;
  education: Array<{
    degree: string;
    institution: string;
    graduationDate?: string;
    field?: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  confidence: any;
};

export default function ManualExtractor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  
  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });
  
  const [formData, setFormData] = useState<InsertCandidate>({
    fullName: "",
    emails: [""],
    phones: [""],
    summary: "",
    education: [],
    experience: [],
    skills: [""],
    certifications: [],
    attachments: [],
    sourceFile: "",
    extractionMode: "manual",
    flagged: false,
    rawText: "",
  });

//   const extractCandidateData = async (text: string, filename: string) => {
//   if (!text) return;
  
//   setIsExtracting(true);
//   console.log("🤖 Starting AI extraction...");
  
//   try {
//     const res = await fetch("/api/extract", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         rawText: text,
//         filename: filename,
//       }),
//     });

//     console.log("📊 Response Status:", res.status);
//     console.log("📊 Response Headers:", {
//       contentType: res.headers.get("content-type"),
//     });

//     // Get response text first
//     const responseText = await res.text();
//     console.log("📝 Raw Response:", responseText.substring(0, 500));

//     if (!res.ok) {
//       console.error("❌ HTTP Error:", res.status, responseText);
//       throw new Error(`HTTP ${res.status}: ${responseText}`);
//     }

//     // Try to parse as JSON
//     try {
//       const extractedData = JSON.parse(responseText) as ExtractedData;
//       console.log("✅ AI Extraction successful:", extractedData);

//       setFormData((prev) => ({
//         ...prev,
//         fullName: extractedData.fullName || "",
//         emails: extractedData.emails?.length > 0 ? extractedData.emails : [""],
//         phones: extractedData.phones?.length > 0 ? extractedData.phones : [""],
//         summary: extractedData.summary || "",
//         education: extractedData.education || [],
//         experience: extractedData.experience || [],
//         skills: extractedData.skills?.length > 0 ? extractedData.skills : [""],
//         certifications: extractedData.certifications || [],
//       }));

//       toast({
//         title: "✅ Data extracted successfully",
//         description: `Found name: ${extractedData.fullName || "N/A"}`,
//       });
//     } catch (parseError) {
//       console.error("❌ JSON Parse Error:", parseError);
//       console.error("Response was HTML or invalid JSON");
//       throw new Error("Invalid response format from server");
//     }
//   } catch (error) {
//     console.error("❌ Extraction error:", error);
//     toast({
//       title: "Extraction failed",
//       description: error instanceof Error ? error.message : "Could not extract data. You can manually enter the information.",
//       variant: "destructive",
//     });
//   } finally {
//     setIsExtracting(false);
//   }
// };

const extractCandidateData = async (text: string, filename: string) => {
  const res = await fetch("/api/extract/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,        // FIXED
      filename,    // FIXED
    }),
  });

  const responseText = await res.text();

  const extractedData = JSON.parse(responseText);

  setFormData((prev) => ({
    ...prev,
    fullName: extractedData.fullName || "",
    emails: extractedData.emails?.length ? extractedData.emails : [""],
    phones: extractedData.phones?.length ? extractedData.phones : [""],
    summary: extractedData.summary || "",
    skills: extractedData.skills?.length ? extractedData.skills : [""],
    experience: extractedData.experience || [],
    education: extractedData.education || [],
    certifications: extractedData.certifications || [],
  }));
};



  const uploadMutation = useMutation<ManualUploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      console.log("🚀 Starting file upload:", file.name);
      
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("mode", "manual");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataToSend,
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const jsonData = (await res.json()) as ManualUploadResponse;
        console.log("✅ API Response received:", {
          success: jsonData.success,
          rawTextLength: jsonData.rawText?.length,
          filename: jsonData.filename,
        });
        
        return jsonData;
      } catch (error) {
        console.error("❌ Upload failed:", error);
        throw error;
      }
    },

    onSuccess: (data: ManualUploadResponse) => {
      console.log("📦 onSuccess triggered");
      
      // Update rawText
      setRawText(data.rawText || "");
      
      setFormData((prev) => ({
        ...prev,
        sourceFile: data.filename || "",
        rawText: data.rawText || "",
      }));

      // 🔥 Call AI extraction
      extractCandidateData(data.rawText, data.filename);

      toast({
        title: "✅ File uploaded successfully",
        description: `Extracted ${data.rawText?.length || 0} characters`,
      });
    },

    onError: (error: Error) => {
      console.error("❌ Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Debug: Monitor state changes
  useEffect(() => {
    console.log("🔍 rawText state changed:", {
      length: rawText.length,
      preview: rawText.substring(0, 50),
    });
  }, [rawText]);

  const saveMutation = useMutation<any, Error, InsertCandidate>({
    mutationFn: async (data: InsertCandidate) => {
      const res = await apiRequest("POST", "/api/extract/manual", {
        ...data,
        rawText,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate saved",
        description: "The candidate information has been saved successfully.",
      });
      handleClear();
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save candidate information.",
        variant: "destructive",
      });
    },
  });

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      console.log("📁 File selected:", files[0].name);
      setUploadedFile(files[0]);
      uploadMutation.mutate(files[0]);
    }
  };

  const handleSave = () => {
    if (!formData.fullName) {
      toast({
        title: "Validation error",
        description: "Please enter at least the candidate's full name.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleClear = () => {
    setUploadedFile(null);
    setRawText("");
    setFormData({
      fullName: "",
      emails: [""],
      phones: [""],
      summary: "",
      education: [],
      experience: [],
      skills: [""],
      certifications: [],
      attachments: [],
      sourceFile: "",
      extractionMode: "manual",
      flagged: false,
      rawText: "",
    });
  };

  const updateArrayField = (index: number, value: string, field: "emails" | "phones" | "skills") => {
    const updated = [...(formData[field] || [])];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
  };

  const addArrayField = (field: "emails" | "phones" | "skills") => {
    const updated = [...(formData[field] || []), ""];
    setFormData({ ...formData, [field]: updated });
  };

  const removeArrayField = (index: number, field: "emails" | "phones" | "skills") => {
    const updated = (formData[field] || []).filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updated });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="page-manual-extractor">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Manual Extractor</h1>
        <p className="text-muted-foreground">
          Upload a resume file, preview the extracted text, and manually map the fields
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Upload & Preview */}
        <div className="space-y-6">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            disabled={uploadMutation.isPending || isExtracting}
          />

          {uploadedFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uploaded File</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid="text-uploaded-filename">
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Raw Extracted Text
                {rawText && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({rawText.length} characters)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-96 overflow-y-auto p-4 rounded-lg bg-muted font-mono text-sm border border-input"
                data-testid="text-raw-extracted"
              >
                {uploadMutation.isPending || isExtracting ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader className="h-4 w-4 animate-spin" />
                    <p>Extracting text...</p>
                  </div>
                ) : rawText && rawText.length > 0 ? (
                  <pre className="whitespace-pre-wrap break-words text-xs">{rawText}</pre>
                ) : (
                  <p className="text-muted-foreground">
                    📄 Upload a file to see extracted text here
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Field Mapping Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Candidate Information
                {isExtracting && (
                  <span className="text-sm font-normal text-amber-600 ml-2 flex items-center gap-1">
                    <Loader className="h-3 w-3 animate-spin" />
                    Populating fields...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="John Doe"
                  data-testid="input-manual-fullname"
                  disabled={isExtracting}
                />
              </div>

              <Separator />

              {/* Emails */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Email Addresses</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayField("emails")}
                    data-testid="button-manual-add-email"
                    disabled={isExtracting}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.emails?.map((email, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={email}
                        onChange={(e) => updateArrayField(i, e.target.value, "emails")}
                        placeholder="email@example.com"
                        data-testid={`input-manual-email-${i}`}
                        disabled={isExtracting}
                      />
                      {formData.emails && formData.emails.length > 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => removeArrayField(i, "emails")}
                          data-testid={`button-manual-remove-email-${i}`}
                          disabled={isExtracting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Phone Numbers</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayField("phones")}
                    data-testid="button-manual-add-phone"
                    disabled={isExtracting}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.phones?.map((phone, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => updateArrayField(i, e.target.value, "phones")}
                        placeholder="+1 (555) 000-0000"
                        data-testid={`input-manual-phone-${i}`}
                        disabled={isExtracting}
                      />
                      {formData.phones && formData.phones.length > 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => removeArrayField(i, "phones")}
                          data-testid={`button-manual-remove-phone-${i}`}
                          disabled={isExtracting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Skills</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayField("skills")}
                    data-testid="button-manual-add-skill"
                    disabled={isExtracting}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.skills?.map((skill, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={skill}
                        onChange={(e) => updateArrayField(i, e.target.value, "skills")}
                        placeholder="e.g., JavaScript, Project Management"
                        data-testid={`input-manual-skill-${i}`}
                        disabled={isExtracting}
                      />
                      {formData.skills && formData.skills.length > 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => removeArrayField(i, "skills")}
                          data-testid={`button-manual-remove-skill-${i}`}
                          disabled={isExtracting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="summary">Professional Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  rows={4}
                  placeholder="Brief professional summary..."
                  data-testid="textarea-manual-summary"
                  disabled={isExtracting}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-0 bg-background border-t p-4 -mx-6 -mb-6 mt-6">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.fullName || isExtracting}
                className="flex-1"
                data-testid="button-manual-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Candidate
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                data-testid="button-manual-clear"
                disabled={isExtracting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                disabled={!candidates || candidates.length === 0}
                data-testid="button-manual-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
