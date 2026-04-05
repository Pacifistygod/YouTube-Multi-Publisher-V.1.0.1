import type { AdminSession } from './auth/session.guard';
import type { CampaignsModuleInstance } from './campaigns/campaigns.module';
import type { CampaignsRequest } from './campaigns/campaigns.controller';

export interface ApiRequest {
  method: string;
  path: string;
  session: AdminSession | null;
  body?: unknown;
}

export interface ApiResponse {
  status: number;
  body: any;
}

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: (request: CampaignsRequest) => Promise<{ status: number; body: any }>;
}

export interface ApiRouter {
  handle(request: ApiRequest): Promise<ApiResponse>;
}

export function createApiRouter(options: {
  campaignsModule: CampaignsModuleInstance;
}): ApiRouter {
  const { campaignsModule } = options;
  const ctrl = campaignsModule.campaignsController;

  const routes: Route[] = [
    {
      method: 'GET',
      pattern: /^\/api\/dashboard$/,
      paramNames: [],
      handler: (req) => ctrl.getDashboard(req),
    },
    {
      method: 'POST',
      pattern: /^\/api\/campaigns\/([^/]+)\/targets\/([^/]+)\/retry$/,
      paramNames: ['id', 'targetId'],
      handler: (req) => ctrl.retryTarget(req),
    },
    {
      method: 'POST',
      pattern: /^\/api\/campaigns\/([^/]+)\/launch$/,
      paramNames: ['id'],
      handler: (req) => ctrl.launch(req),
    },
    {
      method: 'GET',
      pattern: /^\/api\/campaigns\/([^/]+)\/status$/,
      paramNames: ['id'],
      handler: (req) => ctrl.getStatus(req),
    },
    {
      method: 'GET',
      pattern: /^\/api\/campaigns\/([^/]+)$/,
      paramNames: ['id'],
      handler: (req) => ctrl.getById(req),
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/campaigns\/([^/]+)$/,
      paramNames: ['id'],
      handler: (req) => ctrl.deleteCampaign(req),
    },
    {
      method: 'POST',
      pattern: /^\/api\/campaigns$/,
      paramNames: [],
      handler: (req) => ctrl.create(req),
    },
    {
      method: 'GET',
      pattern: /^\/api\/campaigns$/,
      paramNames: [],
      handler: (req) => ctrl.list(req),
    },
  ];

  return {
    async handle(request: ApiRequest): Promise<ApiResponse> {
      for (const route of routes) {
        if (request.method !== route.method) continue;

        const match = route.pattern.exec(request.path);
        if (!match) continue;

        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });

        const controllerRequest: CampaignsRequest = {
          session: request.session,
          body: request.body,
          params,
        };

        const result = await route.handler(controllerRequest);
        return { status: result.status, body: result.body };
      }

      return { status: 404, body: { error: 'Not found' } };
    },
  };
}
