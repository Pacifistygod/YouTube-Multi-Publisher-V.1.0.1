export interface MediaPreviewData {
  assetName: string;
  mimeType: string;
  thumbnail?: {
    storagePath: string;
    mimeType: string;
  };
}

export interface MediaPreviewView {
  assetName: string;
  hasThumbnail: boolean;
  thumbnailPath?: string;
  fallbackLabel?: string;
}

export function buildMediaPreviewView(data: MediaPreviewData): MediaPreviewView {
  if (data.thumbnail) {
    return {
      assetName: data.assetName,
      hasThumbnail: true,
      thumbnailPath: data.thumbnail.storagePath,
    };
  }

  return {
    assetName: data.assetName,
    hasThumbnail: false,
    fallbackLabel: 'No thumbnail',
  };
}
