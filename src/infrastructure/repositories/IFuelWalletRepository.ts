import type { FuelWalletState } from '../../domain/aggregates/FuelWalletAggregate';

export interface IFuelWalletRepository {
  findByUserId(userId: string): Promise<FuelWalletState | null>;
  save(wallet: FuelWalletState): Promise<void>;
  updateBalance(userId: string, demoBalance: number, fuelBalance: number): Promise<void>;
}
