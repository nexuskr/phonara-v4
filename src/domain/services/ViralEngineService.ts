export interface ViralReward {
  referrerId: string;
  amount: number;
  chainLevel: number;
  reason: string;
}

export class ViralEngineService {
  private readonly BASE_REFERRAL_RATE = 0.08;
  private readonly CHAIN_DECAY = 0.5;

  computeReferralReward(profit: number, chainLevel: number): number {
    const rate = this.BASE_REFERRAL_RATE * Math.pow(this.CHAIN_DECAY, chainLevel - 1);
    return Math.max(0, profit * rate);
  }

  generateReferralCode(userId: string): string {
    const base = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${base}${suffix}`;
  }

  buildViralShareText(username: string, winAmount: number, multiplier: number): string {
    const formatted = winAmount >= 1_000_000
      ? `${(winAmount / 1_000_000).toFixed(1)}백만`
      : winAmount >= 10_000
      ? `${Math.round(winAmount / 10_000)}만`
      : winAmount.toFixed(0);
    return `${username}님이 ${multiplier}x 멀티플라이어로 ${formatted} USDT를 버스트! Loavable에서 지금 바로 드림베터가 되세요!`;
  }

  computeDreamChainMultiplier(streakDays: number): number {
    return Math.min(5.0, 1.0 + streakDays * 0.1);
  }
}

export const viralEngineService = new ViralEngineService();
