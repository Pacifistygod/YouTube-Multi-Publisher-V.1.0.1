import { describe, it, expect } from 'vitest';
import { createApiRouter } from '../../apps/api/src/router';
import { CampaignService } from '../../apps/api/src/campaigns/campaign.service';
import { CampaignsController } from '../../apps/api/src/campaigns/campaigns.controller';
import type { ApiRequest } from '../../apps/api/src/router';

function setup() {
  const campaignService = new CampaignService();
  const campaignsController = new CampaignsController({ campaignService });
  const router = createApiRouter({
    campaignsModule: { campaignsController, campaignService },
  });
  const session = { adminUser: { id: 'admin-1', email: 'a@b.com' } };
  return { campaignService, campaignsController, router, session };
}

function createCampaignWithTarget(campaignService: CampaignService) {
  const { campaign } = campaignService.createCampaign({
    title: 'Test Campaign',
    videoAssetId: 'asset-1',
  });
  const { target } = campaignService.addTarget(campaign.id, {
    channelId: 'ch-1',
    videoTitle: 'Video Title',
    videoDescription: 'Description',
  });
  return { campaign, target };
}

describe('Campaign Target Management Routes', () => {
  describe('DELETE /api/campaigns/:id/targets/:targetId', () => {
    it('removes a target and returns 200', async () => {
      const { campaignService, router, session } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'DELETE',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session,
      };

      const response = await router.handle(request);
      expect(response.status).toBe(200);

      // Verify target is actually removed
      const result = campaignService.getCampaign(campaign.id);
      expect(result!.campaign.targets).toHaveLength(0);
    });

    it('returns 404 for non-existent target', async () => {
      const { campaignService, router, session } = setup();
      const { campaign } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'DELETE',
        path: `/api/campaigns/${campaign.id}/targets/non-existent`,
        session,
      };

      const response = await router.handle(request);
      expect(response.status).toBe(404);
    });

    it('returns 401 without session', async () => {
      const { campaignService, router } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'DELETE',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session: null,
      };

      const response = await router.handle(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/campaigns/:id/targets/:targetId', () => {
    it('updates videoTitle and returns updated target', async () => {
      const { campaignService, router, session } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session,
        body: { videoTitle: 'Updated Title' },
      };

      const response = await router.handle(request);
      expect(response.status).toBe(200);
      expect(response.body.target.videoTitle).toBe('Updated Title');
      expect(response.body.target.videoDescription).toBe('Description');
    });

    it('updates videoDescription', async () => {
      const { campaignService, router, session } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session,
        body: { videoDescription: 'New Desc' },
      };

      const response = await router.handle(request);
      expect(response.status).toBe(200);
      expect(response.body.target.videoDescription).toBe('New Desc');
    });

    it('updates tags and privacy', async () => {
      const { campaignService, router, session } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session,
        body: { tags: ['tag1', 'tag2'], privacy: 'public' },
      };

      const response = await router.handle(request);
      expect(response.status).toBe(200);
      expect(response.body.target.tags).toEqual(['tag1', 'tag2']);
      expect(response.body.target.privacy).toBe('public');
    });

    it('updates thumbnailAssetId', async () => {
      const { campaignService, router, session } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session,
        body: { thumbnailAssetId: 'thumb-99' },
      };

      const response = await router.handle(request);
      expect(response.status).toBe(200);
      expect(response.body.target.thumbnailAssetId).toBe('thumb-99');
    });

    it('returns 404 for non-existent target', async () => {
      const { campaignService, router, session } = setup();
      const { campaign } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/bogus`,
        session,
        body: { videoTitle: 'X' },
      };

      const response = await router.handle(request);
      expect(response.status).toBe(404);
    });

    it('returns 401 without session', async () => {
      const { campaignService, router } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session: null,
        body: { videoTitle: 'X' },
      };

      const response = await router.handle(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 when body is empty', async () => {
      const { campaignService, router, session } = setup();
      const { campaign, target } = createCampaignWithTarget(campaignService);

      const request: ApiRequest = {
        method: 'PATCH',
        path: `/api/campaigns/${campaign.id}/targets/${target.id}`,
        session,
        body: {},
      };

      const response = await router.handle(request);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No updatable fields');
    });
  });
});
