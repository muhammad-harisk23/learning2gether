import { classifyFocus, type FocusSignalSource, type FocusSnapshot, type FocusState } from "./focusSignals";

export interface FocusControllerCallbacks {
  onState(state: FocusState, eligible: boolean): void;
  onPauseRequested(reason: "hidden" | "confirmed-lost"): void;
  onActivity(milliseconds: number): void;
  onCheckpoint(): void;
}

export interface FocusControllerOptions {
  source: FocusSignalSource;
  callbacks: FocusControllerCallbacks;
  now?: () => number;
  setIntervalFn?: typeof window.setInterval;
  clearIntervalFn?: typeof window.clearInterval;
  sampleMs?: number;
  maxDeltaMs?: number;
  checkpointMs?: number;
}

export class FocusController {
  private readonly now: () => number;
  private readonly schedule: typeof window.setInterval;
  private readonly cancel: typeof window.clearInterval;
  private readonly sampleMs: number;
  private readonly maxDeltaMs: number;
  private readonly checkpointMs: number;
  private timer: number | null = null;
  private unsubscribe: (() => void) | null = null;
  private playerState = "unstarted";
  private sessionActive = false;
  private focusState: FocusState;
  private baseline: number | null = null;
  private sinceCheckpoint = 0;
  private disposed = false;

  constructor(private readonly options: FocusControllerOptions) {
    this.now = options.now ?? (() => performance.now());
    this.schedule = options.setIntervalFn ?? window.setInterval.bind(window);
    this.cancel = options.clearIntervalFn ?? window.clearInterval.bind(window);
    this.sampleMs = options.sampleMs ?? 500;
    this.maxDeltaMs = options.maxDeltaMs ?? 1500;
    this.checkpointMs = options.checkpointMs ?? 5000;
    this.focusState = classifyFocus(options.source.snapshot());
  }

  start(): void {
    if (this.disposed || this.timer !== null) return;
    this.unsubscribe = this.options.source.subscribe((snapshot) => this.onFocusSignal(snapshot));
    this.timer = this.schedule(() => this.sample(), this.sampleMs);
    this.publishState();
  }

  setSessionActive(active: boolean): void {
    if (this.sessionActive === active) return;
    this.sessionActive = active;
    this.resetBaseline(true);
    if (!active) this.options.callbacks.onCheckpoint();
    this.publishState();
  }

  setPlayerState(state: string): void {
    if (this.playerState === state) return;
    const wasEligible = this.isEligible();
    this.playerState = state;
    const isEligible = this.isEligible();
    if (wasEligible !== isEligible) {
      this.resetBaseline(true);
      if (!isEligible) this.options.callbacks.onCheckpoint();
    }
    this.publishState();
  }

  recheckFocus(): FocusState {
    this.onFocusSignal(this.options.source.snapshot());
    return this.focusState;
  }

  get eligible(): boolean { return this.isEligible(); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.resetBaseline(true);
  }

  private onFocusSignal(snapshot: FocusSnapshot): void {
    const next = classifyFocus(snapshot);
    if (next === this.focusState) return;
    const wasEligible = this.isEligible();
    this.focusState = next;
    const isEligible = this.isEligible();
    if (wasEligible !== isEligible) this.resetBaseline(true);
    if (next === "hidden" || next === "confirmed-lost") this.options.callbacks.onPauseRequested(next);
    if (wasEligible !== isEligible && !isEligible) this.options.callbacks.onCheckpoint();
    this.publishState();
  }

  private sample(): void {
    const snapshot = this.options.source.snapshot();
    if (classifyFocus(snapshot) !== this.focusState) this.onFocusSignal(snapshot);
    if (this.disposed || !this.isEligible()) {
      this.baseline = null;
      return;
    }
    const current = this.now();
    if (!Number.isFinite(current)) {
      this.baseline = null;
      return;
    }
    if (this.baseline === null) {
      this.baseline = current;
      return;
    }
    const previous = this.baseline;
    this.baseline = current;
    const delta = current - previous;
    if (!Number.isFinite(delta) || delta <= 0 || delta > this.maxDeltaMs) return;

    this.sinceCheckpoint += delta;
    this.options.callbacks.onActivity(delta);
    if (this.sinceCheckpoint >= this.checkpointMs) {
      this.sinceCheckpoint %= this.checkpointMs;
      this.options.callbacks.onCheckpoint();
    }
  }

  private isEligible(): boolean {
    return this.sessionActive && this.playerState === "playing" && this.focusState === "confirmed-foreground";
  }

  private resetBaseline(discardPending: boolean): void {
    this.baseline = null;
    if (discardPending) this.sinceCheckpoint = 0;
  }

  private publishState(): void {
    this.options.callbacks.onState(this.focusState, this.isEligible());
  }
}
