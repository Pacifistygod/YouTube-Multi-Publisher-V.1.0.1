import { describe, expect, test } from 'vitest';

import {
  buildCampaignsPageView,
} from '../../apps/web/app/(admin)/workspace/campanhas/page';

import {
  buildCampaignDetailView,
  type CampaignDetailData,
} from '../../apps/web/components/campaigns/campaign-detail';

import {
  buildCampaignListView,
  type CampaignListRow,
} from '../../apps/web/components/campaigns/campaign-list';

describe('campaign list shows scheduled badge', () => {
  test('row includes scheduledAt and displays schedule badge', () => {
    const row: CampaignListRow = {
      id: 'c1',
      title: 'Scheduled Campaign',
      videoAssetName: 'intro.mp4',
      targetCount: 2,
      status: 'ready',
      createdAt: '2026-04-01T00:00:00Z',
      scheduledAt: '2026-04-10T15:00:00Z',
    };

    const view = buildCampaignListView({ rows: [row] });
    expect(view.rows[0].scheduledAt).toBe('2026-04-10T15:00:00Z');
  });

  test('row without scheduledAt has no schedule badge', () => {
    const row: CampaignListRow = {
      id: 'c1',
      title: 'Immediate',
      videoAssetName: 'intro.mp4',
      targetCount: 1,
      status: 'draft',
      createdAt: '2026-04-01T00:00:00Z',
    };

    const view = buildCampaignListView({ rows: [row] });
    expect(view.rows[0].scheduledAt).toBeUndefined();
  });
});

describe('campaign detail shows retry action for failed targets', () => {
  test('failed target has retryAvailable flag', () => {
    const data: CampaignDetailData = {
      id: 'camp-1',
      title: 'Failed Campaign',
      videoAssetName: 'intro.mp4',
      status: 'failed',
      targets: [
        {
          id: 't1',
          channelTitle: 'Main Channel',
          videoTitle: 'Failed Upload',
          status: 'erro',
          youtubeVideoId: null,
          errorMessage: 'quotaExceeded',
          retryCount: 1,
          maxRetries: 3,
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
    };

    const view = buildCampaignDetailView(data);
    expect(view.targets[0].retryAvailable).toBe(true);
  });

  test('failed target with max retries has no retry available', () => {
    const data: CampaignDetailData = {
      id: 'camp-1',
      title: 'Exhausted',
      videoAssetName: 'intro.mp4',
      status: 'failed',
      targets: [
        {
          id: 't1',
          channelTitle: 'Main Channel',
          videoTitle: 'Dead Upload',
          status: 'erro',
          youtubeVideoId: null,
          errorMessage: 'quotaExceeded',
          retryCount: 3,
          maxRetries: 3,
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
    };

    const view = buildCampaignDetailView(data);
    expect(view.targets[0].retryAvailable).toBe(false);
  });

  test('successful targets do not have retry', () => {
    const data: CampaignDetailData = {
      id: 'camp-1',
      title: 'Done',
      videoAssetName: 'intro.mp4',
      status: 'completed',
      targets: [
        {
          id: 't1',
          channelTitle: 'Main Channel',
          videoTitle: 'Published',
          status: 'publicado',
          youtubeVideoId: 'yt-1',
          errorMessage: null,
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
    };

    const view = buildCampaignDetailView(data);
    expect(view.targets[0].retryAvailable).toBe(false);
  });
});

describe('campaigns page with scheduling info', () => {
  test('shows scheduled campaigns with badge', () => {
    const view = buildCampaignsPageView({
      campaigns: [
        {
          id: 'c1',
          title: 'Scheduled',
          videoAssetName: 'intro.mp4',
          targetCount: 2,
          status: 'ready',
          createdAt: '2026-04-01T00:00:00Z',
          scheduledAt: '2026-04-10T15:00:00Z',
        },
      ],
    });

    expect(view.list.rows[0].scheduledAt).toBe('2026-04-10T15:00:00Z');
  });
});
