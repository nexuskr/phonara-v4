import type { DreamBetState } from '../../domain/aggregates/DreamBetAggregate';

export interface IDreamBetRepository {
  save(bet: DreamBetState): Promise<void>;
  findById(id: string): Promise<DreamBetState | null>;
  findByUserId(userId: string, limit?: number): Promise<DreamBetState[]>;
}
