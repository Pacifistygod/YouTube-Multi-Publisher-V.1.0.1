export interface CampaignListRow {
  id: string;
  title: string;
  videoAssetName: string;
  targetCount: number;
  status: string;
  createdAt: string;
}

export interface CampaignListView {
  columns: string[];
  rows: CampaignListRow[];
  isEmpty: boolean;
}

export function buildCampaignListView(data: { rows: CampaignListRow[] }): CampaignListView {
  return {
    columns: ['Title', 'Video', 'Targets', 'Status', 'Created'],
    rows: data.rows,
    isEmpty: data.rows.length === 0,
  };
}
