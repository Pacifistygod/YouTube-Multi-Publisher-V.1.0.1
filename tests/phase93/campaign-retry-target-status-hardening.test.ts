import { describe, expect, test } from 'vitest';

import { CampaignsController } from '../../apps/api/src/campaigns/campaigns.controller';
import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';
import { PublishJobService, InMemoryPublishJobRepository } from '../../apps/api/src/campaigns/publish-job.service';
import { LaunchService } from '../../apps/api/src/campaigns/launch.service';
import { CampaignStatusService } from '../../apps/api/src/campaigns/campaign-status.service';
import { SessionGuard } from '../../apps/api/src/auth/session.guard';

function createFullStack() {
  const campaignRepo = new InMemoryCampaignRepository();
  const campaignService = new CampaignService({ repository: campaignRepo });
  const jobRepo = new InMemoryPublishJobRepository();
  const jobService = new PublishJobService({ repository: jobRepo, maxAttempts: 3 });
  const launchService = new LaunchService({ campaignService, jobService });
  const statusService = new CampaignStatusService({ campaignService, jobService });
  const controller = new CampaignsController(
    campaignService,
    new SessionGuard(),
    launchService,
    statusService,
    jobService,
  );

  return { campaignService, jobService, controller };
}

function authRequest(overrides: Partial<{ params: Record<string, string>; body: unknown }> = {}) {
  return {
    session: { adminUser: { email: 'admin@example.com' } },
    ...overrides,
  };
}

describe('campaign retry target status hardening', () => {
  test('retryTarget rejects a target already back in progress even if a failed job still exists', async () => {
    const { controller, campaignService, jobService } = createFullStack();

    const { campaign } = await campaignService.createCampaign({ title: 'Retry Guard', videoAssetId: 'asset-1' });
    const { target } = await campaignService.addTarget(campaign.id, {
      channelId: 'ch-1',
      videoTitle: 'Video',
      videoDescription: 'Desc',
    });
    await campaignService.markReady(campaign.id);
    await campaignService.launch(campaign.id);

    const [job] = await jobService.enqueueForTargets([{ id: target.id, campaignId: campaign.id }]);
    await jobService.pickNext();
    await jobService.markFailed(job.id, 'quotaExceeded');
    await campaignService.updateTargetStatus(campaign.id, target.id, 'enviando', { errorMessage: null });

    const response = await controller.retryTarget(authRequest({
      params: { id: campaign.id, targetId: target.id },
    }));

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: expect.stringContaining('retry') });

    const [persistedJob] = await jobService.getJobsForTarget(target.id);
    expect(persistedJob.attempt).toBe(1);
    expect(persistedJob.status).toBe('failed');
  });

  test('retryTarget rejects targets already marked as published and preserves the existing video id', async () => {
    const { controller, campaignService, jobService } = createFullStack();

    const { campaign } = await campaignService.createCampaign({ title: 'Published Guard', videoAssetId: 'asset-1' });
    const { target } = await campaignService.addTarget(campaign.id, {
      channelId: 'ch-1',
      videoTitle: 'Video',
      videoDescription: 'Desc',
    });
    await campaignService.markReady(campaign.id);
    await campaignService.launch(campaign.id);

    const [job] = await jobService.enqueueForTargets([{ id: target.id, campaignId: campaign.id }]);
    await jobService.pickNext();
    await jobService.markFailed(job.id, 'transient error');
    await campaignService.updateTargetStatus(campaign.id, target.id, 'publicado', { youtubeVideoId: 'yt-123' });

    const response = await controller.retryTarget(authRequest({
      params: { id: campaign.id, targetId: target.id },
    }));

    expect(response.status).toBe(400);

    const persisted = await campaignService.getCampaign(campaign.id);
    expect(persisted!.campaign.targets[0].status).toBe('publicado');
    expect(persisted!.campaign.targets[0].youtubeVideoId).toBe('yt-123');
  });
});
