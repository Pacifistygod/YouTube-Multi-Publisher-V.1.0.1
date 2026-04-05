import { describe, expect, test } from 'vitest';

import {
  buildDashboardPageView,
  type DashboardPageData,
} from '../../apps/web/app/(admin)/workspace/dashboard/page';
import type { DashboardData } from '../../apps/web/components/campaigns/dashboard';

describe('dashboard page view builder', () => {
  test('produces dashboard view from API data', () => {
    const apiData: DashboardData = {
      campaigns: { total: 5, byStatus: { draft: 1, ready: 1, launching: 1, completed: 1, failed: 1 } },
      targets: { total: 20, byStatus: { aguardando: 2, enviando: 2, publicado: 12, erro: 4 }, successRate: 75 },
      jobs: { total: 25, byStatus: { queued: 1, processing: 1, completed: 18, failed: 5 }, totalRetries: 3 },
      channels: [
        { channelId: 'ch-1', totalTargets: 10, published: 8, failed: 2, successRate: 80 },
      ],
    };

    const view = buildDashboardPageView({ stats: apiData });

    expect(view.dashboard.summaryCards).toHaveLength(4);
    expect(view.dashboard.summaryCards[0].value).toBe(5);
    expect(view.dashboard.channelLeaderboard).toHaveLength(1);
    expect(view.dashboard.isEmpty).toBe(false);
  });

  test('shows empty state when no data', () => {
    const emptyData: DashboardData = {
      campaigns: { total: 0, byStatus: { draft: 0, ready: 0, launching: 0, completed: 0, failed: 0 } },
      targets: { total: 0, byStatus: { aguardando: 0, enviando: 0, publicado: 0, erro: 0 }, successRate: 0 },
      jobs: { total: 0, byStatus: { queued: 0, processing: 0, completed: 0, failed: 0 }, totalRetries: 0 },
      channels: [],
    };

    const view = buildDashboardPageView({ stats: emptyData });

    expect(view.dashboard.isEmpty).toBe(true);
    expect(view.emptyState).toBeDefined();
    expect(view.emptyState!.heading).toContain('No data');
  });
});
