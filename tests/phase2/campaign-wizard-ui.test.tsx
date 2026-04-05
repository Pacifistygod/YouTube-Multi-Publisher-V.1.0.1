import { describe, expect, test } from 'vitest';

import {
  buildCampaignWizardView,
  type CampaignWizardData,
  type CampaignWizardView,
} from '../../apps/web/components/campaigns/campaign-wizard';

import {
  buildCampaignListView,
  type CampaignListRow,
} from '../../apps/web/components/campaigns/campaign-list';

import {
  buildCampaignsPageView,
  type CampaignsPageData,
} from '../../apps/web/app/(admin)/workspace/campanhas/page';

describe('campaigns page view', () => {
  test('shows empty state when no campaigns exist', () => {
    const view = buildCampaignsPageView({ campaigns: [] });

    expect(view.emptyState).toBeDefined();
    expect(view.emptyState!.heading).toBe('No campaigns yet');
    expect(view.emptyState!.cta).toBe('Create campaign');
  });

  test('hides empty state when campaigns exist', () => {
    const view = buildCampaignsPageView({
      campaigns: [
        {
          id: 'camp-1',
          title: 'Launch video',
          videoAssetName: 'intro.mp4',
          targetCount: 2,
          status: 'draft',
          createdAt: '2026-04-01T00:00:00Z',
        },
      ],
    });

    expect(view.emptyState).toBeUndefined();
    expect(view.list.rows).toHaveLength(1);
  });
});

describe('campaign list view', () => {
  const campaignRow: CampaignListRow = {
    id: 'camp-1',
    title: 'Launch video',
    videoAssetName: 'intro.mp4',
    targetCount: 2,
    status: 'draft',
    createdAt: '2026-04-01T00:00:00Z',
  };

  test('renders campaign rows with title/status/targets', () => {
    const view = buildCampaignListView({ rows: [campaignRow] });

    expect(view.isEmpty).toBe(false);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0].title).toBe('Launch video');
    expect(view.rows[0].status).toBe('draft');
    expect(view.rows[0].targetCount).toBe(2);
  });

  test('columns include Title, Video, Targets, Status, Created', () => {
    const view = buildCampaignListView({ rows: [campaignRow] });
    expect(view.columns).toEqual(['Title', 'Video', 'Targets', 'Status', 'Created']);
  });

  test('isEmpty true for empty list', () => {
    const view = buildCampaignListView({ rows: [] });
    expect(view.isEmpty).toBe(true);
  });
});

describe('campaign wizard view', () => {
  const wizardData: CampaignWizardData = {
    availableVideos: [
      { id: 'v1', original_name: 'intro.mp4', duration_seconds: 120 },
      { id: 'v2', original_name: 'outro.mp4', duration_seconds: 60 },
    ],
    availableChannels: [
      { id: 'ch-1', title: 'Main Channel', thumbnailUrl: null, isActive: true },
      { id: 'ch-2', title: 'Second Channel', thumbnailUrl: null, isActive: true },
    ],
  };

  test('wizard has 4 steps in order', () => {
    const view = buildCampaignWizardView(wizardData);

    expect(view.steps).toHaveLength(4);
    expect(view.steps.map((s) => s.label)).toEqual([
      'Select video',
      'Select channels',
      'Metadata',
      'Review & launch',
    ]);
  });

  test('starts at step 0 (select video)', () => {
    const view = buildCampaignWizardView(wizardData);
    expect(view.currentStep).toBe(0);
  });

  test('step 1 lists available videos with name and duration', () => {
    const view = buildCampaignWizardView(wizardData);
    const videoStep = view.steps[0];

    expect(videoStep.videos).toHaveLength(2);
    expect(videoStep.videos![0].original_name).toBe('intro.mp4');
    expect(videoStep.videos![0].duration_seconds).toBe(120);
  });

  test('step 2 lists available active channels', () => {
    const view = buildCampaignWizardView(wizardData);
    const channelStep = view.steps[1];

    expect(channelStep.channels).toHaveLength(2);
    expect(channelStep.channels![0].title).toBe('Main Channel');
  });

  test('step 3 has metadata fields per selected channel', () => {
    const view = buildCampaignWizardView(wizardData);
    const metadataStep = view.steps[2];

    expect(metadataStep.metadataFields).toMatchObject({
      videoTitle: { required: true },
      videoDescription: { required: true },
      tags: { required: false },
      privacy: { required: false, options: ['public', 'unlisted', 'private'] },
    });
  });

  test('step 4 is the review and launch step', () => {
    const view = buildCampaignWizardView(wizardData);
    const reviewStep = view.steps[3];

    expect(reviewStep.label).toBe('Review & launch');
    expect(reviewStep.confirmationMessage).toBe(
      'Tem certeza? Isso vai iniciar o upload para o YouTube.',
    );
  });

  test('all steps are clickable for navigation', () => {
    const view = buildCampaignWizardView(wizardData);
    expect(view.steps.every((s) => s.clickable)).toBe(true);
  });

  test('auto-save produces draft status', () => {
    const view = buildCampaignWizardView(wizardData);
    expect(view.autoSaveDraftStatus).toBe('draft');
  });
});

describe('workspace layout includes Campanhas tab', () => {
  test('buildWorkspaceLayout returns Campanhas as third tab', async () => {
    // Import the updated layout
    const { buildWorkspaceLayout } = await import(
      '../../apps/web/app/(admin)/workspace/layout'
    );

    const mockFetcher = async () => ({ email: 'admin@example.com' });
    const view = await buildWorkspaceLayout({ fetcher: mockFetcher });

    const tabIds = view.tabs?.map((t) => t.id);
    expect(tabIds).toContain('campanhas');

    const campanhasTab = view.tabs?.find((t) => t.id === 'campanhas');
    expect(campanhasTab?.label).toBe('Campanhas');
  });
});
