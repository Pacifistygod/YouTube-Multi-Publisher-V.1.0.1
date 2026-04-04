export interface MediaLibraryRow {
  id: string;
  original_name: string;
  asset_type: 'video' | 'thumbnail';
  size_bytes: number;
  mime_type: string;
  duration_seconds: number;
  created_at: string;
  thumbnail?: {
    id: string;
    storage_path: string;
    mime_type: string;
  };
}

export interface MediaLibraryTableRowView {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  durationSeconds: number;
  createdAt: string;
  hasThumbnail: boolean;
  thumbnailPath?: string;
}

export interface MediaLibraryTableView {
  columns: string[];
  rows: MediaLibraryTableRowView[];
  isEmpty: boolean;
}

export function buildMediaLibraryTableView(data: { rows: MediaLibraryRow[] }): MediaLibraryTableView {
  const rows: MediaLibraryTableRowView[] = data.rows.map((row) => ({
    id: row.id,
    name: row.original_name,
    type: row.asset_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    hasThumbnail: row.thumbnail !== undefined,
    thumbnailPath: row.thumbnail?.storage_path,
  }));

  return {
    columns: ['Asset', 'Type', 'Size', 'Duration', 'Uploaded At'],
    rows,
    isEmpty: rows.length === 0,
  };
}
