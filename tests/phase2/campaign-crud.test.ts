import { describe, expect, test } from 'vitest';

import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';

function createTestAsset(overrides: Partial<{ id: string; original_name: string }> = {}) {
  return {
    id: overrides.id ?? 'asset-video-1',
    original_name: overrides.original_name ?? 'intro.mp4',
    asset_type: 'video' as const,
  };
}

function createTestChannel(overrides: Partial<{ id: string; title: string; isActive: boolean }> = {}) {
  return {
    id: overrides.id ?? 'channel-1',
    title: overrides.title ?? 'My Channel',
    isActive: overrides.isActive ?? true,
  };
}

describe('campaign CRUD', () => {
  test('creates a draft campaign linked to a video asset', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const result = await service.createCampaign({
      title: 'Launch video',
      videoAssetId: 'asset-video-1',
    });

    expect(result.campaign).toMatchObject({
      title: 'Launch video',
      videoAssetId: 'asset-video-1',
      status: 'draft',
    });
    expect(result.campaign.id).toBeTruthy();
    expect(result.campaign.targets).toEqual([]);
  });

  test('adds a target with per-channel metadata to a campaign', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const { campaign } = await service.createCampaign({
      title: 'Launch video',
      videoAssetId: 'asset-video-1',
    });

    const result = await service.addTarget(campaign.id, {
      channelId: 'channel-1',
      videoTitle: 'My First Video',
      videoDescription: 'A great video about coding',
      tags: ['coding', 'tutorial'],
      privacy: 'public',
    });

    expect(result.target).toMatchObject({
      campaignId: campaign.id,
      channelId: 'channel-1',
      videoTitle: 'My First Video',
      videoDescription: 'A great video about coding',
      tags: ['coding', 'tutorial'],
      privacy: 'public',
      status: 'aguardando',
    });
  });

  test('lists campaigns newest-first', async () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({
      repository,
      now: () => {
        now.setMinutes(now.getMinutes() + 1);
        return new Date(now);
      },
    });

    await service.createCampaign({ title: 'First', videoAssetId: 'asset-1' });
    await service.createCampaign({ title: 'Second', videoAssetId: 'asset-2' });

    const { campaigns } = await service.listCampaigns();
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0].title).toBe('Second');
    expect(campaigns[1].title).toBe('First');
  });

  test('gets a campaign by id with targets', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const { campaign } = await service.createCampaign({
      title: 'My Campaign',
      videoAssetId: 'asset-video-1',
    });

    await service.addTarget(campaign.id, {
      channelId: 'channel-1',
      videoTitle: 'Title 1',
      videoDescription: 'Desc 1',
    });

    const result = await service.getCampaign(campaign.id);
    expect(result).toBeTruthy();
    expect(result!.campaign.title).toBe('My Campaign');
    expect(result!.campaign.targets).toHaveLength(1);
  });

  test('returns null for non-existent campaign', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const result = await service.getCampaign('non-existent');
    expect(result).toBeNull();
  });

  test('removes a target from a campaign', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const { campaign } = await service.createCampaign({
      title: 'My Campaign',
      videoAssetId: 'asset-video-1',
    });

    const { target } = await service.addTarget(campaign.id, {
      channelId: 'channel-1',
      videoTitle: 'Title',
      videoDescription: 'Desc',
    });

    const removed = await service.removeTarget(campaign.id, target.id);
    expect(removed).toBe(true);

    const fetched = await service.getCampaign(campaign.id);
    expect(fetched!.campaign.targets).toHaveLength(0);
  });

  test('updates campaign status to ready when it has at least one target', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const { campaign } = await service.createCampaign({
      title: 'My Campaign',
      videoAssetId: 'asset-video-1',
    });

    await service.addTarget(campaign.id, {
      channelId: 'channel-1',
      videoTitle: 'Title',
      videoDescription: 'Desc',
    });

    const result = await service.markReady(campaign.id);
    expect(result!.campaign.status).toBe('ready');
  });

  test('rejects marking ready when campaign has no targets', async () => {
    const repository = new InMemoryCampaignRepository();
    const service = new CampaignService({ repository });

    const { campaign } = await service.createCampaign({
      title: 'Empty Campaign',
      videoAssetId: 'asset-1',
    });

    const result = await service.markReady(campaign.id);
    expect(result).toMatchObject({
      error: 'NO_TARGETS',
    });
  });
});
