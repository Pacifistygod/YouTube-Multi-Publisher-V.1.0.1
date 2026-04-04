import { describe, expect, test } from 'vitest';

import {
  buildMediaPageView,
  type MediaPageData,
} from '../../apps/web/app/(admin)/workspace/media/page';
import {
  buildMediaLibraryTableView,
  type MediaLibraryRow,
} from '../../apps/web/components/media/media-library-table';
import {
  buildMediaPreviewView,
  type MediaPreviewData,
} from '../../apps/web/components/media/media-preview';
import {
  buildMediaUploadFormView,
  type MediaUploadFormData,
} from '../../apps/web/components/media/media-upload-form';

// --- Media Page ---

describe('media page view', () => {
  test('shows empty state with correct copy when no assets exist', () => {
    const view = buildMediaPageView({ assets: [] });

    expect(view.emptyState).toBeDefined();
    expect(view.emptyState!.heading).toBe('No media assets uploaded');
    expect(view.emptyState!.body).toBe(
      'Upload one video (and optional thumbnail) to reuse in future campaigns.',
    );
    expect(view.emptyState!.cta).toBe('Upload video');
  });

  test('hides empty state when assets exist', () => {
    const view = buildMediaPageView({
      assets: [
        {
          id: 'asset-1',
          original_name: 'vid.mp4',
          asset_type: 'video',
          size_bytes: 1024,
          mime_type: 'video/mp4',
          duration_seconds: 120,
          created_at: '2026-04-04T05:00:00Z',
        },
      ],
    });

    expect(view.emptyState).toBeUndefined();
    expect(view.table).toBeDefined();
  });
});

// --- Media Library Table ---

describe('media library table', () => {
  const sampleRow: MediaLibraryRow = {
    id: 'asset-1',
    original_name: 'campaign.mp4',
    asset_type: 'video',
    size_bytes: 5242880,
    mime_type: 'video/mp4',
    duration_seconds: 120,
    created_at: '2026-04-04T05:00:00Z',
    thumbnail: {
      id: 'thumb-1',
      storage_path: 'storage/thumbnails/abc.jpg',
      mime_type: 'image/jpeg',
    },
  };

  test('builds table with expected columns', () => {
    const view = buildMediaLibraryTableView({ rows: [sampleRow] });

    expect(view.columns).toEqual(['Asset', 'Type', 'Size', 'Duration', 'Uploaded At']);
  });

  test('renders rows with metadata', () => {
    const view = buildMediaLibraryTableView({ rows: [sampleRow] });

    expect(view.isEmpty).toBe(false);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0].name).toBe('campaign.mp4');
    expect(view.rows[0].type).toBe('video');
    expect(view.rows[0].hasThumbnail).toBe(true);
  });

  test('marks no thumbnail when absent', () => {
    const noThumbRow: MediaLibraryRow = { ...sampleRow, thumbnail: undefined };
    const view = buildMediaLibraryTableView({ rows: [noThumbRow] });

    expect(view.rows[0].hasThumbnail).toBe(false);
  });

  test('empty table when no rows', () => {
    const view = buildMediaLibraryTableView({ rows: [] });
    expect(view.isEmpty).toBe(true);
    expect(view.rows).toHaveLength(0);
  });
});

// --- Media Preview ---

describe('media preview', () => {
  test('shows thumbnail preview when present', () => {
    const data: MediaPreviewData = {
      assetName: 'campaign.mp4',
      mimeType: 'video/mp4',
      thumbnail: {
        storagePath: 'storage/thumbnails/abc.jpg',
        mimeType: 'image/jpeg',
      },
    };

    const view = buildMediaPreviewView(data);

    expect(view.hasThumbnail).toBe(true);
    expect(view.thumbnailPath).toBe('storage/thumbnails/abc.jpg');
    expect(view.fallbackLabel).toBeUndefined();
  });

  test('shows fallback label when no thumbnail', () => {
    const data: MediaPreviewData = {
      assetName: 'campaign.mp4',
      mimeType: 'video/mp4',
    };

    const view = buildMediaPreviewView(data);

    expect(view.hasThumbnail).toBe(false);
    expect(view.thumbnailPath).toBeUndefined();
    expect(view.fallbackLabel).toBe('No thumbnail');
  });
});

// --- Media Upload Form ---

describe('media upload form', () => {
  test('builds form view with video required and thumbnail optional', () => {
    const view = buildMediaUploadFormView();

    expect(view.fields.video.required).toBe(true);
    expect(view.fields.thumbnail.required).toBe(false);
    expect(view.submitLabel).toBe('Upload video');
  });

  test('provides client-side validation rules matching server rules', () => {
    const view = buildMediaUploadFormView();

    expect(view.fields.video.acceptedMimes).toContain('video/mp4');
    expect(view.fields.video.acceptedMimes).toContain('video/quicktime');
    expect(view.fields.video.maxSizeBytes).toBe(2 * 1024 * 1024 * 1024);
    expect(view.fields.thumbnail.acceptedMimes).toContain('image/jpeg');
    expect(view.fields.thumbnail.acceptedMimes).toContain('image/png');
    expect(view.fields.thumbnail.maxSizeBytes).toBe(5 * 1024 * 1024);
  });

  test('rejects invalid video MIME at client level', () => {
    const view = buildMediaUploadFormView();
    const result = view.validateVideo({
      name: 'file.avi',
      type: 'video/x-msvideo',
      size: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_VIDEO_TYPE');
  });

  test('rejects oversized video at client level', () => {
    const view = buildMediaUploadFormView();
    const result = view.validateVideo({
      name: 'big.mp4',
      type: 'video/mp4',
      size: 2 * 1024 * 1024 * 1024 + 1,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('VIDEO_TOO_LARGE');
  });

  test('accepts valid video at client level', () => {
    const view = buildMediaUploadFormView();
    const result = view.validateVideo({
      name: 'ok.mp4',
      type: 'video/mp4',
      size: 1024,
    });

    expect(result.valid).toBe(true);
  });

  test('rejects invalid thumbnail MIME at client level', () => {
    const view = buildMediaUploadFormView();
    const result = view.validateThumbnail({
      name: 'thumb.gif',
      type: 'image/gif',
      size: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_THUMBNAIL_TYPE');
  });

  test('rejects oversized thumbnail at client level', () => {
    const view = buildMediaUploadFormView();
    const result = view.validateThumbnail({
      name: 'big.jpg',
      type: 'image/jpeg',
      size: 5 * 1024 * 1024 + 1,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('THUMBNAIL_TOO_LARGE');
  });

  test('accepts valid thumbnail at client level', () => {
    const view = buildMediaUploadFormView();
    const result = view.validateThumbnail({
      name: 'ok.png',
      type: 'image/png',
      size: 1024,
    });

    expect(result.valid).toBe(true);
  });
});
