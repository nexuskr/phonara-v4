import { supabase } from '../../infrastructure/supabase/client';

export interface ExecuteCrashCashoutInput {
  betId: string;
  userId: string;
  currentMultiplier: number;
  isDemo: boolean;
}

export interface ExecuteCrashCashoutOutput {
  payout: number;
  newBalance: number;
}

export class ExecuteCrashCashoutUseCase {
  async execute(input: ExecuteCrashCashoutInput): Promise<ExecuteCrashCashoutOutput> {
    const { data: bet } = await supabase
      .from('crash_bets')
      .select('*')
      .eq('id', input.betId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!bet || bet.status !== 'active') throw new Error('Bet not cashout-eligible');

    const payout = Number(bet.bet_amount) * input.currentMultiplier;

    await supabase.from('crash_bets').update({
      status: 'won',
      cashout_multiplier: input.currentMultiplier,
      payout,
    }).eq('id', input.betId);

    const { data: walletData } = await supabase
      .from('fuel_wallets')
      .select('*')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!walletData) throw new Error('Wallet not found');

    const isDemoMode = walletData.is_demo_mode;
    const newBalance = isDemoMode
      ? Number(walletData.demo_balance) + payout
      : Number(walletData.fuel_balance) + payout;

    await supabase.from('fuel_wallets').update(
      isDemoMode ? { demo_balance: newBalance } : { fuel_balance: newBalance }
    ).eq('user_id', input.userId);

    return { payout, newBalance };
  }
}

export const executeCrashCashoutUseCase = new ExecuteCrashCashoutUseCase();
