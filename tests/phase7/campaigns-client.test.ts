import { describe, expect, test, vi } from 'vitest';

import {
  campaignsApiClient,
  type CampaignsApiClient,
} from '../../apps/web/lib/campaigns-client';
import type { AuthFetch, AuthFetchResponse } from '../../apps/web/lib/auth-client';

function mockFetcher(responses: Record<string, { status: number; body: unknown }>): AuthFetch {
  return async (url: string, init?: any): Promise<AuthFetchResponse> => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const match = Object.entries(responses).find(([pattern]) => {
      if (pattern === key) return true;
      // Support patterns like "GET /api/campaigns/:id" matching "GET /api/campaigns/abc"
      const regex = new RegExp('^' + pattern.replace(/:[\w]+/g, '[^/]+') + '$');
      return regex.test(key);
    });

    const resp = match?.[1] ?? { status: 404, body: { error: 'Not found' } };
    return {
      status: resp.status,
      json: async () => resp.body,
    };
  };
}

describe('campaignsApiClient', () => {
  test('listCampaigns fetches GET /api/campaigns', async () => {
    const client = campaignsApiClient(mockFetcher({
      'GET /api/campaigns': {
        status: 200,
        body: { campaigns: [{ id: 'c1', title: 'Test', status: 'draft' }] },
      },
    }));

    const result = await client.listCampaigns();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].title).toBe('Test');
    }
  });

  test('createCampaign posts to POST /api/campaigns', async () => {
    const client = campaignsApiClient(mockFetcher({
      'POST /api/campaigns': {
        status: 201,
        body: { campaign: { id: 'c1', title: 'New', status: 'draft' } },
      },
    }));

    const result = await client.createCampaign({ title: 'New', videoAssetId: 'v1' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.campaign.title).toBe('New');
  });

  test('getCampaign fetches GET /api/campaigns/:id', async () => {
    const client = campaignsApiClient(mockFetcher({
      'GET /api/campaigns/:id': {
        status: 200,
        body: { campaign: { id: 'c1', title: 'Detail' } },
      },
    }));

    const result = await client.getCampaign('c1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.campaign.title).toBe('Detail');
  });

  test('launchCampaign posts to POST /api/campaigns/:id/launch', async () => {
    const client = campaignsApiClient(mockFetcher({
      'POST /api/campaigns/:id/launch': {
        status: 200,
        body: { campaign: { id: 'c1', status: 'launching' } },
      },
    }));

    const result = await client.launchCampaign('c1');
    expect(result.ok).toBe(true);
  });

  test('deleteCampaign sends DELETE /api/campaigns/:id', async () => {
    const client = campaignsApiClient(mockFetcher({
      'DELETE /api/campaigns/:id': { status: 200, body: {} },
    }));

    const result = await client.deleteCampaign('c1');
    expect(result.ok).toBe(true);
  });

  test('getDashboard fetches GET /api/dashboard', async () => {
    const client = campaignsApiClient(mockFetcher({
      'GET /api/dashboard': {
        status: 200,
        body: {
          campaigns: { total: 5, byStatus: {} },
          targets: { total: 10, byStatus: {}, successRate: 80 },
          jobs: { total: 15, byStatus: {}, totalRetries: 2 },
          channels: [],
        },
      },
    }));

    const result = await client.getDashboard();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.campaigns.total).toBe(5);
  });

  test('handles error responses', async () => {
    const client = campaignsApiClient(mockFetcher({
      'GET /api/campaigns': { status: 500, body: { error: 'Server error' } },
    }));

    const result = await client.listCampaigns();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Server error');
  });

  test('retryTarget posts to POST /api/campaigns/:id/targets/:targetId/retry', async () => {
    const client = campaignsApiClient(mockFetcher({
      'POST /api/campaigns/:id/targets/:targetId/retry': {
        status: 200,
        body: { job: { id: 'j1', status: 'queued', attempt: 2 } },
      },
    }));

    const result = await client.retryTarget('c1', 't1');
    expect(result.ok).toBe(true);
  });

  test('getStatus fetches GET /api/campaigns/:id/status', async () => {
    const client = campaignsApiClient(mockFetcher({
      'GET /api/campaigns/:id/status': {
        status: 200,
        body: {
          campaignId: 'c1',
          campaignStatus: 'launching',
          targets: [],
          shouldPoll: true,
          progress: { completed: 0, failed: 0, total: 2 },
        },
      },
    }));

    const result = await client.getStatus('c1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.shouldPoll).toBe(true);
  });
});
