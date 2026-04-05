import { SessionGuard } from '../auth/session.guard';
import { CampaignService, type CampaignServiceOptions } from './campaign.service';
import { CampaignStatusService } from './campaign-status.service';
import { CampaignsController } from './campaigns.controller';
import { DashboardService } from './dashboard.service';
import { LaunchService } from './launch.service';
import { PublishJobService, type PublishJobServiceOptions } from './publish-job.service';

export interface CampaignsModuleInstance {
  campaignService: CampaignService;
  campaignsController: CampaignsController;
  sessionGuard: SessionGuard;
  jobService: PublishJobService;
  launchService: LaunchService;
  statusService: CampaignStatusService;
  dashboardService: DashboardService;
}

export interface CampaignsModuleOptions extends CampaignServiceOptions {
  jobServiceOptions?: PublishJobServiceOptions;
}

export function createCampaignsModule(options: CampaignsModuleOptions = {}): CampaignsModuleInstance {
  const campaignService = new CampaignService(options);
  const sessionGuard = new SessionGuard();
  const jobService = new PublishJobService(options.jobServiceOptions);
  const launchService = new LaunchService({ campaignService, jobService });
  const statusService = new CampaignStatusService({ campaignService, jobService });
  const dashboardService = new DashboardService({ campaignService, jobService });
  const campaignsController = new CampaignsController(campaignService, sessionGuard, launchService, statusService, jobService, dashboardService);

  return {
    campaignService,
    campaignsController,
    sessionGuard,
    jobService,
    launchService,
    statusService,
    dashboardService,
  };
}
