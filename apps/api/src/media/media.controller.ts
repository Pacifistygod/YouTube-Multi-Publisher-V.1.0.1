import type { SessionRequestLike } from '../auth/session.guard';
import { SessionGuard } from '../auth/session.guard';
import { MediaService } from './media.service';
import type { UploadedMediaFile } from './storage/local-storage.service';

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_THUMBNAIL_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface MediaRequest extends SessionRequestLike {
  files?: {
    video?: UploadedMediaFile[];
    thumbnail?: UploadedMediaFile[];
  };
}

export class MediaController {
  private readonly sessionGuard: SessionGuard;

  constructor(
    private readonly mediaService: MediaService,
    sessionGuard?: SessionGuard,
  ) {
    this.sessionGuard = sessionGuard ?? new SessionGuard();
  }

  async createAsset(request: MediaRequest): Promise<{ status: number; body: unknown }> {
    const guardResult = this.sessionGuard.check(request);

    if (!guardResult.allowed) {
      return {
        status: guardResult.status,
        body: {
          error: guardResult.reason,
        },
      };
    }

    const videoFiles = request.files?.video ?? [];
    const thumbnailFiles = request.files?.thumbnail ?? [];

    if (videoFiles.length !== 1 || thumbnailFiles.length > 1) {
      return {
        status: 400,
        body: {
          error: 'Expected one video file and at most one thumbnail file.',
        },
      };
    }

    const videoSize = videoFiles[0].size ?? videoFiles[0].buffer.byteLength;
    if (videoSize > MAX_VIDEO_SIZE_BYTES) {
      return {
        status: 400,
        body: {
          error: `Video file exceeds maximum allowed size of ${MAX_VIDEO_SIZE_BYTES} bytes.`,
        },
      };
    }

    if (thumbnailFiles.length === 1) {
      const thumbSize = thumbnailFiles[0].size ?? thumbnailFiles[0].buffer.byteLength;
      if (thumbSize > MAX_THUMBNAIL_SIZE_BYTES) {
        return {
          status: 400,
          body: {
            error: `Thumbnail file exceeds maximum allowed size of ${MAX_THUMBNAIL_SIZE_BYTES} bytes.`,
          },
        };
      }
    }

    const asset = await this.mediaService.createAsset({
      video: videoFiles[0],
      thumbnail: thumbnailFiles[0],
    });

    return {
      status: 201,
      body: asset,
    };
  }

  listAssets(request: SessionRequestLike): { status: number; body: unknown } {
    const guardResult = this.sessionGuard.check(request);

    if (!guardResult.allowed) {
      return {
        status: guardResult.status,
        body: {
          error: guardResult.reason,
        },
      };
    }

    return {
      status: 200,
      body: this.mediaService.listAssets(),
    };
  }
}
