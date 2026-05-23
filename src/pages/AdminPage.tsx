import { useState, useEffect } from 'react';
import { Shield, Users, TrendingUp, DollarSign, Activity, BarChart2, Globe, Zap, Award, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import NeonButton from '../components/ui/NeonButton';

interface AdminStats {
  totalPlayers: number;
  activeToday: number;
  totalWagered: number;
  totalPaidOut: number;
  houseEdge: number;
  jackpotPool: number;
  dreamTicketsIssued: number;
  viralChainsActive: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  user_id: string;
  created_at: string;
  is_demo: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  level: number;
  total_wagered: number;
  total_won: number;
  dream_streak: number;
  is_admin: boolean;
  created_at: string;
}

interface ViralNode {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  chain_level: number;
  total_earned: number;
  username: string;
}

interface RevenueData {
  crash: number;
  slots: number;
  trading: number;
  dreamburst: number;
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'viral'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [viralNodes, setViralNodes] = useState<ViralNode[]>([]);
  const [revenue, setRevenue] = useState<RevenueData>({ crash: 0, slots: 0, trading: 0, dreamburst: 0 });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [jackpotInput, setJackpotInput] = useState('');

  useEffect(() => {
    if (profile && !profile.is_admin) return;
    loadAllData();
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { loadStats(); loadTransactions(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_stats' }, () => { loadStats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function loadAllData() {
    try {
      await Promise.all([loadStats(), loadTransactions(), loadUsers(), loadViralTree(), loadRevenue()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { data: g } = await supabase.from('global_stats').select('*').eq('id', 1).maybeSingle();
    if (g) {
      const wagered = Number(g.total_wagered) || 0;
      const paidOut = Number(g.total_paid_out) || 0;
      setStats({
        totalPlayers: g.total_players,
        activeToday: g.active_players,
        totalWagered: wagered,
        totalPaidOut: paidOut,
        houseEdge: wagered > 0 ? ((wagered - paidOut) / wagered) * 100 : 0,
        jackpotPool: Number(g.jackpot_pool),
        dreamTicketsIssued: g.dream_tickets_issued,
        viralChainsActive: g.viral_chains_active,
      });
    }
  }

  async function loadTransactions() {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setTransactions(data as unknown as Transaction[]);
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setUsers(data as unknown as UserProfile[]);
  }

  async function loadViralTree() {
    const { data: rootProfile } = await supabase.from('profiles').select('id').eq('is_admin', true).limit(1).maybeSingle();
    if (rootProfile) {
      const { data } = await supabase.rpc('get_viral_tree', { p_root_user_id: rootProfile.id });
      if (data) setViralNodes(data as unknown as ViralNode[]);
    }
    if (!rootProfile || viralNodes.length === 0) {
      const { data: allRefs } = await supabase.from('viral_referrals').select('*, profiles:viral_referrals_referred_id_fkey(username)').limit(50);
      if (allRefs) {
        setViralNodes(allRefs.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          referrer_id: r.referrer_id as string,
          referred_id: r.referred_id as string,
          referral_code: r.referral_code as string,
          chain_level: r.chain_level as number,
          total_earned: Number(r.total_earned),
          username: String((r.profiles as Record<string, unknown>)?.username ?? 'unknown'),
        })));
      }
    }
  }

  async function loadRevenue() {
    const { data: crashBets } = await supabase.from('crash_bets').select('bet_amount, payout').eq('is_demo', false);
    const { data: slotSpins } = await supabase.from('slot_spins').select('bet_amount, payout').eq('is_demo', false);
    const { data: dreamBets } = await supabase.from('dream_bets').select('bet_amount, payout').eq('is_demo', false);

    const sumBet = (arr: Record<string, unknown>[] | null) => arr?.reduce((s, r) => s + Number(r.bet_amount), 0) ?? 0;
    const sumPayout = (arr: Record<string, unknown>[] | null) => arr?.reduce((s, r) => s + Number(r.payout ?? 0), 0) ?? 0;

    setRevenue({
      crash: sumBet(crashBets as unknown as Record<string, unknown>[]) - sumPayout(crashBets as unknown as Record<string, unknown>[]),
      slots: sumBet(slotSpins as unknown as Record<string, unknown>[]) - sumPayout(slotSpins as unknown as Record<string, unknown>[]),
      trading: 0,
      dreamburst: sumBet(dreamBets as unknown as Record<string, unknown>[]) - sumPayout(dreamBets as unknown as Record<string, unknown>[]),
    });
  }

  async function handleJackpotUpdate() {
    const val = parseFloat(jackpotInput);
    if (isNaN(val) || val < 0) return;
    await supabase.from('global_stats').update({ jackpot_pool: val }).eq('id', 1);
    setJackpotInput('');
    loadStats();
  }

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-[#FF6B35] mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-black text-[#FF6B35] mb-2">접근 권한 없음</h2>
          <p className="text-[var(--text-muted)]">어드민 권한이 필요합니다</p>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-[#00D4FF] animate-pulse text-lg font-bold">어드민 데이터 로딩...</div>
      </div>
    );
  }

  const totalRevenue = revenue.crash + revenue.slots + revenue.trading + revenue.dreamburst;
  const revenueItems = [
    { label: '크래시 게임', amount: revenue.crash, pct: totalRevenue > 0 ? (revenue.crash / totalRevenue) * 100 : 45, color: '#FF6B35' },
    { label: '슬롯 머신', amount: revenue.slots, pct: totalRevenue > 0 ? (revenue.slots / totalRevenue) * 100 : 30, color: '#FFD700' },
    { label: '레버리지 트레이딩', amount: revenue.trading, pct: totalRevenue > 0 ? (revenue.trading / totalRevenue) * 100 : 20, color: '#00D4FF' },
    { label: '드림버스트', amount: revenue.dreamburst, pct: totalRevenue > 0 ? (revenue.dreamburst / totalRevenue) * 100 : 5, color: '#00FF88' },
  ];

  const filteredUsers = userSearch
    ? users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-16">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#FFD700]" />
            <h1 className="text-2xl font-black text-[var(--text-primary)]">어드민 대시보드</h1>
          </div>
          <NeonButton variant="ghost" size="sm" onClick={loadAllData}>
            <RefreshCw className="w-4 h-4" />
          </NeonButton>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {([
            { id: 'overview' as const, label: '개요', icon: BarChart2 },
            { id: 'users' as const, label: '유저', icon: Users },
            { id: 'transactions' as const, label: '거래내역', icon: DollarSign },
            { id: 'viral' as const, label: '바이럴 트리', icon: Globe },
          ]).map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  activeTab === tab.id ? 'bg-[rgba(0,212,255,0.15)] border-[#00D4FF] text-[#00D4FF]' : 'border-[rgba(255,255,255,0.08)] text-[var(--text-muted)]'
                }`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: '총 플레이어', value: stats.totalPlayers.toLocaleString(), icon: Users, color: '#00D4FF' },
                { label: '오늘 활성', value: stats.activeToday.toLocaleString(), icon: Activity, color: '#00FF88' },
                { label: '총 베팅액', value: `$${(stats.totalWagered / 1e6).toFixed(2)}M`, icon: TrendingUp, color: '#FFD700' },
                { label: '하우스 엣지', value: `${stats.houseEdge.toFixed(2)}%`, icon: BarChart2, color: '#FF6B35' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="card-cyber p-5" style={{ borderColor: `${item.color}22` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: '총 지급액', value: `$${(stats.totalPaidOut / 1e6).toFixed(2)}M`, color: '#00FF88' },
                { label: '잭팟 풀', value: `$${stats.jackpotPool.toLocaleString('en', { maximumFractionDigits: 0 })}`, color: '#FFD700' },
                { label: '드림티켓 발급', value: stats.dreamTicketsIssued.toLocaleString(), color: '#00D4FF' },
                { label: '바이럴 체인 활성', value: stats.viralChainsActive.toLocaleString(), color: '#FF6B35' },
              ].map(item => (
                <div key={item.label} className="glass rounded-xl p-4 text-center border border-[rgba(0,212,255,0.08)]">
                  <div className="text-xl font-black" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl p-5 mb-6 border border-[rgba(0,212,255,0.08)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">수익 분석</h3>
              <div className="space-y-3">
                {revenueItems.map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[var(--text-secondary)]">{item.label}</span>
                      <span className="font-bold" style={{ color: item.color }}>${item.amount.toFixed(0)} ({item.pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(item.pct, 2)}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 border border-[rgba(255,215,0,0.15)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#FFD700]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">잭팫 관리</h3>
                </div>
                <div className="text-2xl font-black text-[#FFD700]">${stats.jackpotPool.toLocaleString('en', { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={jackpotInput}
                  onChange={e => setJackpotInput(e.target.value)}
                  placeholder="새 잭팫 금액"
                  className="input-cyber flex-1 px-3 py-2 text-sm"
                />
                <NeonButton variant="gold" size="sm" onClick={handleJackpotUpdate}>잭팫 금액 설정</NeonButton>
                <NeonButton variant="ghost" size="sm" onClick={async () => {
                  await supabase.from('global_stats').update({ jackpot_pool: 50000 }).eq('id', 1);
                  loadStats();
                }}>기본값 리셋</NeonButton>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="사용자명 검색..."
                  className="input-cyber w-full pl-10 pr-3 py-2.5 text-sm"
                />
              </div>
              <span className="text-xs text-[var(--text-muted)]">{filteredUsers.length}명</span>
            </div>

            <div className="glass rounded-2xl border border-[rgba(0,212,255,0.08)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(0,212,255,0.06)]">
                      {['사용자명','레벨','총 베팅','총 획득','드림 스트릭','가입일'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted)] text-sm">유저 없음</td></tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-all cursor-pointer"
                        onClick={() => setSelectedUser(u)}>
                        <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{u.username}</td>
                        <td className="px-4 py-3 text-[#FFD700]">Lv.{u.level}</td>
                        <td className="px-4 py-3">${Number(u.total_wagered).toFixed(0)}</td>
                        <td className="px-4 py-3 text-[#00FF88]">${Number(u.total_won).toFixed(0)}</td>
                        <td className="px-4 py-3">{u.dream_streak}일</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(u.created_at).toLocaleDateString('ko')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
                <div className="glass max-w-md mx-4 rounded-2xl p-6 animate-fade-in-scale border border-[rgba(0,212,255,0.3)]" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-[var(--text-primary)]">{selectedUser.username} 상세</h3>
                    <button onClick={() => setSelectedUser(null)} className="text-[var(--text-muted)] hover:text-[#FF6B35]"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">레벨</span><span className="text-[#FFD700] font-bold">Lv.{selectedUser.level}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">총 베팅</span><span className="font-bold">${Number(selectedUser.total_wagered).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">총 획득</span><span className="text-[#00FF88] font-bold">${Number(selectedUser.total_won).toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">드림 스트릭</span><span className="text-[#FF6B35] font-bold">{selectedUser.dream_streak}일</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">가입일</span><span className="text-[var(--text-secondary)]">{new Date(selectedUser.created_at).toLocaleString('ko')}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="glass rounded-2xl border border-[rgba(0,212,255,0.08)] overflow-hidden">
            <div className="p-4 border-b border-[rgba(0,212,255,0.08)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">최근 거래내역</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(0,212,255,0.06)]">
                    {['유형','금액','유저 ID','모드','시각'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[var(--text-muted)] text-sm">거래 내역 없음</td></tr>
                  ) : transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-all">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          tx.type === 'win' ? 'bg-[rgba(0,255,136,0.15)] text-[#00FF88]'
                          : tx.type === 'bet' ? 'bg-[rgba(255,107,53,0.15)] text-[#FF6B35]'
                          : 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]'
                        }`}>{tx.type}</span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${tx.amount >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
                        {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{tx.user_id.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${tx.is_demo ? 'text-[#FFD700]' : 'text-[#00FF88]'}`}>{tx.is_demo ? 'DEMO' : 'REAL'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(tx.created_at).toLocaleString('ko')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'viral' && (
          <div>
            <div className="glass rounded-2xl p-5 mb-6 border border-[rgba(0,212,255,0.08)]">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-[#00D4FF]" />
                <h3 className="text-base font-black text-[var(--text-primary)]">바이럴 체인 시각화</h3>
                <span className="text-xs text-[var(--text-muted)]">{viralNodes.length}개 노드</span>
              </div>

              {viralNodes.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)] text-sm">아직 추천 데이터가 없습니다</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {viralNodes.map((node) => (
                    <div key={node.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                      node.chain_level === 1 ? 'bg-[rgba(255,215,0,0.06)] border-[rgba(255,215,0,0.2)]'
                      : node.chain_level === 2 ? 'bg-[rgba(0,212,255,0.04)] border-[rgba(0,212,255,0.15)]'
                      : 'bg-[rgba(0,255,136,0.03)] border-[rgba(0,255,136,0.1)]'
                    }`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          node.chain_level === 1 ? 'bg-[rgba(255,215,0,0.2)] text-[#FFD700]'
                          : 'bg-[rgba(0,212,255,0.15)] text-[#00D4FF]'
                        }`}>
                          {node.chain_level}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)] truncate">{node.username}</span>
                        <span className="text-xs text-[var(--text-muted)]">코드: {node.referral_code}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-[#00FF88]">${node.total_earned.toFixed(0)}</div>
                        <div className="text-xs text-[var(--text-muted)]">Lv.{node.chain_level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: '총 추천 수', value: viralNodes.length.toLocaleString(), icon: Users, color: '#00D4FF' },
                { label: '추천 수익 지급', value: `$${viralNodes.reduce((s, n) => s + n.total_earned, 0).toFixed(0)}`, icon: DollarSign, color: '#00FF88' },
                { label: '최대 체인 깊이', value: `${Math.max(...viralNodes.map(n => n.chain_level), 0)}단계`, icon: Zap, color: '#FFD700' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="glass rounded-xl p-4 border border-[rgba(0,212,255,0.08)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                      <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                    </div>
                    <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
