export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          xp: number;
          is_admin: boolean;
          dream_streak: number;
          total_wagered: number;
          total_won: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'level' | 'xp' | 'is_admin' | 'dream_streak' | 'total_wagered' | 'total_won' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      fuel_wallets: {
        Row: {
          id: string;
          user_id: string;
          demo_balance: number;
          fuel_balance: number;
          total_deposited: number;
          total_withdrawn: number;
          bonus_balance: number;
          is_demo_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['fuel_wallets']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['fuel_wallets']['Row']>;
      };
      crash_rounds: {
        Row: {
          id: string;
          round_number: number;
          server_seed_hash: string;
          server_seed: string | null;
          client_seed: string;
          crash_multiplier: number | null;
          status: 'waiting' | 'running' | 'crashed';
          started_at: string | null;
          crashed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['crash_rounds']['Row'], 'round_number' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['crash_rounds']['Row']>;
      };
      crash_bets: {
        Row: {
          id: string;
          round_id: string;
          user_id: string;
          username: string;
          bet_amount: number;
          auto_cashout: number | null;
          cashout_multiplier: number | null;
          payout: number | null;
          status: 'pending' | 'active' | 'won' | 'lost';
          is_demo: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['crash_bets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['crash_bets']['Row']>;
      };
      slot_spins: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          bet_amount: number;
          result_reels: unknown;
          payout: number;
          win_lines: unknown;
          is_jackpot: boolean;
          is_demo: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['slot_spins']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['slot_spins']['Row']>;
      };
      dream_tickets: {
        Row: {
          id: string;
          user_id: string;
          ticket_type: string;
          source: string;
          ai_tags: string[];
          burst_multiplier: number;
          is_used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['dream_tickets']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['dream_tickets']['Row']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          currency: string;
          reference_id: string | null;
          reference_type: string | null;
          balance_after: number | null;
          metadata: unknown;
          is_demo: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      global_stats: {
        Row: {
          id: number;
          total_players: number;
          total_wagered: number;
          total_paid_out: number;
          active_players: number;
          jackpot_pool: number;
          dream_tickets_issued: number;
          viral_chains_active: number;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['global_stats']['Row']>;
        Update: Partial<Database['public']['Tables']['global_stats']['Row']>;
      };
      viral_referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          chain_level: number;
          total_earned: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['viral_referrals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['viral_referrals']['Row']>;
      };
    };
  };
}
