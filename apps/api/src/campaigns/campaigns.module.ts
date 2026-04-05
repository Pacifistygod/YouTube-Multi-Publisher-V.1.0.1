import { SessionGuard } from '../auth/session.guard';
import { CampaignService, type CampaignServiceOptions } from './campaign.service';
import { CampaignsController } from './campaigns.controller';

export interface CampaignsModuleInstance {
  campaignService: CampaignService;
  campaignsController: CampaignsController;
  sessionGuard: SessionGuard;
}

export function createCampaignsModule(options: CampaignServiceOptions = {}): CampaignsModuleInstance {
  const campaignService = new CampaignService(options);
  const sessionGuard = new SessionGuard();
  const campaignsController = new CampaignsController(campaignService, sessionGuard);

  return {
    campaignService,
    campaignsController,
    sessionGuard,
  };
}
