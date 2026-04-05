export interface ChannelLeaderboardRow {
  channelId: string;
  totalTargets: number;
  published: number;
  failed: number;
  successRate: number;
}

export interface SummaryCard {
  label: string;
  value: number | string;
}

export interface CampaignStatusBreakdown {
  status: string;
  count: number;
}

export interface DashboardData {
  campaigns: {
    total: number;
    byStatus: Record<string, number>;
  };
  targets: {
    total: number;
    byStatus: Record<string, number>;
    successRate: number;
  };
  jobs: {
    total: number;
    byStatus: Record<string, number>;
    totalRetries: number;
  };
  channels: {
    channelId: string;
    totalTargets: number;
    published: number;
    failed: number;
    successRate: number;
  }[];
}

export interface DashboardView {
  summaryCards: SummaryCard[];
  campaignBreakdown: CampaignStatusBreakdown[];
  channelLeaderboard: ChannelLeaderboardRow[];
  isEmpty: boolean;
}

const CAMPAIGN_STATUSES = ['draft', 'ready', 'launching', 'completed', 'failed'] as const;

export function buildDashboardView(data: DashboardData): DashboardView {
  const summaryCards: SummaryCard[] = [
    { label: 'Total Campaigns', value: data.campaigns.total },
    { label: 'Published Videos', value: data.targets.byStatus.publicado ?? 0 },
    { label: 'Success Rate', value: `${data.targets.successRate}%` },
    { label: 'Failed Uploads', value: data.targets.byStatus.erro ?? 0 },
  ];

  const campaignBreakdown: CampaignStatusBreakdown[] = CAMPAIGN_STATUSES.map((status) => ({
    status,
    count: data.campaigns.byStatus[status] ?? 0,
  }));

  const channelLeaderboard: ChannelLeaderboardRow[] = [...data.channels]
    .sort((a, b) => b.published - a.published)
    .map((ch) => ({
      channelId: ch.channelId,
      totalTargets: ch.totalTargets,
      published: ch.published,
      failed: ch.failed,
      successRate: ch.successRate,
    }));

  return {
    summaryCards,
    campaignBreakdown,
    channelLeaderboard,
    isEmpty: data.campaigns.total === 0,
  };
}
