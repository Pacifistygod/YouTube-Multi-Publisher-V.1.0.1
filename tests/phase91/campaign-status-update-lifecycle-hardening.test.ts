import { describe, expect, test } from 'vitest';

import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';

function createService() {
  return new CampaignService({ repository: new InMemoryCampaignRepository() });
}

describe('campaign status update lifecycle hardening', () => {
  test('updateTargetStatus promotes a draft campaign to launching once work starts', async () => {
    const service = createService();

    const { campaign } = await service.createCampaign({ title: 'Draft Campaign', videoAssetId: 'asset-1' });
    const { target } = await service.addTarget(campaign.id, {
      channelId: 'ch-1',
      videoTitle: 'Original Title',
      videoDescription: 'Original Desc',
    });
    await service.addTarget(campaign.id, {
      channelId: 'ch-2',
      videoTitle: 'Second Title',
      videoDescription: 'Second Desc',
    });

    const result = await service.updateTargetStatus(campaign.id, target.id, 'enviando');

    expect(result).toEqual({
      target: expect.objectContaining({
        id: target.id,
        status: 'enviando',
      }),
    });

    const persisted = await service.getCampaign(campaign.id);
    expect(persisted!.campaign.status).toBe('launching');
    expect(persisted!.campaign.targets[0].status).toBe('enviando');
    expect(persisted!.campaign.targets[1].status).toBe('aguardando');
  });

  test('updateTargetStatus promotes a ready campaign to launching until all targets finish', async () => {
    const service = createService();

    const { campaign } = await service.createCampaign({ title: 'Ready Campaign', videoAssetId: 'asset-1' });
    const { target } = await service.addTarget(campaign.id, {
      channelId: 'ch-1',
      videoTitle: 'Original Title',
      videoDescription: 'Original Desc',
    });
    await service.addTarget(campaign.id, {
      channelId: 'ch-2',
      videoTitle: 'Second Title',
      videoDescription: 'Second Desc',
    });
    await service.markReady(campaign.id);

    const result = await service.updateTargetStatus(campaign.id, target.id, 'publicado', {
      youtubeVideoId: 'yt-ready',
    });

    expect(result).toEqual({
      target: expect.objectContaining({
        id: target.id,
        status: 'publicado',
        youtubeVideoId: 'yt-ready',
      }),
    });

    const persisted = await service.getCampaign(campaign.id);
    expect(persisted!.campaign.status).toBe('launching');
    expect(persisted!.campaign.targets[0].status).toBe('publicado');
    expect(persisted!.campaign.targets[1].status).toBe('aguardando');
  });
});
