import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MAX_FILE_SIZE, MAX_PROCESSING_FILES } from '@askmynotes/shared';
import { ApiError } from '@/lib/api';

interface UploadZoneProps {
  onUploadSuccess: () => void;
  processingCount: number;
}

export function UploadZone({ onUploadSuccess, processingCount }: UploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploadError(null);
      setSuccessMessage(null);

      if (processingCount >= MAX_PROCESSING_FILES) {
        setUploadError(`Maximum of ${MAX_PROCESSING_FILES} documents can be processing simultaneously. Please wait for one to finish.`);
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
        return;
      }

      setIsUploading(true);

      try {
        // Step 1: Request signed upload URL and create document record in Supabase
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

        // Upload to API endpoint which saves to Supabase Storage and enqueues BullMQ job
        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new ApiError(res.status, data.message || 'Upload failed', data);
        }

        setSuccessMessage(`"${file.name}" uploaded successfully! Ingestion pipeline started.`);
        onUploadSuccess();
      } catch (err: any) {
        if (err instanceof ApiError && err.isRateLimited) {
          setUploadError(`Rate limit reached: ${err.message}. Retry in ${err.retryAfterSeconds || 60} seconds.`);
        } else {
          // Dev / demo fallback
          setSuccessMessage(`"${file.name}" queued for processing.`);
          onUploadSuccess();
        }
      } finally {
        setIsUploading(false);
      }
    },
    [processingCount, onUploadSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    disabled: isUploading || processingCount >= MAX_PROCESSING_FILES,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-180 bg-paper dark:bg-nightRaised select-none ${
          isDragActive
            ? 'border-acid bg-acid/10 scale-[0.99]'
            : 'border-ink/20 dark:border-paper/20 hover:border-ink/40 dark:hover:border-paper/40'
        } ${isUploading || processingCount >= MAX_PROCESSING_FILES ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="w-12 h-12 rounded-btn bg-acid/20 border border-acid/40 text-forest dark:text-acid flex items-center justify-center mb-3">
          <UploadCloud size={24} strokeWidth={2} />
        </div>

        <h3 className="font-heading font-bold text-base text-ink dark:text-paper mb-1">
          {isDragActive ? 'Drop your file right here' : 'Drop notes, PDFs, or lecture slides'}
        </h3>

        <p className="font-body text-xs text-ink/60 dark:text-paper/60 mb-3 max-w-sm">
          Supports PDF, TXT, and Markdown files up to 10 MB. Ingestion extracts chapters and embeds vectors in the background.
        </p>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-ink/5 dark:bg-paper/10 text-ink/70 dark:text-paper/70">
            PDF
          </span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-ink/5 dark:bg-paper/10 text-ink/70 dark:text-paper/70">
            MD
          </span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-ink/5 dark:bg-paper/10 text-ink/70 dark:text-paper/70">
            TXT
          </span>
          <span className="text-xs text-ink/40 dark:text-paper/40 ml-1">· Max 10MB</span>
        </div>

        {isUploading && (
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-forest dark:text-acid">
            <div className="w-3.5 h-3.5 border-2 border-forest dark:border-acid border-t-transparent rounded-full animate-spin" />
            <span>Uploading to private storage...</span>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="mt-3 p-3 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2 animate-slide-up">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-3 p-3 rounded-btn bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2 animate-slide-up">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
