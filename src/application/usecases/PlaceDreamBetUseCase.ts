import { DreamBetAggregate } from '../../domain/aggregates/DreamBetAggregate';
import { FuelWalletAggregate } from '../../domain/aggregates/FuelWalletAggregate';
import { supabase } from '../../infrastructure/supabase/client';

export interface PlaceDreamBetInput {
  userId: string;
  betAmount: number;
  ticketId: string | null;
  multiplier: number;
  isDemo: boolean;
}

export interface PlaceDreamBetOutput {
  betId: string;
  newBalance: number;
  events: unknown[];
}

export class PlaceDreamBetUseCase {
  async execute(input: PlaceDreamBetInput): Promise<PlaceDreamBetOutput> {
    const { data: walletData } = await supabase
      .from('fuel_wallets')
      .select('*')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!walletData) throw new Error('Wallet not found');

    const wallet = new FuelWalletAggregate({
      id: walletData.id,
      userId: walletData.user_id,
      demoBalance: Number(walletData.demo_balance),
      fuelBalance: Number(walletData.fuel_balance),
      bonusBalance: Number(walletData.bonus_balance),
      totalDeposited: Number(walletData.total_deposited),
      totalWithdrawn: Number(walletData.total_withdrawn),
      isDemoMode: walletData.is_demo_mode,
    });

    wallet.debit(input.betAmount);

    const bet = DreamBetAggregate.create({
      userId: input.userId,
      betAmount: input.betAmount,
      ticketId: input.ticketId,
      multiplier: input.multiplier,
      isDemo: input.isDemo,
    });

    const walletState = wallet.getState();
    await supabase.from('fuel_wallets').update({
      demo_balance: walletState.demoBalance,
      fuel_balance: walletState.fuelBalance,
      updated_at: new Date().toISOString(),
    }).eq('user_id', input.userId);

    const betState = bet.getState();
    await supabase.from('dream_bets').insert({
      id: betState.id,
      user_id: betState.userId,
      ticket_id: betState.ticketId,
      bet_amount: betState.betAmount,
      multiplier: betState.multiplier,
      status: betState.status,
      is_demo: betState.isDemo,
    });

    const events = bet.pullEvents();
    return {
      betId: betState.id,
      newBalance: wallet.activeBalance,
      events,
    };
  }
}

export const placeDreamBetUseCase = new PlaceDreamBetUseCase();
