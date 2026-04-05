import { describe, expect, test } from 'vitest';

import { buildWorkspaceLayout } from '../../apps/web/app/(admin)/workspace/layout';

describe('workspace layout includes Dashboard tab', () => {
  test('layout has 4 tabs: Accounts, Media, Campanhas, Dashboard', async () => {
    const mockFetcher = async () => ({
      status: 200,
      json: async () => ({ user: { email: 'admin@test.com' } }),
    });

    const view = await buildWorkspaceLayout({ fetcher: mockFetcher });

    expect(view.tabs).toHaveLength(4);
    expect(view.tabs![0].id).toBe('accounts');
    expect(view.tabs![1].id).toBe('media');
    expect(view.tabs![2].id).toBe('campanhas');
    expect(view.tabs![3].id).toBe('dashboard');
    expect(view.tabs![3].label).toBe('Dashboard');
  });
});
