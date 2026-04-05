<!-- GSD:project-start source:PROJECT.md -->
## Project

**YouTube Multi Publisher**

YouTube Multi Publisher is an internal admin panel for sending the same video to multiple connected YouTube accounts/channels from one centralized workflow. It focuses on secure account connection, one-time media upload, per-channel metadata customization, scheduling, and clear status tracking for each publication target.

**Core Value:** Publish one video to multiple YouTube channels safely, with control, visibility, and far less manual repetition.

### Constraints

- **Platform compliance**: Use official Google OAuth 2.0 and YouTube Data API v3 only — required for reliability, policy compliance, and maintainability
- **Security**: Store access and refresh tokens securely and implement token refresh — required because each account authorizes the app independently
- **MVP scope**: Start as an internal admin panel, not full SaaS — reduces complexity and validates the core workflow faster
- **Scheduling**: Scheduled publication is required in v1 — it is part of the intended operating model, not a later enhancement
- **Storage**: Use local server storage for video and thumbnails in the MVP — simplifies validation before introducing S3/R2 complexity
- **Quota awareness**: Track API quota consumption and channel-level failures — needed to avoid operational surprises and support retries
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
| Layer | Recommended tech | Why this is the best pragmatic fit |
|---|---|---|
| Frontend | `Next.js 16` (App Router), `React 19`, `TypeScript` | Best current DX for a fast internal admin panel; App Router is the current default in official docs. |
| UI kit | `Tailwind CSS 4` + `shadcn/ui` + `Radix UI` | Fast to ship polished admin screens, tables, dialogs, and form flows without heavy design overhead. |
| Frontend data/forms | `@tanstack/react-query`, `react-hook-form`, `zod` | Clean API-state handling, optimistic dashboard updates, and strong validation for per-channel metadata forms. |
| Backend API | `NestJS` + `@nestjs/config` + `@nestjs/swagger` + `class-validator`/`class-transformer` | Strong modular structure for accounts, media, publishing, retries, and audit logs; OpenAPI is useful for internal ops tooling. |
| ORM / DB access | `Prisma ORM` + `PostgreSQL 16+` | Best MVP speed with type-safe schema, migrations, and a strong relational fit for channels, tokens, jobs, assets, and publish history. |
| Queue / scheduling | `Redis 7+` + `BullMQ` + `@nestjs/bullmq` + `ioredis` | Essential for delayed jobs, retries, concurrency control, and per-channel failure tracking. |
| Media ingestion | `multer` disk storage on the Nest side | Simple and reliable for MVP. Save video once locally, then reuse the file path for separate upload jobs per channel. |
| Logging / ops | `nestjs-pino` (`pino`) | Structured logs matter for quota debugging, failed uploads, and token-refresh issues. |
| Google / YouTube integration | `googleapis` official Node client | Officially supported by Google, typed, and works well with OAuth 2.0 + media uploads from Node streams. |
## Integration Notes: Google OAuth 2.0 + `googleapis`
### Recommended approach
### Scopes
- Begin with `https://www.googleapis.com/auth/youtube.upload` for upload-only flows.
- Add broader YouTube scopes only if playlist management, thumbnail updates, or other post-upload operations truly require them.
### Quota note
- Default project quota: **10,000 units/day**
- `videos.insert`: **100 units** per call (official quota calculator as of 2025-12)
- Invalid requests still cost quota, so validate metadata before enqueueing uploads
## What to Avoid
| Avoid | Why |
|---|---|
| Putting Google OAuth/token handling in the browser | Google recommends server-side libraries for server-managed OAuth; browser-only flows are wrong for refresh-token storage and scheduled publishing. |
| Using `Next.js` server actions / route handlers for large video upload processing | Bad fit for long-running, multi-GB uploads and retry-heavy workflows; keep that in Nest workers. |
| Storing video binaries in PostgreSQL | Bloats the database, backups, and WAL; store files on disk and only metadata in Postgres. |
| Using API keys or service accounts for channel publishing | YouTube channel uploads require user-authorized OAuth access, not project-only credentials. |
| Relying on cron + in-memory timers instead of BullMQ | You lose durability, retries, visibility, and restart safety. |
| Starting with S3/R2, event buses, and microservices on day one | Too much ops complexity for an internal MVP; local storage + modular monolith is the faster validation path. |
| Unofficial browser automation / scraping upload flows | Brittle, non-compliant, and explicitly out of scope for this project. |
| Leaving the Google consent screen in `Testing` for real usage | External-app refresh tokens can expire quickly in testing mode; promote to production-ready config before relying on scheduled publishing. |
## MVP → Growth Path
### MVP now
- Single NestJS app plus a separate worker process
- Local disk storage for `videos/`, `thumbnails/`, and temporary upload artifacts
- PostgreSQL + Redis via Docker Compose
- Status dashboard polling every few seconds
### Growth later
- Swap local disk for S3/R2 behind a storage adapter
- Move BullMQ workers to dedicated containers/VMs
- Add WebSocket/SSE live status updates
- Add per-account quota dashboards, alerting, and audit exports
## Bottom Line
- **Frontend:** `Next.js 16` admin panel
- **Backend:** `NestJS` REST API + worker modules
- **Data:** `PostgreSQL` + `Prisma`
- **Async work:** `Redis` + `BullMQ`
- **Media:** local disk first
- **Google integration:** backend-only OAuth 2.0 + official `googleapis`
## Sources
- Next.js docs: https://nextjs.org/docs
- NestJS docs: https://docs.nestjs.com/
- Prisma ORM docs: https://www.prisma.io/docs/orm
- BullMQ docs: https://docs.bullmq.io/
- Google OAuth 2.0 for web server apps: https://developers.google.com/identity/protocols/oauth2/web-server
- Google APIs Node.js client: https://github.com/googleapis/google-api-nodejs-client
- YouTube upload guide: https://developers.google.com/youtube/v3/guides/uploading_a_video
- YouTube resumable upload guide: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
- YouTube quota calculator: https://developers.google.com/youtube/v3/determine_quota_cost
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.github/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
