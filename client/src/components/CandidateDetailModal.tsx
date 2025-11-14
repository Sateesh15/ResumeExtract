import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { Candidate, Education, Experience, Certification } from "@shared/schema";

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

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && candidate) {
      setEditedCandidate({ ...candidate });
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (editedCandidate) {
      onSave(editedCandidate);
      onOpenChange(false);
    }
  };

  if (!editedCandidate) return null;

  const updateField = <K extends keyof Candidate>(field: K, value: Candidate[K]) => {
    setEditedCandidate({ ...editedCandidate, [field]: value });
  };

  const updateArrayField = (index: number, value: string, field: "emails" | "phones" | "skills") => {
    const updated = [...(editedCandidate[field] || [])];
    updated[index] = value;
    updateField(field, updated);
  };

  const addArrayField = (field: "emails" | "phones" | "skills") => {
    const updated = [...(editedCandidate[field] || []), ""];
    updateField(field, updated);
  };

  const removeArrayField = (index: number, field: "emails" | "phones" | "skills") => {
    const updated = (editedCandidate[field] || []).filter((_, i) => i !== index);
    updateField(field, updated);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-candidate-detail">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl" data-testid="text-candidate-modal-name">
                {editedCandidate.fullName || "Candidate Details"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {editedCandidate.confidence && (
                  <ConfidenceBadge score={editedCandidate.confidence.overall} />
                )}
                <Badge variant="secondary" className="text-xs">
                  {editedCandidate.extractionMode === "ai" ? "AI Extracted" : "Manual Entry"}
                </Badge>
                {editedCandidate.flagged && (
                  <Badge variant="destructive" className="gap-1">
                    <Flag className="h-3 w-3" />
                    Flagged
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-4">
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
                    <Plus className="h-4 w-4 mr-1" />
                    Add Email
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedCandidate.emails || []).map((email, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={email}
                        onChange={(e) => updateArrayField(i, e.target.value, "emails")}
                        placeholder="email@example.com"
                        data-testid={`input-email-${i}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
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
                    <Plus className="h-4 w-4 mr-1" />
                    Add Phone
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedCandidate.phones || []).map((phone, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => updateArrayField(i, e.target.value, "phones")}
                        placeholder="+1 (555) 000-0000"
                        data-testid={`input-phone-${i}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => removeArrayField(i, "phones")}
                        data-testid={`button-remove-phone-${i}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Skills</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addArrayField("skills")}
                data-testid="button-add-skill"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Skill
              </Button>
            </div>
            <div className="space-y-2">
              {(editedCandidate.skills || []).map((skill, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={skill}
                    onChange={(e) => updateArrayField(i, e.target.value, "skills")}
                    placeholder="e.g., JavaScript, Project Management"
                    data-testid={`input-skill-${i}`}
                  />
                  <Button
                    size="icon"
                    variant="outline"
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Education & Experience</h3>
            <p className="text-sm text-muted-foreground">
              Education: {editedCandidate.education?.length || 0} entries |
              Experience: {editedCandidate.experience?.length || 0} entries |
              Certifications: {editedCandidate.certifications?.length || 0} entries
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
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
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-candidate">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
