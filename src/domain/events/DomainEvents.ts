export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

export interface DreamBetPlacedEvent extends DomainEvent {
  readonly type: 'DreamBetPlaced';
  readonly userId: string;
  readonly betAmount: number;
  readonly ticketId: string | null;
  readonly multiplier: number;
}

export interface MultiplierCrashedEvent extends DomainEvent {
  readonly type: 'MultiplierCrashed';
  readonly roundId: string;
  readonly crashMultiplier: number;
  readonly totalLost: number;
  readonly totalWon: number;
}

export interface JackpotExplodedEvent extends DomainEvent {
  readonly type: 'JackpotExploded';
  readonly winnerId: string;
  readonly jackpotAmount: number;
  readonly multiplier: number;
}

export interface ViralChainExtendedEvent extends DomainEvent {
  readonly type: 'ViralChainExtended';
  readonly referrerId: string;
  readonly referredId: string;
  readonly chainLevel: number;
  readonly rewardAmount: number;
}

export interface FuelDepositedEvent extends DomainEvent {
  readonly type: 'FuelDeposited';
  readonly userId: string;
  readonly amount: number;
  readonly currency: string;
  readonly bonusAmount: number;
}

export type AnyDomainEvent =
  | DreamBetPlacedEvent
  | MultiplierCrashedEvent
  | JackpotExplodedEvent
  | ViralChainExtendedEvent
  | FuelDepositedEvent;

export function createDomainEvent<T extends AnyDomainEvent>(
  event: Omit<T, 'eventId' | 'occurredOn'>
): T {
  return {
    ...event,
    eventId: crypto.randomUUID(),
    occurredOn: new Date(),
  } as T;
}
