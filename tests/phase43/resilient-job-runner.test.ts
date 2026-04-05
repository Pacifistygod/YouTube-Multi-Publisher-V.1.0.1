import { describe, it, expect, vi } from 'vitest';
import { ResilientJobRunner, type ResilientJobRunnerOptions } from '../../apps/api/src/campaigns/resilient-job-runner';
import type { PublishJobRecord } from '../../apps/api/src/campaigns/publish-job.service';

function makeJob(overrides: Partial<PublishJobRecord> = {}): PublishJobRecord {
  return {
    id: overrides.id ?? 'job-1',
    campaignTargetId: 'target-1',
    status: 'completed',
    attempt: 1,
    progressPercent: 100,
    youtubeVideoId: 'yt-123',
    errorMessage: null,
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:01:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeFailedJob(id = 'job-1'): PublishJobRecord {
  return makeJob({
    id,
    status: 'failed',
    youtubeVideoId: null,
    errorMessage: 'Upload failed',
    completedAt: null,
    progressPercent: 0,
  });
}

function createRunner(overrides: Partial<ResilientJobRunnerOptions> = {}) {
  const processNext = overrides.processNext ?? vi.fn(async () => null);
  const retryJob = overrides.retryJob ?? vi.fn(() => makeJob({ status: 'queued' }));
  const onRetry = overrides.onRetry ?? vi.fn();
  const runner = new ResilientJobRunner({
    processNext,
    retryJob,
    maxRetries: overrides.maxRetries ?? 2,
    baseDelayMs: overrides.baseDelayMs ?? 100,
    backoffMultiplier: overrides.backoffMultiplier ?? 2,
    onRetry,
    _delayFn: overrides._delayFn ?? (async () => {}),
  });
  return { runner, processNext, retryJob, onRetry };
}

describe('ResilientJobRunner', () => {
  it('processes all jobs successfully without retries', async () => {
    let callCount = 0;
    const { runner } = createRunner({
      processNext: vi.fn(async () => {
        callCount++;
        if (callCount <= 2) return makeJob({ id: `job-${callCount}` });
        return null;
      }),
    });

    const results = await runner.processAll();
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('job-1');
    expect(results[1].id).toBe('job-2');
  });

  it('retries a failed job and succeeds on retry', async () => {
    let callCount = 0;
    const { runner, retryJob } = createRunner({
      processNext: vi.fn(async () => {
        callCount++;
        if (callCount === 1) return makeFailedJob('job-1');
        if (callCount === 2) return makeJob({ id: 'job-1' });
        return null;
      }),
    });

    const results = await runner.processAll();
    expect(retryJob).toHaveBeenCalledWith('job-1');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('completed');
  });

  it('gives up after exhausting retries', async () => {
    const { runner, retryJob } = createRunner({
      maxRetries: 2,
      processNext: vi.fn(async () => {
        return makeFailedJob('job-1');
      }),
      retryJob: vi.fn(() => makeJob({ status: 'queued' })),
    });

    const results = await runner.processAll();
    // 1 initial + 2 retries = retryJob called 2 times
    expect(retryJob).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
  });

  it('applies exponential backoff delays between retries', async () => {
    const delays: number[] = [];
    const { runner } = createRunner({
      maxRetries: 3,
      baseDelayMs: 100,
      backoffMultiplier: 2,
      _delayFn: async (ms: number) => { delays.push(ms); },
      processNext: vi.fn(async () => makeFailedJob('job-1')),
      retryJob: vi.fn(() => makeJob({ status: 'queued' })),
    });

    await runner.processAll();
    expect(delays).toEqual([100, 200, 400]);
  });

  it('calls onRetry callback before each retry', async () => {
    const retries: Array<{ jobId: string; attempt: number }> = [];
    let callCount = 0;
    const { runner } = createRunner({
      maxRetries: 2,
      onRetry: (jobId, attempt) => { retries.push({ jobId, attempt }); },
      processNext: vi.fn(async () => {
        callCount++;
        if (callCount <= 2) return makeFailedJob('job-1');
        return makeJob({ id: 'job-1' });
      }),
      retryJob: vi.fn(() => makeJob({ status: 'queued' })),
    });

    await runner.processAll();
    expect(retries).toEqual([
      { jobId: 'job-1', attempt: 2 },
      { jobId: 'job-1', attempt: 3 },
    ]);
  });

  it('handles multiple jobs with mixed success and failure', async () => {
    const sequence = [
      makeJob({ id: 'job-1' }),          // success
      makeFailedJob('job-2'),             // fail
      makeJob({ id: 'job-2' }),           // retry success
      makeJob({ id: 'job-3' }),           // success
      null,                               // done
    ];
    let idx = 0;
    const { runner } = createRunner({
      processNext: vi.fn(async () => sequence[idx++] ?? null),
      retryJob: vi.fn(() => makeJob({ status: 'queued' })),
    });

    const results = await runner.processAll();
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(['job-1', 'job-2', 'job-3']);
  });

  it('returns empty array when no jobs queued', async () => {
    const { runner } = createRunner({
      processNext: vi.fn(async () => null),
    });

    const results = await runner.processAll();
    expect(results).toEqual([]);
  });

  it('does not retry when retryJob returns error', async () => {
    let callCount = 0;
    const { runner } = createRunner({
      maxRetries: 2,
      processNext: vi.fn(async () => {
        callCount++;
        if (callCount === 1) return makeFailedJob('job-1');
        return null;
      }),
      retryJob: vi.fn(() => ({ error: 'MAX_ATTEMPTS_REACHED' as const })),
    });

    const results = await runner.processAll();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
  });

  it('tracks total retries in run summary', async () => {
    let callCount = 0;
    const { runner } = createRunner({
      maxRetries: 2,
      processNext: vi.fn(async () => {
        callCount++;
        if (callCount === 1) return makeFailedJob('job-1');
        if (callCount === 2) return makeJob({ id: 'job-1' });
        if (callCount === 3) return makeFailedJob('job-2');
        if (callCount <= 5) return makeFailedJob('job-2');
        return null;
      }),
      retryJob: vi.fn(() => makeJob({ status: 'queued' })),
    });

    const summary = await runner.processAllWithSummary();
    expect(summary.totalProcessed).toBe(2);
    expect(summary.totalRetries).toBeGreaterThan(0);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it('does not delay on first attempt', async () => {
    const delays: number[] = [];
    let called = false;
    const { runner } = createRunner({
      _delayFn: async (ms: number) => { delays.push(ms); },
      processNext: vi.fn(async () => {
        if (!called) { called = true; return makeJob({ id: 'job-1' }); }
        return null;
      }),
    });

    await runner.processAll();
    expect(delays).toEqual([]);
  });
});
