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

describe('campaign target whitespace hardening', () => {
  test('POST /campaigns/:id/targets rejects whitespace-only required fields', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });
    const controller = new CampaignsController(service, new SessionGuard());

    const { campaign } = await service.createCampaign({ title: 'Camp', videoAssetId: 'asset-1' });

    const response = await controller.addTarget({
      ...createAuthenticatedRequest(),
      params: { id: campaign.id },
      body: {
        channelId: '   ',
        videoTitle: '  ',
        videoDescription: '\t',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: expect.stringContaining('channelId, videoTitle, videoDescription'),
    });

    const persisted = await service.getCampaign(campaign.id);
    expect(persisted?.campaign.targets).toHaveLength(0);
  });

  test('POST /campaigns/:id/targets trims surrounding whitespace from valid required fields', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });
    const controller = new CampaignsController(service, new SessionGuard());

    const { campaign } = await service.createCampaign({ title: 'Camp', videoAssetId: 'asset-1' });

    const response = await controller.addTarget({
      ...createAuthenticatedRequest(),
      params: { id: campaign.id },
      body: {
        channelId: '  channel-1  ',
        videoTitle: '  Test Video  ',
        videoDescription: '  Test Desc  ',
      },
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      target: {
        channelId: 'channel-1',
        videoTitle: 'Test Video',
        videoDescription: 'Test Desc',
      },
    });
  });
});
