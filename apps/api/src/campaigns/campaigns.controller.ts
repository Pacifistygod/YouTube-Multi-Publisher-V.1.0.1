import type { SessionRequestLike } from '../auth/session.guard';
import { SessionGuard } from '../auth/session.guard';
import type { CampaignRecord, CampaignTargetRecord } from './campaign.service';
import { CampaignService } from './campaign.service';

export interface CampaignsRequest extends SessionRequestLike {
  body?: unknown;
  params?: Record<string, string>;
}

interface ControllerResponse<T = unknown> {
  status: number;
  body: T;
}

export class CampaignsController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly sessionGuard: SessionGuard,
  ) {}

  async create(request: CampaignsRequest): Promise<ControllerResponse<{ campaign?: CampaignRecord; error?: string }>> {
    const guardResult = this.sessionGuard.check(request);
    if (!guardResult.allowed) {
      return { status: guardResult.status, body: { error: guardResult.reason } };
    }

    const body = request.body as { title?: string; videoAssetId?: string } | undefined;
    if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
      return { status: 400, body: { error: 'Missing required field: title' } };
    }
    if (!body?.videoAssetId || typeof body.videoAssetId !== 'string') {
      return { status: 400, body: { error: 'Missing required field: videoAssetId' } };
    }

    const result = this.campaignService.createCampaign({
      title: body.title.trim(),
      videoAssetId: body.videoAssetId,
    });

    return { status: 201, body: result };
  }

  async list(request: SessionRequestLike): Promise<ControllerResponse<{ campaigns: CampaignRecord[]; error?: string }>> {
    const guardResult = this.sessionGuard.check(request);
    if (!guardResult.allowed) {
      return { status: guardResult.status, body: { campaigns: [], error: guardResult.reason } };
    }

    const result = this.campaignService.listCampaigns();
    return { status: 200, body: result };
  }

  async getById(request: CampaignsRequest): Promise<ControllerResponse<{ campaign?: CampaignRecord; error?: string }>> {
    const guardResult = this.sessionGuard.check(request);
    if (!guardResult.allowed) {
      return { status: guardResult.status, body: { error: guardResult.reason } };
    }

    const id = request.params?.id;
    if (!id) {
      return { status: 400, body: { error: 'Missing campaign id' } };
    }

    const result = this.campaignService.getCampaign(id);
    if (!result) {
      return { status: 404, body: { error: 'Campaign not found' } };
    }

    return { status: 200, body: result };
  }

  async addTarget(request: CampaignsRequest): Promise<ControllerResponse<{ target?: CampaignTargetRecord; error?: string }>> {
    const guardResult = this.sessionGuard.check(request);
    if (!guardResult.allowed) {
      return { status: guardResult.status, body: { error: guardResult.reason } };
    }

    const campaignId = request.params?.id;
    if (!campaignId) {
      return { status: 400, body: { error: 'Missing campaign id' } };
    }

    const body = request.body as {
      channelId?: string;
      videoTitle?: string;
      videoDescription?: string;
      tags?: string[];
      privacy?: string;
      thumbnailAssetId?: string;
    } | undefined;

    if (!body?.channelId || !body?.videoTitle || !body?.videoDescription) {
      return { status: 400, body: { error: 'Missing required fields: channelId, videoTitle, videoDescription' } };
    }

    try {
      const result = this.campaignService.addTarget(campaignId, {
        channelId: body.channelId,
        videoTitle: body.videoTitle,
        videoDescription: body.videoDescription,
        tags: body.tags,
        privacy: body.privacy,
        thumbnailAssetId: body.thumbnailAssetId,
      });

      return { status: 201, body: result };
    } catch {
      return { status: 404, body: { error: 'Campaign not found' } };
    }
  }

  async launch(request: CampaignsRequest): Promise<ControllerResponse<{ campaign?: CampaignRecord; error?: string }>> {
    const guardResult = this.sessionGuard.check(request);
    if (!guardResult.allowed) {
      return { status: guardResult.status, body: { error: guardResult.reason } };
    }

    const campaignId = request.params?.id;
    if (!campaignId) {
      return { status: 400, body: { error: 'Missing campaign id' } };
    }

    const result = this.campaignService.launch(campaignId);
    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return { status: 404, body: { error: 'Campaign not found' } };
      }
      return { status: 400, body: { error: `Cannot launch: campaign is not ready (${result.error})` } };
    }

    return { status: 200, body: result };
  }
}
