import { describe, expect, test } from 'vitest';

import { InMemoryPublishJobRepository, PublishJobService } from '../../apps/api/src/campaigns/publish-job.service';

describe('publish job retry lifecycle hardening', () => {
  test('retry rejects jobs that have not failed yet', async () => {
    const service = new PublishJobService({ repository: new InMemoryPublishJobRepository(), maxAttempts: 3 });

    const [job] = await service.enqueueForTargets([{ id: 'target-1', campaignId: 'camp-1' }]);

    const queuedRetry = await service.retry(job.id);
    expect(queuedRetry).toEqual({ error: 'INVALID_STATUS' });

    await service.pickNext();
    const processingRetry = await service.retry(job.id);
    expect(processingRetry).toEqual({ error: 'INVALID_STATUS' });

    const [persisted] = await service.getJobsForTarget('target-1');
    expect(persisted.status).toBe('processing');
    expect(persisted.attempt).toBe(1);
  });

  test('retry rejects completed jobs and preserves their completion data', async () => {
    const service = new PublishJobService({ repository: new InMemoryPublishJobRepository(), maxAttempts: 3 });

    const [job] = await service.enqueueForTargets([{ id: 'target-2', campaignId: 'camp-1' }]);
    await service.pickNext();
    await service.markCompleted(job.id, 'yt-123');

    const retried = await service.retry(job.id);
    expect(retried).toEqual({ error: 'INVALID_STATUS' });

    const [persisted] = await service.getJobsForTarget('target-2');
    expect(persisted.status).toBe('completed');
    expect(persisted.youtubeVideoId).toBe('yt-123');
    expect(persisted.attempt).toBe(1);
  });
});
