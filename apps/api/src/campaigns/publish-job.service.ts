import { randomUUID } from 'node:crypto';

export interface PublishJobRecord {
  id: string;
  campaignTargetId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempt: number;
  progressPercent: number;
  youtubeVideoId: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PublishJobRepository {
  create(record: PublishJobRecord): PublishJobRecord;
  findById(id: string): PublishJobRecord | null;
  findByTargetId(targetId: string): PublishJobRecord[];
  findAll(): PublishJobRecord[];
  findNextQueued(): PublishJobRecord | null;
  update(id: string, updates: Partial<PublishJobRecord>): PublishJobRecord | null;
}

export class InMemoryPublishJobRepository implements PublishJobRepository {
  private readonly jobs: PublishJobRecord[] = [];

  create(record: PublishJobRecord): PublishJobRecord {
    this.jobs.push(record);
    return record;
  }

  findById(id: string): PublishJobRecord | null {
    return this.jobs.find((j) => j.id === id) ?? null;
  }

  findByTargetId(targetId: string): PublishJobRecord[] {
    return this.jobs.filter((j) => j.campaignTargetId === targetId);
  }

  findAll(): PublishJobRecord[] {
    return [...this.jobs];
  }

  findNextQueued(): PublishJobRecord | null {
    return this.jobs.find((j) => j.status === 'queued') ?? null;
  }

  update(id: string, updates: Partial<PublishJobRecord>): PublishJobRecord | null {
    const job = this.findById(id);
    if (!job) return null;
    Object.assign(job, updates);
    return job;
  }
}

export interface PublishJobServiceOptions {
  repository?: PublishJobRepository;
  maxAttempts?: number;
  now?: () => Date;
}

export class PublishJobService {
  private readonly repository: PublishJobRepository;
  private readonly maxAttempts: number;
  private readonly now: () => Date;

  constructor(options: PublishJobServiceOptions = {}) {
    this.repository = options.repository ?? new InMemoryPublishJobRepository();
    this.maxAttempts = options.maxAttempts ?? 3;
    this.now = options.now ?? (() => new Date());
  }

  enqueueForTargets(targets: { id: string; campaignId: string }[]): PublishJobRecord[] {
    const nowIso = this.now().toISOString();

    return targets.map((t) =>
      this.repository.create({
        id: randomUUID(),
        campaignTargetId: t.id,
        status: 'queued',
        attempt: 1,
        progressPercent: 0,
        youtubeVideoId: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: nowIso,
      }),
    );
  }

  pickNext(): PublishJobRecord | null {
    const job = this.repository.findNextQueued();
    if (!job) return null;

    return this.repository.update(job.id, {
      status: 'processing',
      startedAt: this.now().toISOString(),
    });
  }

  markCompleted(jobId: string, youtubeVideoId: string): PublishJobRecord | null {
    return this.repository.update(jobId, {
      status: 'completed',
      youtubeVideoId,
      completedAt: this.now().toISOString(),
    });
  }

  markFailed(jobId: string, errorMessage: string): PublishJobRecord | null {
    return this.repository.update(jobId, {
      status: 'failed',
      errorMessage,
    });
  }

  retry(jobId: string): PublishJobRecord | { error: 'MAX_ATTEMPTS_REACHED' | 'NOT_FOUND' } {
    const job = this.repository.findById(jobId);
    if (!job) return { error: 'NOT_FOUND' };

    if (job.attempt >= this.maxAttempts) {
      return { error: 'MAX_ATTEMPTS_REACHED' };
    }

    return this.repository.update(jobId, {
      status: 'queued',
      attempt: job.attempt + 1,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    })!;
  }

  getJobsForTarget(targetId: string): PublishJobRecord[] {
    return this.repository.findByTargetId(targetId);
  }

  getAllJobs(): PublishJobRecord[] {
    return this.repository.findAll();
  }
}
