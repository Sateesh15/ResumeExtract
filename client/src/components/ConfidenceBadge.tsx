import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);
  
  const variant = score >= 0.8 ? "default" : score >= 0.5 ? "secondary" : "destructive";
  
  return (
    <Badge 
      variant={variant}
      className={cn("font-medium", className)}
      data-testid={`badge-confidence-${percentage}`}
    >
      {percentage}%
    </Badge>
  );
}
