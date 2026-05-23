import { supabase } from '../../infrastructure/supabase/client';
import { provablyFairService } from '../../domain/services/ProvablyFairService';

export interface ProcessDailyBurstDrawInput {
  userId: string;
  source: 'voice' | 'photo';
  aiTags: string[];
}

export interface ProcessDailyBurstDrawOutput {
  ticketId: string;
  burstMultiplier: number;
  expiresAt: string;
}

export class ProcessDailyBurstDrawUseCase {
  async execute(input: ProcessDailyBurstDrawInput): Promise<ProcessDailyBurstDrawOutput> {
    const { seed } = await provablyFairService.generateServerSeed();
    const nonce = Math.floor(Math.random() * 10000);
    const multiplier = await provablyFairService.deriveCrashMultiplier(seed, 'dream_burst_2026', nonce);
    const burstMultiplier = Math.min(5.0, Math.max(1.0, multiplier));

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: ticket, error } = await supabase
      .from('dream_tickets')
      .insert({
        user_id: input.userId,
        ticket_type: 'daily',
        source: input.source,
        ai_tags: input.aiTags,
        burst_multiplier: burstMultiplier,
        is_used: false,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from('profiles')
      .select('dream_streak')
      .eq('id', input.userId)
      .maybeSingle();

    await supabase
      .from('profiles')
      .update({ dream_streak: (profile?.dream_streak ?? 0) + 1 })
      .eq('id', input.userId);

    return {
      ticketId: ticket.id,
      burstMultiplier,
      expiresAt,
    };
  }
}

export const processDailyBurstDrawUseCase = new ProcessDailyBurstDrawUseCase();
