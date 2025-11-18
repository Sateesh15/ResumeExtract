import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Flag, Save, X, Plus, Trash2 } from "lucide-react";
import type { Candidate } from "@shared/schema";

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (candidate: Candidate) => void;
  onFlag?: (candidate: Candidate) => void;
}

export function CandidateDetailModal({
  candidate,
  open,
  onOpenChange,
  onSave,
  onFlag,
}: CandidateDetailModalProps) {
  const [editedCandidate, setEditedCandidate] = useState<Candidate | null>(null);

  // ✅ FIX: Sync editedCandidate with candidate prop when modal opens
  useEffect(() => {
    if (open && candidate) {
      console.log("🔵 Modal opened with candidate:", candidate);
      setEditedCandidate({ ...candidate });
    }
  }, [open, candidate]);

  const handleSave = () => {
    if (editedCandidate) {
      console.log("💾 Saving candidate:", editedCandidate);
      onSave(editedCandidate);
      onOpenChange(false);
    }
  };

  const updateField = <K extends keyof Candidate>(
    field: K,
    value: Candidate[K]
  ) => {
    setEditedCandidate((prev) =>
      prev ? { ...prev, [field]: value } : null
    );
  };

  const updateArrayField = (
    index: number,
    value: string,
    field: "emails" | "phones" | "skills"
  ) => {
    if (!editedCandidate) return;
    const updated = [...(editedCandidate[field] || [])];
    updated[index] = value;
    updateField(field, updated);
  };

  const addArrayField = (field: "emails" | "phones" | "skills") => {
    if (!editedCandidate) return;
    const updated = [...(editedCandidate[field] || []), ""];
    updateField(field, updated);
  };

  const removeArrayField = (
    index: number,
    field: "emails" | "phones" | "skills"
  ) => {
    if (!editedCandidate) return;
    const updated = (editedCandidate[field] || []).filter((_, i) => i !== index);
    updateField(field, updated);
  };

  // ✅ FIX: Don't render if no edited candidate
  if (!editedCandidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{editedCandidate.fullName || "Candidate Details"}</span>
            <div className="flex items-center gap-2">
              {editedCandidate.confidence && (
  <ConfidenceBadge score={editedCandidate.confidence.overall} />
)}
              <Badge variant="outline">
                {editedCandidate.extractionMode === "ai"
                  ? "AI Extracted"
                  : "Manual Entry"}
              </Badge>
              {editedCandidate.flagged && (
                <Badge variant="destructive">Flagged</Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
    View and edit candidate information extracted from resume
  </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={editedCandidate.fullName || ""}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  data-testid="input-fullname"
                />
              </div>

              {/* Emails */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Email Addresses</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayField("emails")}
                    data-testid="button-add-email"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Email
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedCandidate.emails || []).map((email, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={email}
                        onChange={(e) =>
                          updateArrayField(i, e.target.value, "emails")
                        }
                        placeholder="email@example.com"
                        data-testid={`input-email-${i}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeArrayField(i, "emails")}
                        data-testid={`button-remove-email-${i}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                    data-testid="button-add-phone"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Phone
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedCandidate.phones || []).map((phone, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) =>
                          updateArrayField(i, e.target.value, "phones")
                        }
                        placeholder="+1 (555) 000-0000"
                        data-testid={`input-phone-${i}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeArrayField(i, "phones")}
                        data-testid={`button-remove-phone-${i}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={editedCandidate.summary || ""}
                  onChange={(e) => updateField("summary", e.target.value)}
                  rows={3}
                  data-testid="textarea-summary"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Skills */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Skills</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addArrayField("skills")}
                data-testid="button-add-skill"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Skill
              </Button>
            </div>
            <div className="space-y-2">
              {(editedCandidate.skills || []).map((skill, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={skill}
                    onChange={(e) =>
                      updateArrayField(i, e.target.value, "skills")
                    }
                    placeholder="e.g., JavaScript, Project Management"
                    data-testid={`input-skill-${i}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeArrayField(i, "skills")}
                    data-testid={`button-remove-skill-${i}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Education & Experience - Simplified for MVP */}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Education & Experience
            </h3>
            <p className="text-sm text-muted-foreground">
              Education: {editedCandidate.education?.length || 0} entries |
              Experience: {editedCandidate.experience?.length || 0} entries |
              Certifications: {editedCandidate.certifications?.length || 0}{" "}
              entries
            </p>
          </div>
        </div>

        <DialogFooter>
          {onFlag && !editedCandidate.flagged && (
            <Button
              variant="outline"
              onClick={() => {
                onFlag(editedCandidate);
                onOpenChange(false);
              }}
              data-testid="button-flag-deep-extraction"
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag for Deep Extraction
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
