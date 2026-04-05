import { describe, expect, test } from 'vitest';

import {
  buildCampaignDetailView,
  type CampaignDetailData,
} from '../../apps/web/components/campaigns/campaign-detail';

describe('campaign detail view', () => {
  const baseCampaign: CampaignDetailData = {
    id: 'camp-1',
    title: 'My Launch',
    videoAssetName: 'intro.mp4',
    status: 'launching',
    targets: [
      {
        id: 'target-1',
        channelTitle: 'Main Channel',
        videoTitle: 'First Upload',
        status: 'enviando',
        youtubeVideoId: null,
        errorMessage: null,
      },
      {
        id: 'target-2',
        channelTitle: 'Second Channel',
        videoTitle: 'Second Upload',
        status: 'aguardando',
        youtubeVideoId: null,
        errorMessage: null,
      },
    ],
    createdAt: '2026-04-01T00:00:00Z',
  };

  test('renders campaign header with title and status', () => {
    const view = buildCampaignDetailView(baseCampaign);

    expect(view.header.title).toBe('My Launch');
    expect(view.header.status).toBe('launching');
    expect(view.header.videoAssetName).toBe('intro.mp4');
  });

  test('renders target rows with per-target status', () => {
    const view = buildCampaignDetailView(baseCampaign);

    expect(view.targets).toHaveLength(2);
    expect(view.targets[0].channelTitle).toBe('Main Channel');
    expect(view.targets[0].status).toBe('enviando');
    expect(view.targets[1].status).toBe('aguardando');
  });

  test('shows YouTube link when target is published', () => {
    const data: CampaignDetailData = {
      ...baseCampaign,
      status: 'completed',
      targets: [
        {
          id: 'target-1',
          channelTitle: 'Main Channel',
          videoTitle: 'Published Video',
          status: 'publicado',
          youtubeVideoId: 'yt-abc123',
          errorMessage: null,
        },
      ],
    };

    const view = buildCampaignDetailView(data);
    expect(view.targets[0].youtubeUrl).toBe('https://www.youtube.com/watch?v=yt-abc123');
  });

  test('shows error message when target failed', () => {
    const data: CampaignDetailData = {
      ...baseCampaign,
      status: 'failed',
      targets: [
        {
          id: 'target-1',
          channelTitle: 'Main Channel',
          videoTitle: 'Failed Video',
          status: 'erro',
          youtubeVideoId: null,
          errorMessage: 'quotaExceeded',
        },
      ],
    };

    const view = buildCampaignDetailView(data);
    expect(view.targets[0].errorMessage).toBe('quotaExceeded');
  });

  test('enables polling when any target is aguardando or enviando', () => {
    const view = buildCampaignDetailView(baseCampaign);
    expect(view.pollingEnabled).toBe(true);
    expect(view.pollingIntervalMs).toBe(3000);
  });

  test('disables polling when all targets are terminal (publicado or erro)', () => {
    const data: CampaignDetailData = {
      ...baseCampaign,
      status: 'completed',
      targets: [
        {
          id: 'target-1',
          channelTitle: 'Main Channel',
          videoTitle: 'Done',
          status: 'publicado',
          youtubeVideoId: 'yt-1',
          errorMessage: null,
        },
      ],
    };

    const view = buildCampaignDetailView(data);
    expect(view.pollingEnabled).toBe(false);
  });

  test('progress shows count of completed targets', () => {
    const data: CampaignDetailData = {
      ...baseCampaign,
      targets: [
        {
          id: 't1',
          channelTitle: 'Ch1',
          videoTitle: 'V1',
          status: 'publicado',
          youtubeVideoId: 'yt-1',
          errorMessage: null,
        },
        {
          id: 't2',
          channelTitle: 'Ch2',
          videoTitle: 'V2',
          status: 'enviando',
          youtubeVideoId: null,
          errorMessage: null,
        },
      ],
    };

    const view = buildCampaignDetailView(data);
    expect(view.progress).toMatchObject({
      completed: 1,
      total: 2,
    });
  });
});
