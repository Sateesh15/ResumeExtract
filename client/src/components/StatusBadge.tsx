import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "queued" | "processing" | "completed" | "failed";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    queued: { icon: Clock, label: "Queued", variant: "secondary" as const },
    processing: { icon: Loader2, label: "Processing", variant: "default" as const },
    completed: { icon: CheckCircle, label: "Completed", variant: "default" as const },
    failed: { icon: XCircle, label: "Failed", variant: "destructive" as const },
  };

  const { icon: Icon, label, variant } = config[status];

  return (
    <Badge variant={variant} className={cn("gap-1.5", className)} data-testid={`badge-status-${status}`}>
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {label}
    </Badge>
  );
}
