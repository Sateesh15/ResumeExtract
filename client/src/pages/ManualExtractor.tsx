import { useState } from "react";
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
import { FileText, Save, Download, Trash2, Plus } from "lucide-react";
import type { InsertCandidate, Candidate } from "@shared/schema";

export default function ManualExtractor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  
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

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "manual");
      
      const response = await apiRequest("POST", "/api/upload", formData);
      return response;
    },
    onSuccess: (data) => {
      setRawText(data.rawText || "");
      setFormData((prev) => ({ ...prev, sourceFile: uploadedFile?.name || "" }));
      toast({
        title: "File uploaded successfully",
        description: "Raw text has been extracted. You can now map the fields.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload and extract text from the file.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertCandidate) => {
      return await apiRequest("POST", "/api/extract/manual", {
        ...data,
        rawText,
      });
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
            disabled={uploadMutation.isPending}
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
              <CardTitle className="text-lg">Raw Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-96 overflow-y-auto p-4 rounded-lg bg-muted font-mono text-sm border"
                data-testid="text-raw-extracted"
              >
                {uploadMutation.isPending ? (
                  <p className="text-muted-foreground">Extracting text...</p>
                ) : rawText ? (
                  <pre className="whitespace-pre-wrap">{rawText}</pre>
                ) : (
                  <p className="text-muted-foreground">
                    Upload a file to see extracted text here
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
              <CardTitle className="text-lg">Candidate Information</CardTitle>
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
                      />
                      {formData.emails && formData.emails.length > 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => removeArrayField(i, "emails")}
                          data-testid={`button-manual-remove-email-${i}`}
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
                      />
                      {formData.phones && formData.phones.length > 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => removeArrayField(i, "phones")}
                          data-testid={`button-manual-remove-phone-${i}`}
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
                      />
                      {formData.skills && formData.skills.length > 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => removeArrayField(i, "skills")}
                          data-testid={`button-manual-remove-skill-${i}`}
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
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-0 bg-background border-t p-4 -mx-6 -mb-6 mt-6">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.fullName}
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
