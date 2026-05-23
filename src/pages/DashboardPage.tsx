import { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Star, Users, Globe, Award, Mic, Camera, Gift, ChevronRight, Activity, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import StatCard from '../components/ui/StatCard';
import LiveFeed from '../components/ui/LiveFeed';
import NeonButton from '../components/ui/NeonButton';

type Page = 'landing' | 'dashboard' | 'crash' | 'slots' | 'trading' | 'admin';

interface Props {
  onNavigate: (page: Page) => void;
}

interface GlobalStats {
  total_players: number;
  total_wagered: number;
  total_paid_out: number;
  active_players: number;
  jackpot_pool: number;
  dream_tickets_issued: number;
  viral_chains_active: number;
}

export default function DashboardPage({ onNavigate }: Props) {
  const { user, profile, wallet, refreshWallet } = useAuth();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [dreamTickets, setDreamTickets] = useState(0);
  const [dreamMode, setDreamMode] = useState<'idle' | 'recording' | 'uploading' | 'done'>('idle');
  const [jackpotPool, setJackpotPool] = useState(50000);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (wallet) setIsDemoMode(wallet.is_demo_mode);
  }, [wallet]);

  const pnl = useMemo(() => Math.random() * 2000 - 500, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setJackpotPool(p => p + Math.random() * 15);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const statsResult = await supabase.from('global_stats').select('*').eq('id', 1).maybeSingle();
    if (statsResult.data) setGlobalStats(statsResult.data as unknown as GlobalStats);

    if (user) {
      const ticketResult = await supabase
        .from('dream_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_used', false);
      setDreamTickets(ticketResult.count ?? 0);
    }
  }

  async function handleDreamRecord() {
    if (dreamMode !== 'idle' || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setDreamMode('uploading');

        try {
          const fileName = `${user.id}/${Date.now()}.webm`;
          await supabase.storage.from('dream-audio').upload(fileName, blob);

          const burstMultiplier = 1 + Math.random() * 2;
          await supabase.from('dream_tickets').insert({
            user_id: user.id,
            ticket_type: 'daily',
            source: 'voice',
            ai_tags: [],
            burst_multiplier: burstMultiplier,
            is_used: false,
          });

          const { data: profileData } = await supabase
            .from('profiles')
            .select('dream_streak')
            .eq('id', user.id)
            .maybeSingle();

          await supabase
            .from('profiles')
            .update({ dream_streak: (profileData?.dream_streak ?? 0) + 1 })
            .eq('id', user.id);

          setDreamTickets(p => p + 1);
          setDreamMode('done');
          refreshWallet();

          setTimeout(() => setDreamMode('idle'), 2000);
        } catch (err) {
          console.error('DreamBurst upload error:', err);
          setDreamMode('idle');
        }
      };

      setDreamMode('recording');
      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 12000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setDreamMode('idle');
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setDreamMode('uploading');

    try {
      const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('dream-photos').upload(fileName, file);

      const burstMultiplier = 1 + Math.random() * 1.5;
      await supabase.from('dream_tickets').insert({
        user_id: user.id,
        ticket_type: 'daily',
        source: 'photo',
        ai_tags: [],
        burst_multiplier: burstMultiplier,
        is_used: false,
      });

      const { data: profileData } = await supabase
        .from('profiles')
        .select('dream_streak')
        .eq('id', user.id)
        .maybeSingle();

      await supabase
        .from('profiles')
        .update({ dream_streak: (profileData?.dream_streak ?? 0) + 1 })
        .eq('id', user.id);

      setDreamTickets(p => p + 1);
      setDreamMode('done');
      refreshWallet();
      setTimeout(() => setDreamMode('idle'), 2000);
    } catch (err) {
      console.error('Photo upload error:', err);
      setDreamMode('idle');
    } finally {
      setPhotoInputKey(k => k + 1);
    }
  }

  async function toggleDemoMode() {
    if (!wallet || !user) return;
    const newMode = !isDemoMode;
    setIsDemoMode(newMode);
    await supabase.from('fuel_wallets').update({ is_demo_mode: newMode }).eq('user_id', wallet.user_id);
    refreshWallet();
  }

  const balance = wallet
    ? isDemoMode ? wallet.demo_balance : wallet.fuel_balance
    : 0;

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-16">
      <div className="px-4 pt-6 pb-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[var(--text-muted)] text-sm">안녕하세요,</p>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              {profile?.display_name ?? '드림베터'}님
              <span className="ml-2 text-sm font-normal text-[#FFD700]">Lv.{profile?.level ?? 1}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-[rgba(0,212,255,0.2)]">
              <span className={`text-xs font-bold ${isDemoMode ? 'text-[#FFD700]' : 'text-[var(--text-muted)]'}`}>DEMO</span>
              <button
                onClick={toggleDemoMode}
                className={`w-10 h-5 rounded-full transition-all duration-300 relative ${isDemoMode ? 'bg-[#FFD700]' : 'bg-[#00FF88]'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-[#040810] absolute top-0.5 transition-all duration-300 ${isDemoMode ? 'left-0.5' : 'left-5'}`} />
              </button>
              <span className={`text-xs font-bold ${!isDemoMode ? 'text-[#00FF88]' : 'text-[var(--text-muted)]'}`}>FUEL</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6 mb-6 border border-[rgba(0,212,255,0.2)]"
          style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(0,80,204,0.12) 100%)' }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #00D4FF, transparent)' }} />
          <div className="relative">
            <p className="text-[var(--text-secondary)] text-sm mb-1">
              총 잔고 {isDemoMode && <span className="text-[#FFD700] font-bold">(데모)</span>}
            </p>
            <div className="text-4xl font-black text-[var(--text-primary)] mb-1">
              ${balance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold ${pnl >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
              {pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              24시간 {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 mb-6 border"
          style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,107,53,0.06))', borderColor: 'rgba(255,215,0,0.2)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-[#FFD700] fill-current" />
                <h3 className="font-black text-[var(--text-primary)] text-lg">DreamBurst</h3>
                <div className="px-2 py-0.5 rounded-full bg-[rgba(255,215,0,0.2)] text-[#FFD700] text-xs font-bold">FREE</div>
              </div>
              <p className="text-[var(--text-secondary)] text-sm">오늘의 꿈을 10~15초 녹음하면 무료 티켓 지급!</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[#FFD700]">{dreamTickets}</div>
              <div className="text-xs text-[var(--text-muted)]">보유 티켓</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDreamRecord}
              disabled={dreamMode !== 'idle'}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${
                dreamMode === 'recording'
                  ? 'bg-[rgba(255,107,53,0.3)] border border-[#FF6B35] text-[#FF6B35] animate-pulse'
                  : dreamMode === 'uploading'
                  ? 'bg-[rgba(0,212,255,0.2)] border border-[#00D4FF] text-[#00D4FF] animate-pulse'
                  : dreamMode === 'done'
                  ? 'bg-[rgba(0,255,136,0.2)] border border-[#00FF88] text-[#00FF88]'
                  : 'bg-[rgba(255,215,0,0.15)] border border-[rgba(255,215,0,0.4)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.25)]'
              }`}>
              <Mic className="w-5 h-5" />
              {dreamMode === 'idle' ? '꿈 녹음하기' : dreamMode === 'recording' ? '녹음중...' : dreamMode === 'uploading' ? '업로드중...' : '티켓 지급됨!'}
            </button>
            <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold cursor-pointer transition-all bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.2)] ${dreamMode !== 'idle' ? 'opacity-40 pointer-events-none' : ''}`}>
              <Camera className="w-5 h-5" />
              사진 업로드
              <input key={photoInputKey} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {Boolean(profile?.dream_streak && profile.dream_streak > 0) && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-[var(--text-secondary)]">연속 <span className="text-[#FF6B35] font-bold">{profile!.dream_streak}일</span> — 멀티플라이어 {(1 + profile!.dream_streak * 0.1).toFixed(1)}x 보너스!</span>
            </div>
          )}
        </div>

        <h2 className="text-lg font-black text-[var(--text-primary)] mb-3">게임 시작</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { id: 'crash' as Page, label: '크래시', icon: Zap, color: '#FF6B35', bg: 'rgba(255,107,53,0.1)', border: 'rgba(255,107,53,0.3)', desc: '최대 1000x' },
            { id: 'slots' as Page, label: '슬롯', icon: Star, color: '#FFD700', bg: 'rgba(255,215,0,0.1)', border: 'rgba(255,215,0,0.3)', desc: 'RTP 96.5%' },
            { id: 'trading' as Page, label: '트레이딩', icon: TrendingUp, color: '#00D4FF', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.3)', desc: '50x 레버리지' },
          ].map(game => {
            const Icon = game.icon;
            return (
              <button
                key={game.id}
                onClick={() => onNavigate(game.id)}
                className="relative overflow-hidden rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-200 active:scale-95 hover:scale-105 border"
                style={{ background: game.bg, borderColor: game.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: game.bg }}>
                  <Icon className="w-6 h-6" style={{ color: game.color }} />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]">{game.label}</span>
                <span className="text-xs" style={{ color: game.color }}>{game.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 mb-6 border border-[rgba(255,215,0,0.3)]"
          style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,165,0,0.1))' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(255,215,0,0.2)] flex items-center justify-center">
              <Gift className="w-7 h-7 text-[#FFD700]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">현재 잭팫 풀</p>
              <div className="text-3xl font-black neon-text-gold text-[#FFD700]">
                ${jackpotPool.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <NeonButton variant="gold" size="sm" onClick={() => onNavigate('crash')}>도전</NeonButton>
          </div>
        </div>

        {globalStats && (
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)] mb-3">글로벌 통계</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard label="총 플레이어" value={globalStats.total_players.toLocaleString()} icon={<Users className="w-4 h-4" />} color="blue" trend={5.2} />
              <StatCard label="총 지급액" value={`$${(globalStats.total_paid_out / 1e9).toFixed(2)}B`} icon={<TrendingUp className="w-4 h-4" />} color="green" trend={12.8} />
              <StatCard label="실시간 플레이어" value={globalStats.active_players.toLocaleString()} icon={<Globe className="w-4 h-4" />} color="orange" trend={3.1} />
              <StatCard label="드림티켓 발급" value={globalStats.dream_tickets_issued.toLocaleString()} icon={<Award className="w-4 h-4" />} color="gold" />
            </div>
          </div>
        )}

        <h2 className="text-lg font-black text-[var(--text-primary)] mb-3">드림버스터 마일스톤</h2>
        <div className="space-y-3 mb-6">
          {[
            { label: '첫 드림버스트', reward: '$50', done: (profile?.dream_streak ?? 0) >= 1 },
            { label: '연속 7일 꿈 녹음', reward: '2x 멀티플라이어', done: (profile?.dream_streak ?? 0) >= 7 },
            { label: '친구 5명 초대', reward: '$200 보너스', done: false },
            { label: '누적 $1,000 배팅', reward: 'VIP 레벨업', done: (profile?.total_wagered ?? 0) >= 1000 },
          ].map(m => (
            <div key={m.label} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              m.done ? 'bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.2)]' : 'glass border-[rgba(0,212,255,0.1)]'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                m.done ? 'bg-[#00FF88] text-[#040810]' : 'bg-[rgba(0,212,255,0.1)] text-[var(--text-muted)]'
              }`}>
                {m.done ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className={`font-bold text-sm ${m.done ? 'text-[#00FF88]' : 'text-[var(--text-primary)]'}`}>{m.label}</div>
                <div className="text-xs text-[var(--text-muted)]">{m.reward}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-black text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          실시간 피드
        </h2>
        <div className="card-cyber p-4">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}
