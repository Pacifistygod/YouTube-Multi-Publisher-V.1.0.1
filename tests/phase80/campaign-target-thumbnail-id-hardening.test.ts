import { describe, expect, test } from 'vitest';

import { CampaignsController } from '../../apps/api/src/campaigns/campaigns.controller';
import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';
import { SessionGuard } from '../../apps/api/src/auth/session.guard';

function createAuthenticatedRequest() {
  return {
    session: {
      adminUser: { email: 'admin@example.com' },
    },
  };
}

describe('campaign target thumbnailAssetId hardening', () => {
  test('POST /campaigns/:id/targets rejects a whitespace-only thumbnailAssetId', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });
    const controller = new CampaignsController(service, new SessionGuard());

    const { campaign } = await service.createCampaign({ title: 'Camp', videoAssetId: 'asset-1' });

    const response = await controller.addTarget({
      ...createAuthenticatedRequest(),
      params: { id: campaign.id },
      body: {
        channelId: 'channel-1',
        videoTitle: 'Test Video',
        videoDescription: 'Test Desc',
        thumbnailAssetId: '   ',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: expect.stringContaining('thumbnailAssetId') });
  });

  test('PATCH /campaigns/:id/targets trims a valid thumbnailAssetId before saving', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });
    const controller = new CampaignsController(service, new SessionGuard());

    const { campaign } = await service.createCampaign({ title: 'Camp', videoAssetId: 'asset-1' });
    const { target } = await service.addTarget(campaign.id, {
      channelId: 'channel-1',
      videoTitle: 'Original Title',
      videoDescription: 'Original Desc',
    });

    const response = await controller.updateTarget({
      ...createAuthenticatedRequest(),
      params: { id: campaign.id, targetId: target.id },
      body: {
        thumbnailAssetId: '  thumb-99  ',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      target: {
        thumbnailAssetId: 'thumb-99',
      },
    });
  });
});
