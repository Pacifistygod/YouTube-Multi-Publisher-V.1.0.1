import { SessionGuard } from '../auth/session.guard';
import { MediaController } from './media.controller';
import { MediaService, type MediaServiceOptions } from './media.service';

export interface MediaModuleInstance {
  mediaController: MediaController;
  mediaService: MediaService;
  sessionGuard: SessionGuard;
}

export function createMediaModule(options: MediaServiceOptions = {}): MediaModuleInstance {
  const mediaService = new MediaService(options);
  const sessionGuard = new SessionGuard();
  const mediaController = new MediaController(mediaService, sessionGuard);

  return {
    mediaController,
    mediaService,
    sessionGuard,
  };
}
