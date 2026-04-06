import { describe, expect, test, vi } from 'vitest';

import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';
import { PublishJobService, InMemoryPublishJobRepository } from '../../apps/api/src/campaigns/publish-job.service';
import { LaunchService } from '../../apps/api/src/campaigns/launch.service';
import { ScheduledLaunchChecker } from '../../apps/api/src/campaigns/scheduled-launch-checker';

function createStack(now: Date) {
  const campaignRepo = new InMemoryCampaignRepository();
  const campaignService = new CampaignService({ repository: campaignRepo, now: () => now });
  const jobRepo = new InMemoryPublishJobRepository();
  const jobService = new PublishJobService({ repository: jobRepo });
  const launchService = new LaunchService({ campaignService, jobService });
  const checker = new ScheduledLaunchChecker({ campaignService, launchService, now: () => now });

  return { campaignService, jobService, launchService, checker };
}

describe('ScheduledLaunchChecker', () => {
  test('launches ready campaigns whose scheduledAt has passed', async () => {
    const now = new Date('2026-04-10T16:00:00Z');
    const { campaignService, checker, jobService } = createStack(now);

    const { campaign } = await campaignService.createCampaign({
      title: 'Scheduled',
      videoAssetId: 'a1',
      scheduledAt: '2026-04-10T15:00:00Z',
    });
    await campaignService.addTarget(campaign.id, { channelId: 'ch-1', videoTitle: 'V', videoDescription: 'D' });
    await campaignService.markReady(campaign.id);

    const launched = await checker.checkAndLaunch();

    expect(launched).toHaveLength(1);
    expect(launched[0]).toBe(campaign.id);

    const fetched = await campaignService.getCampaign(campaign.id);
    expect(fetched!.campaign.status).toBe('launching');
  });

  test('does not launch campaigns scheduled in the future', async () => {
    const now = new Date('2026-04-10T14:00:00Z');
    const { campaignService, checker } = createStack(now);

    const { campaign } = await campaignService.createCampaign({
      title: 'Future',
      videoAssetId: 'a1',
      scheduledAt: '2026-04-10T15:00:00Z',
    });
    await campaignService.addTarget(campaign.id, { channelId: 'ch-1', videoTitle: 'V', videoDescription: 'D' });
    await campaignService.markReady(campaign.id);

    const launched = await checker.checkAndLaunch();

    expect(launched).toHaveLength(0);
    expect((await campaignService.getCampaign(campaign.id))!.campaign.status).toBe('ready');
  });

  test('ignores draft campaigns even if scheduledAt has passed', async () => {
    const now = new Date('2026-04-10T16:00:00Z');
    const { campaignService, checker } = createStack(now);

    await campaignService.createCampaign({
      title: 'Draft Only',
      videoAssetId: 'a1',
      scheduledAt: '2026-04-10T15:00:00Z',
    });
    // No targets added, campaign remains draft

    const launched = await checker.checkAndLaunch();
    expect(launched).toHaveLength(0);
  });

  test('ignores campaigns without scheduledAt', async () => {
    const now = new Date('2026-04-10T16:00:00Z');
    const { campaignService, checker } = createStack(now);

    const { campaign } = await campaignService.createCampaign({ title: 'No Schedule', videoAssetId: 'a1' });
    await campaignService.addTarget(campaign.id, { channelId: 'ch-1', videoTitle: 'V', videoDescription: 'D' });
    await campaignService.markReady(campaign.id);

    const launched = await checker.checkAndLaunch();
    expect(launched).toHaveLength(0);
  });

  test('does not double-launch already launching campaigns', async () => {
    const now = new Date('2026-04-10T16:00:00Z');
    const { campaignService, checker } = createStack(now);

    const { campaign } = await campaignService.createCampaign({
      title: 'Already Launched',
      videoAssetId: 'a1',
      scheduledAt: '2026-04-10T15:00:00Z',
    });
    await campaignService.addTarget(campaign.id, { channelId: 'ch-1', videoTitle: 'V', videoDescription: 'D' });
    await campaignService.markReady(campaign.id);
    await campaignService.launch(campaign.id); // already launching

    const launched = await checker.checkAndLaunch();
    expect(launched).toHaveLength(0);
  });
});
