import { describe, it, expect, beforeEach } from 'vitest';
import {
  MediaAssetService,
  InMemoryMediaAssetRepository,
  type MediaAssetRepository,
  type CreateMediaAssetDto,
  type MediaAsset,
} from '../../apps/api/src/media/media-asset.service';

function validVideoDto(overrides: Partial<CreateMediaAssetDto> = {}): CreateMediaAssetDto {
  return {
    assetType: 'video',
    originalName: 'my-video.mp4',
    storagePath: '/uploads/my-video.mp4',
    sizeBytes: 104857600,
    mimeType: 'video/mp4',
    durationSeconds: 300,
    ...overrides,
  };
}

function validThumbnailDto(overrides: Partial<CreateMediaAssetDto> = {}): CreateMediaAssetDto {
  return {
    assetType: 'thumbnail',
    originalName: 'thumb.jpg',
    storagePath: '/uploads/thumb.jpg',
    sizeBytes: 51200,
    mimeType: 'image/jpeg',
    ...overrides,
  };
}

describe('MediaAssetService', () => {
  let repo: MediaAssetRepository;
  let service: MediaAssetService;

  beforeEach(() => {
    repo = new InMemoryMediaAssetRepository();
    service = new MediaAssetService(repo);
  });

  describe('create', () => {
    it('creates a video asset', async () => {
      const result = await service.create(validVideoDto());

      expect(result.asset.id).toBeDefined();
      expect(result.asset.assetType).toBe('video');
      expect(result.asset.originalName).toBe('my-video.mp4');
      expect(result.asset.storagePath).toBe('/uploads/my-video.mp4');
      expect(result.asset.sizeBytes).toBe(104857600);
      expect(result.asset.mimeType).toBe('video/mp4');
      expect(result.asset.durationSeconds).toBe(300);
    });

    it('creates a thumbnail asset', async () => {
      const result = await service.create(validThumbnailDto());

      expect(result.asset.assetType).toBe('thumbnail');
      expect(result.asset.mimeType).toBe('image/jpeg');
      expect(result.asset.durationSeconds).toBe(0);
    });

    it('defaults durationSeconds to 0 when not provided', async () => {
      const dto = validVideoDto();
      delete (dto as any).durationSeconds;
      const result = await service.create(dto);

      expect(result.asset.durationSeconds).toBe(0);
    });

    it('rejects invalid asset type', async () => {
      const dto = validVideoDto({ assetType: 'audio' as any });

      await expect(service.create(dto)).rejects.toThrow('Invalid asset type');
    });

    it('rejects empty original name', async () => {
      const dto = validVideoDto({ originalName: '' });

      await expect(service.create(dto)).rejects.toThrow('originalName');
    });

    it('rejects empty storage path', async () => {
      const dto = validVideoDto({ storagePath: '' });

      await expect(service.create(dto)).rejects.toThrow('storagePath');
    });

    it('rejects non-positive size', async () => {
      const dto = validVideoDto({ sizeBytes: 0 });

      await expect(service.create(dto)).rejects.toThrow('sizeBytes');
    });
  });

  describe('getById', () => {
    it('returns asset by id', async () => {
      const { asset } = await service.create(validVideoDto());
      const found = await service.getById(asset.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(asset.id);
    });

    it('returns null for nonexistent id', async () => {
      const found = await service.getById('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all assets', async () => {
      await service.create(validVideoDto());
      await service.create(validThumbnailDto());

      const assets = await service.list();

      expect(assets).toHaveLength(2);
    });

    it('returns empty array when none exist', async () => {
      const assets = await service.list();

      expect(assets).toEqual([]);
    });
  });

  describe('listByType', () => {
    it('filters by video type', async () => {
      await service.create(validVideoDto());
      await service.create(validThumbnailDto());

      const videos = await service.listByType('video');

      expect(videos).toHaveLength(1);
      expect(videos[0].assetType).toBe('video');
    });

    it('filters by thumbnail type', async () => {
      await service.create(validVideoDto());
      await service.create(validThumbnailDto());

      const thumbs = await service.listByType('thumbnail');

      expect(thumbs).toHaveLength(1);
      expect(thumbs[0].assetType).toBe('thumbnail');
    });
  });

  describe('delete', () => {
    it('deletes an asset', async () => {
      const { asset } = await service.create(validVideoDto());
      const deleted = await service.delete(asset.id);

      expect(deleted).toBe(true);
      expect(await service.getById(asset.id)).toBeNull();
    });

    it('returns false for nonexistent id', async () => {
      const deleted = await service.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('linkThumbnail', () => {
    it('links a thumbnail to a video asset', async () => {
      const { asset: video } = await service.create(validVideoDto());
      const { asset: thumb } = await service.create(validThumbnailDto());

      const result = await service.linkThumbnail(thumb.id, video.id);

      expect(result).toBe(true);
      const updated = await service.getById(thumb.id);
      expect(updated!.linkedVideoAssetId).toBe(video.id);
    });

    it('returns false when thumbnail does not exist', async () => {
      const { asset: video } = await service.create(validVideoDto());

      const result = await service.linkThumbnail('nonexistent', video.id);

      expect(result).toBe(false);
    });

    it('returns false when video does not exist', async () => {
      const { asset: thumb } = await service.create(validThumbnailDto());

      const result = await service.linkThumbnail(thumb.id, 'nonexistent');

      expect(result).toBe(false);
    });
  });
});

describe('InMemoryMediaAssetRepository', () => {
  it('generates unique IDs', async () => {
    const repo = new InMemoryMediaAssetRepository();
    const a1 = await repo.create(validVideoDto());
    const a2 = await repo.create(validVideoDto());

    expect(a1.id).not.toBe(a2.id);
  });

  it('sets createdAt on creation', async () => {
    const repo = new InMemoryMediaAssetRepository();
    const asset = await repo.create(validVideoDto());

    expect(asset.createdAt).toBeInstanceOf(Date);
  });
});
