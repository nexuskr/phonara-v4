import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Shield, Users, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import { MultiplierStormService } from '../domain/services/MultiplierStormService';
import NeonButton from '../components/ui/NeonButton';
import ConfettiBlast from '../components/ui/ConfettiBlast';

type GameStatus = 'waiting' | 'running' | 'crashed';

interface BetEntry {
  id: string;
  username: string;
  betAmount: number;
  cashoutMultiplier: number | null;
  payout: number | null;
  status: 'active' | 'won' | 'lost';
}

const RECENT_CRASHES = [1.23, 4.56, 1.01, 18.7, 2.34, 1.12, 67.3, 3.21, 1.04, 8.88, 2.0, 1.67, 1.01, 5.5, 234.2];
const stormService = new MultiplierStormService();

export default function CrashPage() {
  const { user, wallet, refreshWallet } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState<GameStatus>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(5);
  const [betAmount, setBetAmount] = useState('100');
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [useAutoCashout, setUseAutoCashout] = useState(false);
  const [, setBetId] = useState<string | null>(null);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null);
  const [payout, setPayout] = useState<number | null>(null);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [showFair, setShowFair] = useState(false);
  const [fairData, setFairData] = useState<{ serverSeedHash: string; clientSeed: string; roundId: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [, setRoundId] = useState<string | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>(RECENT_CRASHES);

  const multRef = useRef(1.0);
  const hasBetRef = useRef(false);
  const cashedOutRef = useRef(false);
  const autoCashoutRef = useRef('2.00');
  const useAutoCashoutRef = useRef(false);
  const crashPointRef = useRef(0);
  const serverSeedRef = useRef('');
  const roundIdRef = useRef<string | null>(null);
  const betIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDemoRef = useRef(true);

  const drawGraph = useCallback((mult: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(0,212,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 8, 0); ctx.lineTo(i * W / 8, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * H / 8); ctx.lineTo(W, i * H / 8); ctx.stroke();
    }

    if (mult <= 1.0) return;

    const maxDisplay = Math.max(5, mult * 1.2);
    const progress = Math.min(1, Math.log(mult) / Math.log(maxDisplay));
    const endX = W * 0.9 * progress;
    const endY = H - (H * 0.8 * progress);

    const grad = ctx.createLinearGradient(0, H, endX, endY);
    if (crashed) {
      grad.addColorStop(0, 'rgba(255,107,53,0.1)');
      grad.addColorStop(1, 'rgba(255,107,53,0.3)');
    } else {
      grad.addColorStop(0, 'rgba(0,212,255,0.05)');
      grad.addColorStop(1, 'rgba(0,255,136,0.2)');
    }

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.quadraticCurveTo(endX * 0.3, H * 0.95, endX, endY);
    ctx.lineTo(endX, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.quadraticCurveTo(endX * 0.3, H * 0.95, endX, endY);
    ctx.strokeStyle = crashed ? '#FF6B35' : '#00D4FF';
    ctx.lineWidth = 3;
    ctx.shadowColor = crashed ? '#FF6B35' : '#00D4FF';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(endX, endY, 6, 0, Math.PI * 2);
    ctx.fillStyle = crashed ? '#FF6B35' : '#00D4FF';
    ctx.shadowColor = crashed ? '#FF6B35' : '#00D4FF';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    drawGraph(multRef.current, status === 'crashed');
  }, [drawGraph, status]);

  const startRound = useCallback(async () => {
    setBets([]);
    setHasBet(false);
    hasBetRef.current = false;
    setCashedOut(false);
    cashedOutRef.current = false;
    setCashoutMultiplier(null);
    setPayout(null);
    setBetId(null);
    betIdRef.current = null;
    setMultiplier(1.0);
    multRef.current = 1.0;

    let cp = 2 + Math.random() * 8;
    let hash = '';
    let rId: string | null = null;
    let seed = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crash-start`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (resp.ok) {
          const result = await resp.json();
          cp = result.crashPoint;
          hash = result.serverSeedHash;
          rId = result.roundId;
          seed = '';
        }
      }
    } catch {
      // Fallback to client-side generation
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      seed = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(seed));
      hash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
    }

    crashPointRef.current = cp;
    serverSeedRef.current = seed;

    if (rId) {
      setRoundId(rId);
      roundIdRef.current = rId;
      setFairData({ serverSeedHash: hash, clientSeed: 'loavable2026', roundId: rId });
    } else {
      const { data: round } = await supabase.from('crash_rounds').insert({
        server_seed_hash: hash,
        client_seed: 'loavable2026',
        status: 'waiting',
      }).select().single();
      if (round) {
        setRoundId(round.id);
        roundIdRef.current = round.id;
        setFairData({ serverSeedHash: hash, clientSeed: 'loavable2026', roundId: round.id });
      }
    }

    setStatus('waiting');
    let c = 5;
    setCountdown(c);
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        runRound(cp);
      }
    }, 1000);

    const fakeBets: BetEntry[] = Array.from({ length: Math.floor(Math.random() * 8 + 4) }, (_, i) => ({
      id: `fake-${i}`,
      username: ['김민준','이서연','박지호','최유진','정도현','강지원','조서준','윤미래'][i % 8],
      betAmount: Math.floor(Math.random() * 500 + 50),
      cashoutMultiplier: null,
      payout: null,
      status: 'active',
    }));
    setBets(fakeBets);
  }, [drawGraph]);

  const runRound = useCallback((cp: number) => {
    setStatus('running');

    if (roundIdRef.current) {
      supabase.from('crash_rounds').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', roundIdRef.current);
    }

    stormService.start(
      cp,
      ({ multiplier: m }) => {
        multRef.current = m;
        setMultiplier(Number(m.toFixed(2)));
        drawGraph(m, false);

        if (useAutoCashoutRef.current && hasBetRef.current && !cashedOutRef.current) {
          const target = parseFloat(autoCashoutRef.current);
          if (m >= target) {
            doCashout(m);
          }
        }

        setBets(prev => prev.map(b => {
          if (b.status === 'active' && !b.id.startsWith('fake-') === false && Math.random() < 0.02 && m > 1.3) {
            return { ...b, status: 'won', cashoutMultiplier: m, payout: b.betAmount * m };
          }
          if (b.id.startsWith('fake-') && b.status === 'active' && Math.random() < 0.015 && m > 1.5) {
            return { ...b, status: 'won', cashoutMultiplier: m, payout: b.betAmount * m };
          }
          return b;
        }));
      },
      (finalMult) => {
        setStatus('crashed');
        drawGraph(finalMult, true);
        setMultiplier(finalMult);
        setCrashHistory(prev => [finalMult, ...prev.slice(0, 19)]);

        setBets(prev => prev.map(b => b.status === 'active' ? { ...b, status: 'lost' } : b));

        if (roundIdRef.current) {
          try {
            supabase.auth.getSession().then(({ data }) => {
              if (data.session?.access_token && serverSeedRef.current) {
                fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crash-end`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${data.session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    roundId: roundIdRef.current,
                    crashMultiplier: finalMult,
                    serverSeed: serverSeedRef.current,
                  }),
                }).catch(() => {});
              }
            });
          } catch {
            // Fallback: update directly
          }

          if (!serverSeedRef.current) {
            supabase.from('crash_rounds').update({
              status: 'crashed',
              crash_multiplier: finalMult,
              crashed_at: new Date().toISOString(),
            }).eq('id', roundIdRef.current);
          }
        }

        restartTimerRef.current = setTimeout(() => startRound(), 4000);
      }
    );
  }, [drawGraph, startRound]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startRound();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      stormService.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [startRound, resizeCanvas]);

  const doCashout = async (atMultiplier?: number) => {
    if (!user || !hasBetRef.current || cashedOutRef.current) return;
    const m = atMultiplier ?? multRef.current;
    const amount = parseFloat(betAmount);
    const win = amount * m;

    cashedOutRef.current = true;
    setCashedOut(true);
    setCashoutMultiplier(m);
    setPayout(win);

    if (win > amount) setShowConfetti(true);

    try {
      const { data: _newBalance } = await supabase.rpc('increment_balance', {
        p_user_id: user.id,
        p_amount: win,
        p_is_demo: isDemoRef.current,
      });

      if (betIdRef.current) {
        await supabase.from('crash_bets').update({ status: 'won', cashout_multiplier: m, payout: win }).eq('id', betIdRef.current);
      }

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'win',
        amount: win,
        currency: 'USDT',
        reference_id: betIdRef.current,
        reference_type: 'crash_cashout',
        is_demo: isDemoRef.current,
      });
    } catch (err) {
      console.error('Cashout error:', err);
    }

    setBets(prev => prev.map(b => b.username === '나' ? { ...b, status: 'won', cashoutMultiplier: m, payout: win } : b));
    refreshWallet();
  };

  const handlePlaceBet = async () => {
    if (!user || !wallet || hasBetRef.current || status !== 'waiting') return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;

    const isDemo = wallet.is_demo_mode;
    isDemoRef.current = isDemo;

    try {
      const { data: newBalance } = await supabase.rpc('decrement_balance', {
        p_user_id: user.id,
        p_amount: amount,
        p_is_demo: isDemo,
      });

      if (newBalance === null) {
        alert('잔고가 부족합니다');
        return;
      }

      const { data: bet } = await supabase.from('crash_bets').insert({
        round_id: roundIdRef.current ?? crypto.randomUUID(),
        user_id: user.id,
        username: 'you',
        bet_amount: amount,
        auto_cashout: useAutoCashout ? parseFloat(autoCashout) : null,
        status: 'active',
        is_demo: isDemo,
      }).select().single();

      if (bet) {
        setBetId(bet.id);
        betIdRef.current = bet.id;
      }

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bet',
        amount: -amount,
        currency: 'USDT',
        reference_id: bet?.id,
        reference_type: 'crash_bet',
        is_demo: isDemo,
      });

      hasBetRef.current = true;
      setHasBet(true);
      setBets(prev => [{
        id: bet?.id ?? 'you',
        username: '나',
        betAmount: amount,
        cashoutMultiplier: null,
        payout: null,
        status: 'active',
      }, ...prev]);
      refreshWallet();
    } catch (err) {
      console.error('Bet error:', err);
      alert('베팅에 실패했습니다');
    }
  };

  useEffect(() => {
    hasBetRef.current = hasBet;
    cashedOutRef.current = cashedOut;
    autoCashoutRef.current = autoCashout;
    useAutoCashoutRef.current = useAutoCashout;
  }, [hasBet, cashedOut, autoCashout, useAutoCashout]);

  const multiplierColor = status === 'crashed'
    ? '#FF6B35'
    : multiplier >= 5 ? '#FFD700'
    : multiplier >= 2 ? '#00FF88'
    : '#00D4FF';

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-16">
      <ConfettiBlast active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {showFair && fairData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowFair(false)}>
          <div className="glass max-w-sm mx-4 rounded-2xl p-6 animate-fade-in-scale border border-[rgba(0,212,255,0.3)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#00D4FF]" />
              <h3 className="font-black text-[var(--text-primary)]">공정성 검증</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)] mb-1">서버 시드 해시</p>
                <code className="block bg-[rgba(0,0,0,0.4)] px-3 py-2 rounded-lg text-[#00D4FF] text-xs break-all">{fairData.serverSeedHash}</code>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-1">클라이언트 시드</p>
                <code className="block bg-[rgba(0,0,0,0.4)] px-3 py-2 rounded-lg text-[#00FF88] text-xs">{fairData.clientSeed}</code>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-1">라운드 ID</p>
                <code className="block bg-[rgba(0,0,0,0.4)] px-3 py-2 rounded-lg text-[var(--text-secondary)] text-xs break-all">{fairData.roundId}</code>
              </div>
              <p className="text-[var(--text-muted)] text-xs leading-relaxed">라운드 종료 후 서버 시드가 공개됩니다. HMAC-SHA256으로 결과를 직접 검증할 수 있습니다.</p>
            </div>
            <NeonButton variant="ghost" size="sm" className="w-full mt-4" onClick={() => setShowFair(false)}>닫기</NeonButton>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#FF6B35] fill-current" />
            <h1 className="text-xl font-black text-[var(--text-primary)]">크래시 게임</h1>
            <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              status === 'waiting' ? 'bg-[rgba(255,215,0,0.2)] text-[#FFD700]'
              : status === 'running' ? 'bg-[rgba(0,255,136,0.2)] text-[#00FF88]'
              : 'bg-[rgba(255,107,53,0.2)] text-[#FF6B35]'
            }`}>
              {status === 'waiting' ? `${countdown}초 후 시작` : status === 'running' ? '진행중' : '크래시!'}
            </div>
          </div>
          <button onClick={() => setShowFair(true)} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[#00D4FF] transition-colors">
            <Shield className="w-3.5 h-3.5" /> 공정성 검증
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0">최근</span>
          {crashHistory.slice(0, 15).map((c, i) => (
            <div key={i} className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${
              c >= 10 ? 'bg-[rgba(255,215,0,0.2)] text-[#FFD700]'
              : c >= 2 ? 'bg-[rgba(0,255,136,0.15)] text-[#00FF88]'
              : 'bg-[rgba(255,107,53,0.15)] text-[#FF6B35]'
            }`}>
              {c}x
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden mb-4"
              style={{ background: 'linear-gradient(135deg, #060D1A, #0A1628)', height: 280, border: '1px solid rgba(0,212,255,0.1)' }}>
              <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-6xl sm:text-7xl font-black transition-all duration-100"
                    style={{ color: multiplierColor, textShadow: `0 0 20px ${multiplierColor}, 0 0 40px ${multiplierColor}` }}>
                    {multiplier.toFixed(2)}x
                  </div>
                  {status === 'crashed' && (
                    <div className="text-[#FF6B35] font-bold text-lg mt-2 animate-slide-in-up">
                      CRASHED @ {multiplier.toFixed(2)}x
                    </div>
                  )}
                  {status === 'waiting' && (
                    <div className="text-[#FFD700] text-base mt-2">{countdown}초 후 시작</div>
                  )}
                  {cashedOut && cashoutMultiplier && (
                    <div className="mt-2 animate-slide-in-up">
                      <div className="text-[#00FF88] font-black text-2xl neon-text-green">+${payout?.toFixed(2)} 획득!</div>
                      <div className="text-[#00FF88] text-sm">{cashoutMultiplier.toFixed(2)}x에서 캐시아웃</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-4 border border-[rgba(0,212,255,0.1)]">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">베팅 금액 (USDT)</label>
                  <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)}
                    className="input-cyber w-full px-3 py-2.5 text-sm" disabled={hasBet} />
                  <div className="flex gap-1 mt-1">
                    {[50, 100, 250, 500].map(v => (
                      <button key={v} onClick={() => setBetAmount(String(v))} disabled={hasBet}
                        className="text-xs px-2 py-1 rounded-lg bg-[rgba(0,212,255,0.08)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.15)] transition-all disabled:opacity-40">
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-xs text-[var(--text-muted)]">자동 캐시아웃</label>
                    <button onClick={() => setUseAutoCashout(!useAutoCashout)}
                      className={`w-8 h-4 rounded-full transition-all ${useAutoCashout ? 'bg-[#00D4FF]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white ml-0.5 transition-all ${useAutoCashout ? 'translate-x-3.5' : ''}`} />
                    </button>
                  </div>
                  <input type="number" value={autoCashout} onChange={e => setAutoCashout(e.target.value)}
                    className="input-cyber w-full px-3 py-2.5 text-sm" disabled={!useAutoCashout || hasBet} step="0.1" />
                </div>
              </div>

              <div className="flex gap-3">
                {!hasBet ? (
                  <NeonButton variant="success" size="lg" className="flex-1" onClick={handlePlaceBet}
                    disabled={status === 'crashed' || !user}>
                    {status === 'waiting' ? `베팅 (${countdown}초)` : '베팅 불가'}
                  </NeonButton>
                ) : !cashedOut ? (
                  <NeonButton variant={status === 'running' ? 'danger' : 'ghost'} size="lg" className="flex-1"
                    onClick={() => doCashout()} disabled={status !== 'running'}>
                    {status === 'running'
                      ? `캐시아웃 @ ${multRef.current.toFixed(2)}x (+$${(parseFloat(betAmount) * multRef.current - parseFloat(betAmount)).toFixed(2)})`
                      : status === 'waiting' ? '라운드 대기중' : '크래시됨'}
                  </NeonButton>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-4 rounded-xl bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)]">
                    <span className="text-[#00FF88] font-bold">+${payout?.toFixed(2)} 적립 완료!</span>
                  </div>
                )}
              </div>

              {!user && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#FFD700]">
                  <AlertTriangle className="w-3 h-3" /> 로그인 후 베팅 가능합니다
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border border-[rgba(0,212,255,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">베팅 현황</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{bets.length}명</span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {bets.map(b => (
                <div key={b.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                  b.status === 'won' ? 'bg-[rgba(0,255,136,0.08)]'
                  : b.status === 'lost' ? 'bg-[rgba(255,107,53,0.06)]'
                  : 'bg-[rgba(0,212,255,0.04)]'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      b.status === 'won' ? 'bg-[#00FF88]' : b.status === 'lost' ? 'bg-[#FF6B35]' : 'bg-[#00D4FF] animate-pulse'
                    }`} />
                    <span className="text-[var(--text-secondary)]">{b.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[var(--text-primary)]">${b.betAmount}</div>
                    {b.status === 'won' && b.cashoutMultiplier && (
                      <div className="text-[#00FF88]">{b.cashoutMultiplier.toFixed(2)}x</div>
                    )}
                    {b.status === 'lost' && <div className="text-[#FF6B35]">bust</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[rgba(0,212,255,0.08)] grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-black text-[#00D4FF]">
                  ${bets.reduce((s, b) => s + b.betAmount, 0).toLocaleString()}
                </div>
                <div className="text-xs text-[var(--text-muted)]">총 베팅</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-[#00FF88]">
                  {bets.filter(b => b.status === 'won').length}명
                </div>
                <div className="text-xs text-[var(--text-muted)]">캐시아웃</div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-[var(--text-muted)]">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#00D4FF]" />
              <span>RTP 96% / 최대 1,000x / 하우스 엣지 4%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
