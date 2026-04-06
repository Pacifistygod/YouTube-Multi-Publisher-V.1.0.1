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

  return { campaignService, jobService, controller, statusService };
}

function authRequest(overrides: Partial<{ params: Record<string, string>; body: unknown }> = {}) {
  return {
    session: { adminUser: { email: 'admin@example.com' } },
    ...overrides,
  };
}

describe('campaign retry resumes launching state', () => {
  test('retrying the last failed target moves the campaign out of failed state', async () => {
    const { campaignService, jobService, controller, statusService } = createFullStack();

    const { campaign } = await campaignService.createCampaign({ title: 'Retry Me', videoAssetId: 'a1' });
    const { target } = await campaignService.addTarget(campaign.id, {
      channelId: 'ch-1',
      videoTitle: 'V',
      videoDescription: 'D',
    });

    await campaignService.markReady(campaign.id);
    await campaignService.launch(campaign.id);

    const [job] = await jobService.enqueueForTargets([{ id: target.id, campaignId: campaign.id }]);
    await jobService.pickNext();
    await jobService.markFailed(job.id, 'quotaExceeded');
    await campaignService.updateTargetStatus(campaign.id, target.id, 'erro', { errorMessage: 'quotaExceeded' });

    const beforeRetry = await campaignService.getCampaign(campaign.id);
    expect(beforeRetry!.campaign.status).toBe('failed');

    const response = await controller.retryTarget(authRequest({
      params: { id: campaign.id, targetId: target.id },
    }));

    expect(response.status).toBe(200);

    const afterRetry = await campaignService.getCampaign(campaign.id);
    expect(afterRetry!.campaign.status).toBe('launching');

    const liveStatus = await statusService.getStatus(campaign.id);
    expect(liveStatus!.campaignStatus).toBe('launching');
    expect(liveStatus!.shouldPoll).toBe(true);
  });
});
