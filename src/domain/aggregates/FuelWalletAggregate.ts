import { createDomainEvent, FuelDepositedEvent } from '../events/DomainEvents';

export interface FuelWalletState {
  id: string;
  userId: string;
  demoBalance: number;
  fuelBalance: number;
  bonusBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  isDemoMode: boolean;
}

export class FuelWalletAggregate {
  private state: FuelWalletState;
  private domainEvents: FuelDepositedEvent[] = [];

  constructor(state: FuelWalletState) {
    this.state = { ...state };
  }

  get activeBalance(): number {
    return this.state.isDemoMode ? this.state.demoBalance : this.state.fuelBalance;
  }

  debit(amount: number): void {
    if (amount <= 0) throw new Error('Debit amount must be positive');
    if (this.activeBalance < amount) throw new Error('Insufficient balance');
    if (this.state.isDemoMode) {
      this.state.demoBalance -= amount;
    } else {
      this.state.fuelBalance -= amount;
    }
  }

  credit(amount: number): void {
    if (amount <= 0) throw new Error('Credit amount must be positive');
    if (this.state.isDemoMode) {
      this.state.demoBalance += amount;
    } else {
      this.state.fuelBalance += amount;
    }
  }

  deposit(amount: number, currency: string, bonusRate: number): void {
    const bonus = amount * bonusRate;
    this.state.fuelBalance += amount + bonus;
    this.state.bonusBalance += bonus;
    this.state.totalDeposited += amount;
    this.domainEvents.push(
      createDomainEvent<FuelDepositedEvent>({
        type: 'FuelDeposited',
        aggregateId: this.state.id,
        userId: this.state.userId,
        amount,
        currency,
        bonusAmount: bonus,
      })
    );
  }

  toggleMode(demo: boolean): void {
    this.state.isDemoMode = demo;
  }

  getState(): Readonly<FuelWalletState> {
    return { ...this.state };
  }

  pullEvents(): FuelDepositedEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
