import { describe, expect, test } from 'vitest';

import {
  PublishJobService,
  InMemoryPublishJobRepository,
  type PublishJobRecord,
} from '../../apps/api/src/campaigns/publish-job.service';

describe('publish job service', () => {
  test('enqueues one job per campaign target', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    const targets = [
      { id: 'target-1', campaignId: 'camp-1' },
      { id: 'target-2', campaignId: 'camp-1' },
    ];

    const jobs = service.enqueueForTargets(targets);

    expect(jobs).toHaveLength(2);
    expect(jobs[0].campaignTargetId).toBe('target-1');
    expect(jobs[0].status).toBe('queued');
    expect(jobs[0].attempt).toBe(1);
    expect(jobs[1].campaignTargetId).toBe('target-2');
  });

  test('picks next queued job and marks it processing', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    service.enqueueForTargets([{ id: 'target-1', campaignId: 'camp-1' }]);

    const job = service.pickNext();
    expect(job).toBeTruthy();
    expect(job!.status).toBe('processing');
    expect(job!.startedAt).toBeTruthy();
  });

  test('returns null when no queued jobs', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    const job = service.pickNext();
    expect(job).toBeNull();
  });

  test('marks job completed with YouTube video ID', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    const [job] = service.enqueueForTargets([{ id: 'target-1', campaignId: 'camp-1' }]);
    service.pickNext();

    const completed = service.markCompleted(job.id, 'yt-abc123');
    expect(completed!.status).toBe('completed');
    expect(completed!.youtubeVideoId).toBe('yt-abc123');
    expect(completed!.completedAt).toBeTruthy();
  });

  test('marks job failed with error and increments retry', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    const [job] = service.enqueueForTargets([{ id: 'target-1', campaignId: 'camp-1' }]);
    service.pickNext();

    const failed = service.markFailed(job.id, 'quotaExceeded');
    expect(failed!.status).toBe('failed');
    expect(failed!.errorMessage).toBe('quotaExceeded');
  });

  test('retry re-queues a failed job with incremented attempt', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    const [job] = service.enqueueForTargets([{ id: 'target-1', campaignId: 'camp-1' }]);
    service.pickNext();
    service.markFailed(job.id, 'timeout');

    const retried = service.retry(job.id);
    expect(retried!.status).toBe('queued');
    expect(retried!.attempt).toBe(2);
    expect(retried!.errorMessage).toBeNull();
  });

  test('rejects retry beyond max attempts', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository, maxAttempts: 3 });

    const [job] = service.enqueueForTargets([{ id: 'target-1', campaignId: 'camp-1' }]);

    // Simulate 3 failed attempts
    service.pickNext();
    service.markFailed(job.id, 'err1');
    service.retry(job.id);
    service.pickNext();
    service.markFailed(job.id, 'err2');
    service.retry(job.id);
    service.pickNext();
    service.markFailed(job.id, 'err3');

    const result = service.retry(job.id);
    expect(result).toMatchObject({ error: 'MAX_ATTEMPTS_REACHED' });
  });

  test('lists jobs for a campaign target', () => {
    const repository = new InMemoryPublishJobRepository();
    const service = new PublishJobService({ repository });

    service.enqueueForTargets([
      { id: 'target-1', campaignId: 'camp-1' },
      { id: 'target-2', campaignId: 'camp-1' },
    ]);

    const jobs = service.getJobsForTarget('target-1');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].campaignTargetId).toBe('target-1');
  });
});
