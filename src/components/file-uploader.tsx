"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileImage, X, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 20 * 1024 * 1024;

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

export function FileUploader({ onUpload, isUploading = false }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Use PNG, JPEG, WebP or PDF.";
    }
    if (file.size > MAX_SIZE) {
      return "File too large. Maximum is 20MB.";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = () => {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-12 transition-all duration-300",
          dragActive
            ? "border-primary bg-primary/5 dark:border-[#00d4ff] dark:bg-[#00d4ff]/10 dark:shadow-[0_0_30px_rgba(0,212,255,0.15)]"
            : "border-muted-foreground/25 hover:border-primary/50 dark:border-white/10 dark:hover:border-[#00d4ff]/40 dark:hover:shadow-[0_0_20px_rgba(0,212,255,0.08)]"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-0 dark:opacity-50" />

        <div className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-transparent transition-colors duration-300 group-hover:border-primary/30 dark:group-hover:border-[#00d4ff]/30" />
        <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-transparent transition-colors duration-300 group-hover:border-primary/30 dark:group-hover:border-[#00d4ff]/30" />
        <div className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-transparent transition-colors duration-300 group-hover:border-primary/30 dark:group-hover:border-[#00d4ff]/30" />
        <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-transparent transition-colors duration-300 group-hover:border-primary/30 dark:group-hover:border-[#00d4ff]/30" />

        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {selectedFile ? (
          <div className="relative flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 dark:bg-[#00d4ff]/10">
              <FileImage className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <div className="mb-4 rounded-xl bg-primary/10 p-3 dark:bg-[#00d4ff]/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-semibold">
              Drop your architecture diagram here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPEG, WebP or PDF up to 20MB
            </p>
            <div className="mt-4 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:shadow-[0_0_10px_rgba(0,212,255,0.1)]">
              Browse files
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {selectedFile && (
        <Button
          onClick={handleSubmit}
          disabled={isUploading}
          className="w-full bg-primary font-semibold text-primary-foreground transition-all hover:bg-primary/90 dark:shadow-[0_0_20px_rgba(0,212,255,0.2)] dark:hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Analyze Diagram
            </>
          )}
        </Button>
      )}
    </div>
  );
}
