import { createDomainEvent, DreamBetPlacedEvent } from '../events/DomainEvents';

export interface DreamBetState {
  id: string;
  userId: string;
  betAmount: number;
  ticketId: string | null;
  multiplier: number;
  burstResult: number | null;
  payout: number;
  status: 'pending' | 'burst' | 'missed';
  isDemo: boolean;
  createdAt: Date;
}

export class DreamBetAggregate {
  private state: DreamBetState;
  private domainEvents: DreamBetPlacedEvent[] = [];

  private constructor(state: DreamBetState) {
    this.state = state;
  }

  static create(params: {
    userId: string;
    betAmount: number;
    ticketId: string | null;
    multiplier: number;
    isDemo: boolean;
  }): DreamBetAggregate {
    if (params.betAmount <= 0) throw new Error('Bet amount must be positive');
    if (params.multiplier < 1) throw new Error('Multiplier must be >= 1');

    const id = crypto.randomUUID();
    const state: DreamBetState = {
      id,
      userId: params.userId,
      betAmount: params.betAmount,
      ticketId: params.ticketId,
      multiplier: params.multiplier,
      burstResult: null,
      payout: 0,
      status: 'pending',
      isDemo: params.isDemo,
      createdAt: new Date(),
    };

    const aggregate = new DreamBetAggregate(state);
    aggregate.domainEvents.push(
      createDomainEvent<DreamBetPlacedEvent>({
        type: 'DreamBetPlaced',
        aggregateId: id,
        userId: params.userId,
        betAmount: params.betAmount,
        ticketId: params.ticketId,
        multiplier: params.multiplier,
      })
    );
    return aggregate;
  }

  resolve(burstResult: number): void {
    this.state.burstResult = burstResult;
    if (burstResult >= this.state.multiplier) {
      this.state.status = 'burst';
      this.state.payout = this.state.betAmount * this.state.multiplier;
    } else {
      this.state.status = 'missed';
      this.state.payout = 0;
    }
  }

  getState(): Readonly<DreamBetState> {
    return { ...this.state };
  }

  pullEvents(): DreamBetPlacedEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
