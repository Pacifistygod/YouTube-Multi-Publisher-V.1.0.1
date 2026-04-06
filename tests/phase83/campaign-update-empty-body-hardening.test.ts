import { describe, expect, test } from 'vitest';

import { createApiRouter } from '../../apps/api/src/router';
import { createCampaignsModule } from '../../apps/api/src/campaigns/campaigns.module';

const authedSession = { adminUser: { email: 'admin@test.com' } };

function setup() {
  const campaignsModule = createCampaignsModule();
  const router = createApiRouter({ campaignsModule });
  return { campaignService: campaignsModule.campaignService, router };
}

describe('campaign update body hardening', () => {
  test('PATCH /api/campaigns/:id rejects an empty body', async () => {
    const { campaignService, router } = setup();
    const { campaign } = await campaignService.createCampaign({
      title: 'Original Campaign',
      videoAssetId: 'asset-1',
    });

    const response = await router.handle({
      method: 'PATCH',
      path: `/api/campaigns/${campaign.id}`,
      session: authedSession,
      body: {},
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('No updatable fields');
  });

  test('PATCH /api/campaigns/:id rejects a body with only unrelated fields', async () => {
    const { campaignService, router } = setup();
    const { campaign } = await campaignService.createCampaign({
      title: 'Original Campaign',
      videoAssetId: 'asset-1',
    });

    const response = await router.handle({
      method: 'PATCH',
      path: `/api/campaigns/${campaign.id}`,
      session: authedSession,
      body: { status: 'completed' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('No updatable fields');
  });
});
