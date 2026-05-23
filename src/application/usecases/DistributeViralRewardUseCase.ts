import { supabase } from '../../infrastructure/supabase/client';
import { viralEngineService } from '../../domain/services/ViralEngineService';

export interface DistributeViralRewardInput {
  winnerId: string;
  profit: number;
  isDemo: boolean;
}

export class DistributeViralRewardUseCase {
  async execute(input: DistributeViralRewardInput): Promise<void> {
    if (input.profit <= 0 || input.isDemo) return;

    const { data: referrals } = await supabase
      .from('viral_referrals')
      .select('*')
      .eq('referred_id', input.winnerId)
      .limit(1);

    if (!referrals || referrals.length === 0) return;

    const referral = referrals[0];
    const reward = viralEngineService.computeReferralReward(input.profit, referral.chain_level);

    if (reward <= 0) return;

    const { data: walletData } = await supabase
      .from('fuel_wallets')
      .select('fuel_balance')
      .eq('user_id', referral.referrer_id)
      .maybeSingle();

    if (walletData) {
      await supabase.from('fuel_wallets').update({
        fuel_balance: Number(walletData.fuel_balance) + reward,
      }).eq('user_id', referral.referrer_id);
    }

    await supabase.from('transactions').insert({
      user_id: referral.referrer_id,
      type: 'referral',
      amount: reward,
      currency: 'USDT',
      reference_id: input.winnerId,
      reference_type: 'viral_reward',
      is_demo: false,
    });

    await supabase.from('viral_referrals').update({
      total_earned: Number(referral.total_earned) + reward,
    }).eq('id', referral.id);
  }
}

export const distributeViralRewardUseCase = new DistributeViralRewardUseCase();
