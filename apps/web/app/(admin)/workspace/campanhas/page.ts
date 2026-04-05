import { buildCampaignListView, type CampaignListRow, type CampaignListView } from '../../../../components/campaigns/campaign-list';

export interface CampaignsPageData {
  campaigns: CampaignListRow[];
}

export interface CampaignsPageView {
  list: CampaignListView;
  emptyState?: {
    heading: string;
    body: string;
    cta: string;
  };
}

export function buildCampaignsPageView(data: CampaignsPageData): CampaignsPageView {
  const list = buildCampaignListView({ rows: data.campaigns });

  const view: CampaignsPageView = { list };

  if (list.isEmpty) {
    view.emptyState = {
      heading: 'No campaigns yet',
      body: 'Create a campaign to publish a video to multiple YouTube channels at once.',
      cta: 'Create campaign',
    };
  }

  return view;
}
