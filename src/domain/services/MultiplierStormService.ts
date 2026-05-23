export interface MultiplierTick {
  multiplier: number;
  elapsed: number;
  velocity: number;
}

export class MultiplierStormService {
  private startTime: number = 0;
  private crashPoint: number = 0;
  private animFrame: number = 0;
  private onTick: ((tick: MultiplierTick) => void) | null = null;
  private onCrash: ((multiplier: number) => void) | null = null;
  private isRunning = false;

  private computeMultiplier(elapsedMs: number): number {
    const t = elapsedMs / 1000;
    return Math.floor(100 * Math.pow(Math.E, 0.06 * t)) / 100;
  }

  start(crashPoint: number, onTick: (tick: MultiplierTick) => void, onCrash: (m: number) => void): void {
    this.crashPoint = crashPoint;
    this.onTick = onTick;
    this.onCrash = onCrash;
    this.startTime = performance.now();
    this.isRunning = true;
    this.animate();
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    const elapsed = performance.now() - this.startTime;
    const multiplier = this.computeMultiplier(elapsed);
    const velocity = multiplier * 0.06;

    if (multiplier >= this.crashPoint) {
      this.isRunning = false;
      this.onTick?.({ multiplier: this.crashPoint, elapsed, velocity });
      this.onCrash?.(this.crashPoint);
      return;
    }

    this.onTick?.({ multiplier, elapsed, velocity });
    this.animFrame = requestAnimationFrame(this.animate);
  };

  stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrame);
  }

  getElapsed(): number {
    return this.isRunning ? performance.now() - this.startTime : 0;
  }
}
