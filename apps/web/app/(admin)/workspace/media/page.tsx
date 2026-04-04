import { buildMediaLibraryTableView, type MediaLibraryRow, type MediaLibraryTableView } from '../../../../components/media/media-library-table';

export interface MediaPageAsset {
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

export interface MediaPageData {
  assets: MediaPageAsset[];
}

export interface MediaPageView {
  table: MediaLibraryTableView;
  emptyState?: {
    heading: string;
    body: string;
    cta: string;
  };
}

export function buildMediaPageView(data: MediaPageData): MediaPageView {
  const rows: MediaLibraryRow[] = data.assets.map((asset) => ({
    id: asset.id,
    original_name: asset.original_name,
    asset_type: asset.asset_type,
    size_bytes: asset.size_bytes,
    mime_type: asset.mime_type,
    duration_seconds: asset.duration_seconds,
    created_at: asset.created_at,
    thumbnail: asset.thumbnail,
  }));

  const table = buildMediaLibraryTableView({ rows });

  const view: MediaPageView = { table };

  if (table.isEmpty) {
    view.emptyState = {
      heading: 'No media assets uploaded',
      body: 'Upload one video (and optional thumbnail) to reuse in future campaigns.',
      cta: 'Upload video',
    };
  }

  return view;
}
