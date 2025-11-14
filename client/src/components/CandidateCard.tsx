import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Flag, Eye } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { Candidate } from "@shared/schema";

interface CandidateCardProps {
  candidate: Candidate;
  onView: (candidate: Candidate) => void;
  onFlag?: (candidate: Candidate) => void;
}

export function CandidateCard({ candidate, onView, onFlag }: CandidateCardProps) {
  const initials = candidate.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "NA";

  return (
    <Card className="p-4 hover-elevate" data-testid={`card-candidate-${candidate.id}`}>
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate" data-testid={`text-candidate-name-${candidate.id}`}>
                {candidate.fullName || "No name extracted"}
              </h3>
              {candidate.confidence && (
                <ConfidenceBadge score={candidate.confidence.overall} className="mt-1" />
              )}
            </div>
            <div className="flex items-center gap-1">
              {candidate.flagged && (
                <Badge variant="destructive" className="gap-1">
                  <Flag className="h-3 w-3" />
                  Flagged
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1 text-sm">
            {candidate.emails && candidate.emails.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" data-testid={`text-candidate-email-${candidate.id}`}>
                  {candidate.emails[0]}
                </span>
              </div>
            )}
            {candidate.phones && candidate.phones.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" data-testid={`text-candidate-phone-${candidate.id}`}>
                  {candidate.phones[0]}
                </span>
              </div>
            )}
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {candidate.skills.slice(0, 3).map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{candidate.skills.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => onView(candidate)}
              data-testid={`button-view-${candidate.id}`}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              View Details
            </Button>
            {onFlag && !candidate.flagged && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFlag(candidate)}
                data-testid={`button-flag-${candidate.id}`}
              >
                <Flag className="h-4 w-4 mr-1.5" />
                Flag for Review
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
