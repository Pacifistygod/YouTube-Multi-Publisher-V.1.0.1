import { describe, expect, test } from 'vitest';

import {
  buildCampaignsPageView,
} from '../../apps/web/app/(admin)/workspace/campanhas/page';
import type { CampaignListRow } from '../../apps/web/components/campaigns/campaign-list';

describe('campanhas page integration with API shapes', () => {
  test('maps API campaign list to page view', () => {
    // Simulates what the page would receive after fetching from /api/campaigns
    const apiResponse: CampaignListRow[] = [
      {
        id: 'c1',
        title: 'My First Campaign',
        videoAssetName: 'intro.mp4',
        targetCount: 3,
        status: 'completed',
        createdAt: '2026-04-01T00:00:00Z',
        scheduledAt: '2026-04-05T10:00:00Z',
      },
      {
        id: 'c2',
        title: 'Draft Campaign',
        videoAssetName: 'demo.mp4',
        targetCount: 0,
        status: 'draft',
        createdAt: '2026-04-02T00:00:00Z',
      },
    ];

    const view = buildCampaignsPageView({ campaigns: apiResponse });

    expect(view.list.rows).toHaveLength(2);
    expect(view.list.isEmpty).toBe(false);
    expect(view.emptyState).toBeUndefined();

    // Scheduled campaign preserves scheduledAt
    expect(view.list.rows[0].scheduledAt).toBe('2026-04-05T10:00:00Z');
    // Non-scheduled has no scheduledAt
    expect(view.list.rows[1].scheduledAt).toBeUndefined();
  });

  test('shows empty state when no campaigns from API', () => {
    const view = buildCampaignsPageView({ campaigns: [] });

    expect(view.list.isEmpty).toBe(true);
    expect(view.emptyState).toBeDefined();
    expect(view.emptyState!.cta).toBe('Create campaign');
  });
});
