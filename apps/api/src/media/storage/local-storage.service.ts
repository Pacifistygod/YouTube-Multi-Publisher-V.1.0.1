import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';

export type StorageKind = 'video' | 'thumbnail';

export interface UploadedMediaFile {
  originalname: string;
  mimetype?: string;
  buffer: Buffer;
  size?: number;
  durationSeconds?: number;
}

export interface StoredMediaFile {
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
}

export interface LocalStorageServiceOptions {
  rootDir?: string;
}

export class LocalStorageService {
  private readonly rootDir: string;

  constructor(options: LocalStorageServiceOptions = {}) {
    this.rootDir = options.rootDir ?? process.cwd();
  }

  async save(kind: StorageKind, file: UploadedMediaFile): Promise<StoredMediaFile> {
    const folder = kind === 'video' ? 'videos' : 'thumbnails';
    const extension = normalizeExtension(file.originalname);
    const fileName = `${randomUUID()}${extension}`;
    const relativePath = `storage/${folder}/${fileName}`;
    const targetDirectory = join(this.rootDir, 'storage', folder);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(join(targetDirectory, fileName), file.buffer);

    return {
      original_name: file.originalname,
      storage_path: relativePath,
      mime_type: file.mimetype ?? 'application/octet-stream',
      size_bytes: file.size ?? file.buffer.byteLength,
    };
  }
}

function normalizeExtension(fileName: string): string {
  const extension = extname(fileName).trim().toLowerCase();

  if (!extension || extension === '.') {
    return '';
  }

  return extension;
}
