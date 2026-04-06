import { describe, expect, test } from 'vitest';

import { createApiRouter } from '../../apps/api/src/router';
import { createCampaignsModule } from '../../apps/api/src/campaigns/campaigns.module';

const authedSession = { adminUser: { email: 'admin@test.com' } };

function setup() {
  const campaignsModule = createCampaignsModule();
  const router = createApiRouter({ campaignsModule });
  return { campaignService: campaignsModule.campaignService, router };
}

describe('campaign scheduledAt hardening', () => {
  test('POST /api/campaigns rejects an invalid scheduledAt value', async () => {
    const { router } = setup();

    const response = await router.handle({
      method: 'POST',
      path: '/api/campaigns',
      session: authedSession,
      body: {
        title: 'Scheduled campaign',
        videoAssetId: 'asset-1',
        scheduledAt: 'not-a-date',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: expect.stringContaining('scheduledAt') });
  });

  test('PATCH /api/campaigns/:id trims a valid scheduledAt before saving', async () => {
    const { campaignService, router } = setup();
    const { campaign } = await campaignService.createCampaign({
      title: 'Original Campaign',
      videoAssetId: 'asset-1',
    });

    const response = await router.handle({
      method: 'PATCH',
      path: `/api/campaigns/${campaign.id}`,
      session: authedSession,
      body: { scheduledAt: ' 2026-12-31T00:00:00Z  ' },
    });

    expect(response.status).toBe(200);
    expect(response.body.campaign.scheduledAt).toBe('2026-12-31T00:00:00Z');
  });
});
