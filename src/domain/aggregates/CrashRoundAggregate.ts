import { createDomainEvent, MultiplierCrashedEvent } from '../events/DomainEvents';

export interface CrashRoundState {
  id: string;
  roundNumber: number;
  serverSeedHash: string;
  serverSeed?: string;
  clientSeed: string;
  crashMultiplier?: number;
  status: 'waiting' | 'running' | 'crashed';
  startedAt?: Date;
  crashedAt?: Date;
  createdAt: Date;
}

export class CrashRoundAggregate {
  private state: CrashRoundState;
  private domainEvents: MultiplierCrashedEvent[] = [];

  constructor(state: CrashRoundState) {
    this.state = { ...state };
  }

  static create(serverSeedHash: string, clientSeed: string = 'loavable2026'): CrashRoundAggregate {
    return new CrashRoundAggregate({
      id: crypto.randomUUID(),
      roundNumber: 0,
      serverSeedHash,
      clientSeed,
      status: 'waiting',
      createdAt: new Date(),
    });
  }

  start(): void {
    if (this.state.status !== 'waiting') throw new Error('Round not in waiting state');
    this.state.status = 'running';
    this.state.startedAt = new Date();
  }

  crash(multiplier: number, serverSeed: string, totalLost: number, totalWon: number): void {
    if (this.state.status !== 'running') throw new Error('Round not running');
    this.state.status = 'crashed';
    this.state.crashMultiplier = multiplier;
    this.state.serverSeed = serverSeed;
    this.state.crashedAt = new Date();
    this.domainEvents.push(
      createDomainEvent<MultiplierCrashedEvent>({
        type: 'MultiplierCrashed',
        aggregateId: this.state.id,
        roundId: this.state.id,
        crashMultiplier: multiplier,
        totalLost,
        totalWon,
      })
    );
  }

  getState(): Readonly<CrashRoundState> {
    return { ...this.state };
  }

  pullEvents(): MultiplierCrashedEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
