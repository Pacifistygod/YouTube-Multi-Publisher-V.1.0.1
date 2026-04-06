import { describe, expect, test } from 'vitest';

import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';
import { buildCampaignDetailView, type CampaignDetailData } from '../../apps/web/components/campaigns/campaign-detail';

describe('campaign stale error message hardening', () => {
  test('updateTargetStatus clears a stale errorMessage when a failed target later publishes successfully', async () => {
    const service = new CampaignService({ repository: new InMemoryCampaignRepository() });

    const { campaign } = await service.createCampaign({ title: 'Recovered Target', videoAssetId: 'asset-1' });
    const { target } = await service.addTarget(campaign.id, {
      channelId: 'ch-1',
      videoTitle: 'Video',
      videoDescription: 'Desc',
    });

    await service.markReady(campaign.id);
    await service.launch(campaign.id);
    await service.updateTargetStatus(campaign.id, target.id, 'erro', { errorMessage: 'quotaExceeded' });
    await service.updateTargetStatus(campaign.id, target.id, 'publicado', { youtubeVideoId: 'yt-999' });

    const persisted = await service.getCampaign(campaign.id);
    expect(persisted!.campaign.targets[0]).toMatchObject({
      status: 'publicado',
      youtubeVideoId: 'yt-999',
      errorMessage: null,
    });
  });

  test('campaign detail hides stale error text for non-failed targets', () => {
    const data: CampaignDetailData = {
      id: 'camp-1',
      title: 'Recovered Campaign',
      videoAssetName: 'clip.mp4',
      status: 'completed',
      targets: [
        {
          id: 'target-1',
          channelTitle: 'Main Channel',
          videoTitle: 'Recovered Upload',
          status: 'publicado',
          youtubeVideoId: 'yt-999',
          errorMessage: 'old failure',
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
    };

    const view = buildCampaignDetailView(data);

    expect(view.targets[0].errorMessage).toBeNull();
  });
});
