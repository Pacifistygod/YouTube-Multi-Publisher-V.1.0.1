import { describe, expect, test, vi } from 'vitest';

import {
  createIntegratedWorker,
  type IntegratedWorkerOptions,
  type IntegratedWorkerInstance,
} from '../../apps/api/src/campaigns/integrated-worker';
import { CampaignService, InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';
import { PublishJobService } from '../../apps/api/src/campaigns/publish-job.service';
import { LaunchService } from '../../apps/api/src/campaigns/launch.service';
import type { YouTubeUploadFn, UploadContext } from '../../apps/api/src/campaigns/youtube-upload.worker';
import type { ChannelTokenResolver, VideoFileResolver } from '../../apps/api/src/integrations/youtube/youtube-upload.service';

function buildTestDeps() {
  const campaignService = new CampaignService();
  const jobService = new PublishJobService();
  const launchService = new LaunchService({ campaignService, jobService });

  const uploadFn: YouTubeUploadFn = vi.fn().mockResolvedValue({ videoId: 'yt-video-001' });

  const channelTokenResolver: ChannelTokenResolver = {
    resolve: vi.fn().mockResolvedValue({ accessToken: 'access-token-abc' }),
  };

  const videoFileResolver: VideoFileResolver = {
    resolve: vi.fn().mockResolvedValue('/videos/my-video.mp4'),
  };

  return { campaignService, jobService, launchService, uploadFn, channelTokenResolver, videoFileResolver };
}

async function createCampaignWithTarget(campaignService: CampaignService) {
  const { campaign } = await campaignService.createCampaign({
    title: 'Test Campaign',
    videoAssetId: 'asset-001',
  });

  const { target } = await campaignService.addTarget(campaign.id, {
    channelId: 'channel-001',
    videoTitle: 'My Video',
    videoDescription: 'Description here',
    tags: ['tag1', 'tag2'],
    privacy: 'public',
  });

  await campaignService.markReady(campaign.id);

  return { campaign: (await campaignService.getCampaign(campaign.id))!.campaign, target };
}

describe('Integrated worker — createIntegratedWorker', () => {
  test('returns worker and runner instances', async () => {
    const deps = buildTestDeps();
    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    expect(instance.worker).toBeDefined();
    expect(instance.runner).toBeDefined();
    expect(instance.uploadService).toBeDefined();
  });

  test('processes a job using upload service token and file resolution', async () => {
    const deps = buildTestDeps();
    const { campaign, target } = await createCampaignWithTarget(deps.campaignService);

    // Launch the campaign to enqueue jobs
    await deps.launchService.launchCampaign(campaign.id);

    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    const result = await instance.worker.processNext();

    expect(result).not.toBeNull();
    expect(result!.status).toBe('completed');
    expect(deps.channelTokenResolver.resolve).toHaveBeenCalledWith('channel-001');
    expect(deps.videoFileResolver.resolve).toHaveBeenCalledWith('asset-001');
    expect(deps.uploadFn).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'access-token-abc',
        filePath: '/videos/my-video.mp4',
        title: 'My Video',
      }),
    );
  });

  test('runner.processAll drains queue using integrated upload service', async () => {
    const deps = buildTestDeps();
    const { campaign } = await deps.campaignService.createCampaign({
      title: 'Multi Target Campaign',
      videoAssetId: 'asset-001',
    });

    await deps.campaignService.addTarget(campaign.id, {
      channelId: 'channel-001',
      videoTitle: 'First Video',
      videoDescription: 'First description',
      tags: ['tag1'],
      privacy: 'public',
    });

    await deps.campaignService.addTarget(campaign.id, {
      channelId: 'channel-002',
      videoTitle: 'Second Video',
      videoDescription: 'Second description',
      tags: ['tag3'],
      privacy: 'unlisted',
    });

    await deps.campaignService.markReady(campaign.id);
    await deps.launchService.launchCampaign(campaign.id);

    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    const results = await instance.runner.processAll();

    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'completed')).toBe(true);
    expect(deps.uploadFn).toHaveBeenCalledTimes(2);
  });

  test('handles upload failure through integrated service', async () => {
    const deps = buildTestDeps();
    const { campaign } = await createCampaignWithTarget(deps.campaignService);

    await deps.launchService.launchCampaign(campaign.id);

    (deps.uploadFn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('YouTube API quota exceeded'));

    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    const result = await instance.worker.processNext();

    expect(result).not.toBeNull();
    expect(result!.status).toBe('failed');
    expect(result!.errorMessage).toBe('YouTube API quota exceeded');
  });

  test('handles token resolution failure', async () => {
    const deps = buildTestDeps();
    const { campaign } = await createCampaignWithTarget(deps.campaignService);

    await deps.launchService.launchCampaign(campaign.id);

    (deps.channelTokenResolver.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Token expired and refresh failed'),
    );

    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    const result = await instance.worker.processNext();

    expect(result).not.toBeNull();
    expect(result!.status).toBe('failed');
    expect(result!.errorMessage).toBe('Token expired and refresh failed');
  });

  test('handles file resolution failure', async () => {
    const deps = buildTestDeps();
    const { campaign } = await createCampaignWithTarget(deps.campaignService);

    await deps.launchService.launchCampaign(campaign.id);

    (deps.videoFileResolver.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Video file not found'),
    );

    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    const result = await instance.worker.processNext();

    expect(result).not.toBeNull();
    expect(result!.status).toBe('failed');
    expect(result!.errorMessage).toBe('Video file not found');
  });

  test('updates campaign target status after successful upload', async () => {
    const deps = buildTestDeps();
    const { campaign, target } = await createCampaignWithTarget(deps.campaignService);

    await deps.launchService.launchCampaign(campaign.id);

    const instance = createIntegratedWorker({
      campaignService: deps.campaignService,
      jobService: deps.jobService,
      uploadFn: deps.uploadFn,
      channelTokenResolver: deps.channelTokenResolver,
      videoFileResolver: deps.videoFileResolver,
    });

    await instance.runner.processAll();

    const updated = await deps.campaignService.getCampaign(campaign.id);
    const updatedTarget = updated!.campaign.targets.find(t => t.id === target.id);
    expect(updatedTarget!.status).toBe('publicado');
  });
});
