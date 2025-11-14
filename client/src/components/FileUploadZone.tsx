import { useCallback } from "react";
import { Upload, FileText, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FileUploadZone({
  onFilesSelected,
  accept = ".pdf,.eml",
  multiple = true,
  disabled = false,
  className,
}: FileUploadZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    },
    [onFilesSelected, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-12 text-center transition-colors hover-elevate",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      data-testid="file-upload-zone"
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleFileInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        data-testid="input-file-upload"
      />
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-3">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="flex gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Upload Resume Files</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop PDF or EML files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports: PDF resumes, EML emails with attachments
          </p>
        </div>
      </div>
    </div>
  );
}
