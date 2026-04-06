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

describe('campaign target tags validation', () => {
  test('POST /campaigns/:id/targets rejects invalid tags payloads', async () => {
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
        tags: ['alpha', 42, 'beta'],
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: expect.stringContaining('tags') });
  });

  test('PATCH /campaigns/:id/targets trims and filters tag values before saving', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });
    const controller = new CampaignsController(service, new SessionGuard());

    const { campaign } = await service.createCampaign({ title: 'Camp', videoAssetId: 'asset-1' });
    const { target } = await service.addTarget(campaign.id, {
      channelId: 'channel-1',
      videoTitle: 'Original Title',
      videoDescription: 'Original Desc',
      tags: ['original'],
    });

    const response = await controller.updateTarget({
      ...createAuthenticatedRequest(),
      params: { id: campaign.id, targetId: target.id },
      body: {
        tags: ['  alpha  ', ' ', 'beta  '],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      target: {
        tags: ['alpha', 'beta'],
      },
    });
  });
});
