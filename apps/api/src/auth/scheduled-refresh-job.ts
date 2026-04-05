import type { TokenRefreshService } from './token-refresh.service';
import type { RefreshAllResult } from './token-refresh.service';

export interface RunHistoryEntry {
  ranAt: string;
  result: RefreshAllResult | null;
  error?: string;
}

export interface ScheduledRefreshJobOptions {
  refreshService: TokenRefreshService;
  intervalMs?: number;
  maxHistory?: number;
  onRun?: (entry: RunHistoryEntry) => void;
}

export class ScheduledRefreshJob {
  readonly intervalMs: number;
  private readonly refreshService: TokenRefreshService;
  private readonly maxHistory: number;
  private readonly onRun?: (entry: RunHistoryEntry) => void;
  private readonly history: RunHistoryEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;

  constructor(options: ScheduledRefreshJobOptions) {
    this.refreshService = options.refreshService;
    this.intervalMs = options.intervalMs ?? 4 * 60_000;
    this.maxHistory = options.maxHistory ?? 100;
    this.onRun = options.onRun;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._isRunning = false;
  }

  async runOnce(): Promise<RefreshAllResult> {
    const result = await this.refreshService.refreshAll();
    this.recordEntry({ ranAt: new Date().toISOString(), result });
    return result;
  }

  getHistory(): RunHistoryEntry[] {
    return [...this.history];
  }

  private async tick(): Promise<void> {
    let entry: RunHistoryEntry;
    try {
      const result = await this.refreshService.refreshAll();
      entry = { ranAt: new Date().toISOString(), result };
    } catch (err) {
      entry = {
        ranAt: new Date().toISOString(),
        result: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    this.recordEntry(entry);
  }

  private recordEntry(entry: RunHistoryEntry): void {
    this.history.push(entry);
    while (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.onRun?.(entry);
  }
}
