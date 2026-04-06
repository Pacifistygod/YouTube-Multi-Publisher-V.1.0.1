import { describe, expect, test } from 'vitest';

import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';
import { CampaignStatusService } from '../../apps/api/src/campaigns/campaign-status.service';
import { PublishJobService, InMemoryPublishJobRepository } from '../../apps/api/src/campaigns/publish-job.service';
import {
  buildCampaignDetailView,
  type CampaignDetailData,
} from '../../apps/web/components/campaigns/campaign-detail';

describe('empty launching polling hardening', () => {
  test('CampaignStatusService does not poll when a launching campaign has no targets', async () => {
    const repository = new InMemoryCampaignRepository();
    const campaignService = new CampaignService({ repository });
    const jobService = new PublishJobService({ repository: new InMemoryPublishJobRepository() });
    const statusService = new CampaignStatusService({ campaignService, jobService });

    const { campaign } = await campaignService.createCampaign({ title: 'Broken Launch', videoAssetId: 'asset-1' });
    repository.update(campaign.id, { status: 'launching' });

    const result = await statusService.getStatus(campaign.id);

    expect(result!.targets).toHaveLength(0);
    expect(result!.shouldPoll).toBe(false);
    expect(result!.progress).toEqual({ completed: 0, failed: 0, total: 0 });
  });

  test('buildCampaignDetailView does not enable polling for a launching campaign with no targets', () => {
    const data: CampaignDetailData = {
      id: 'camp-1',
      title: 'Broken Launch',
      videoAssetName: 'intro.mp4',
      status: 'launching',
      targets: [],
      createdAt: '2026-04-01T00:00:00Z',
    };

    const view = buildCampaignDetailView(data);

    expect(view.pollingEnabled).toBe(false);
    expect(view.progress).toEqual({ completed: 0, total: 0 });
  });
});
