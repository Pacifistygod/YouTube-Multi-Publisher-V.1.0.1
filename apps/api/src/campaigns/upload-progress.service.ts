export interface UploadProgressEntry {
  jobId: string;
  bytesUploaded: number;
  totalBytes: number;
  percent: number;
  bytesPerSecond: number;
  startedAt: string;
  updatedAt: string;
  status: 'uploading' | 'completed' | 'failed';
}

export interface AggregateProgress {
  totalBytes: number;
  uploadedBytes: number;
  percent: number;
  activeUploads: number;
  completedUploads: number;
  failedUploads: number;
}

export interface UploadProgressServiceOptions {
  updateJob?: (jobId: string, progressPercent: number) => void;
  now?: () => Date;
}

export class UploadProgressService {
  private readonly entries = new Map<string, UploadProgressEntry>();
  private readonly updateJob?: (jobId: string, progressPercent: number) => void;
  private readonly now: () => Date;

  constructor(options: UploadProgressServiceOptions = {}) {
    this.updateJob = options.updateJob;
    this.now = options.now ?? (() => new Date());
  }

  startTracking(jobId: string, totalBytes: number): UploadProgressEntry {
    const nowIso = this.now().toISOString();
    const entry: UploadProgressEntry = {
      jobId,
      bytesUploaded: 0,
      totalBytes,
      percent: 0,
      bytesPerSecond: 0,
      startedAt: nowIso,
      updatedAt: nowIso,
      status: 'uploading',
    };
    this.entries.set(jobId, entry);
    return { ...entry };
  }

  updateProgress(jobId: string, bytesUploaded: number): UploadProgressEntry | null {
    const entry = this.entries.get(jobId);
    if (!entry) return null;

    const now = this.now();
    const startedAt = new Date(entry.startedAt);
    const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000;

    entry.bytesUploaded = bytesUploaded;
    entry.percent = Math.min(100, Math.round((bytesUploaded / entry.totalBytes) * 100));
    entry.bytesPerSecond = elapsedSeconds > 0 ? Math.round(bytesUploaded / elapsedSeconds) : 0;
    entry.updatedAt = now.toISOString();

    this.updateJob?.(jobId, entry.percent);

    return { ...entry };
  }

  getProgress(jobId: string): UploadProgressEntry | null {
    const entry = this.entries.get(jobId);
    return entry ? { ...entry } : null;
  }

  markCompleted(jobId: string): UploadProgressEntry | null {
    const entry = this.entries.get(jobId);
    if (!entry) return null;

    entry.status = 'completed';
    entry.percent = 100;
    entry.bytesUploaded = entry.totalBytes;
    entry.updatedAt = this.now().toISOString();

    return { ...entry };
  }

  markFailed(jobId: string): UploadProgressEntry | null {
    const entry = this.entries.get(jobId);
    if (!entry) return null;

    entry.status = 'failed';
    entry.updatedAt = this.now().toISOString();

    return { ...entry };
  }

  getAggregateProgress(jobIds: string[]): AggregateProgress {
    let totalBytes = 0;
    let uploadedBytes = 0;
    let activeUploads = 0;
    let completedUploads = 0;
    let failedUploads = 0;

    for (const id of jobIds) {
      const entry = this.entries.get(id);
      if (!entry) continue;

      totalBytes += entry.totalBytes;
      uploadedBytes += entry.bytesUploaded;

      if (entry.status === 'uploading') activeUploads++;
      else if (entry.status === 'completed') completedUploads++;
      else if (entry.status === 'failed') failedUploads++;
    }

    return {
      totalBytes,
      uploadedBytes,
      percent: totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0,
      activeUploads,
      completedUploads,
      failedUploads,
    };
  }

  createProgressCallback(jobId: string): (bytesUploaded: number) => void {
    return (bytesUploaded: number) => {
      this.updateProgress(jobId, bytesUploaded);
    };
  }
}
