import { useState, useRef, useCallback, useEffect } from 'react';
import { Layers, Play, RotateCcw, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import NeonButton from '../components/ui/NeonButton';
import ConfettiBlast from '../components/ui/ConfettiBlast';

type Theme = 'classic' | 'crypto' | 'neon' | 'dragon';

interface SlotTheme {
  id: Theme;
  name: string;
  emoji: string[];
  color: string;
  bg: string;
  border: string;
  rtp: number;
  volatility: string;
}

const THEMES: SlotTheme[] = [
  { id: 'classic', name: '클래식 프루트', emoji: ['🍒','🍋','🍇','🍊','🔔','⭐','7️⃣','💎'], color: '#FFD700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.3)', rtp: 96.5, volatility: '낮음' },
  { id: 'crypto', name: '크립토 젬스', emoji: ['₿','⟠','◎','◈','⬡','✦','🔷','💰'], color: '#00D4FF', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.3)', rtp: 97.0, volatility: '중간' },
  { id: 'neon', name: '네온 나이츠', emoji: ['⚡','🌙','💫','🎆','🎇','✨','🌟','🎯'], color: '#00FF88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.3)', rtp: 96.8, volatility: '높음' },
  { id: 'dragon', name: '골든 드래곤', emoji: ['🐉','🔥','💎','👑','⚔️','🌸','🎋','🏆'], color: '#FF6B35', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.3)', rtp: 95.5, volatility: '매우 높음' },
];

const ROWS = 3;
const COLS = 5;

const PAYLINE_PATTERNS = [
  { name: '가로 상', cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
  { name: '가로 중', cells: [[1,0],[1,1],[1,2],[1,3],[1,4]] },
  { name: '가로 하', cells: [[2,0],[2,1],[2,2],[2,3],[2,4]] },
  { name: 'V자', cells: [[0,0],[1,1],[2,2],[1,3],[0,4]] },
  { name: '역V자', cells: [[2,0],[1,1],[0,2],[1,3],[2,4]] },
  { name: '대각선 ↘', cells: [[0,0],[0,1],[1,2],[2,3],[2,4]] },
  { name: '대각선 ↗', cells: [[2,0],[2,1],[1,2],[0,3],[0,4]] },
  { name: '지그재그 상', cells: [[0,0],[1,1],[0,2],[1,3],[0,4]] },
  { name: '지그재그 하', cells: [[2,0],[1,1],[2,2],[1,3],[2,4]] },
];

function computePaylines(reels: string[][]): { winLines: number[]; payout: number; isJackpot: boolean } {
  const winLineIndices: number[] = [];
  let totalPayout = 0;
  let isJackpot = false;

  for (let pi = 0; pi < PAYLINE_PATTERNS.length; pi++) {
    const pattern = PAYLINE_PATTERNS[pi];
    const symbols = pattern.cells.map(([r, c]) => reels[c][r]);
    const first = symbols[0];
    let count = 0;
    for (const sym of symbols) {
      if (sym === first) count++;
      else break;
    }
    if (count >= 3) {
      winLineIndices.push(pi);
      const mult = count >= 5 ? 50 : count >= 4 ? 10 : 2;
      totalPayout += mult;
      if (count === 5) isJackpot = true;
    }
  }

  return { winLines: winLineIndices, payout: totalPayout, isJackpot };
}

export default function SlotsPage() {
  const { user, wallet, refreshWallet } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState<Theme>('classic');
  const [reels, setReels] = useState<string[][]>(() =>
    Array.from({ length: COLS }, () =>
      Array.from({ length: ROWS }, () => THEMES[0].emoji[Math.floor(Math.random() * THEMES[0].emoji.length)])
    )
  );
  const [spinning, setSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState('10');
  const [autoSpin, setAutoSpin] = useState(false);
  const autoSpinRef = useRef(false);
  const [winLines, setWinLines] = useState<number[]>([]);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [isJackpot, setIsJackpot] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinHistory, setSpinHistory] = useState<{ payout: number; mult: number }[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [totalBet, setTotalBet] = useState(0);
  const [jackpotPool, setJackpotPool] = useState(50000);
  const [spinningCols, setSpinningCols] = useState<Set<number>>(new Set());

  const theme = THEMES.find(t => t.id === selectedTheme) ?? THEMES[0];

  useEffect(() => {
    supabase.from('global_stats').select('jackpot_pool').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setJackpotPool(Number(data.jackpot_pool));
    });
  }, []);

  const spin = useCallback(async () => {
    if (spinning || !user || !wallet) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;

    const isDemo = wallet.is_demo_mode;

    try {
      const { data: newBalance } = await supabase.rpc('decrement_balance', {
        p_user_id: user.id,
        p_amount: amount,
        p_is_demo: isDemo,
      });
      if (newBalance === null) {
        if (autoSpinRef.current) {
          setAutoSpin(false);
          autoSpinRef.current = false;
        }
        return;
      }
    } catch {
      if (autoSpinRef.current) {
        setAutoSpin(false);
        autoSpinRef.current = false;
      }
      return;
    }

    setSpinning(true);
    setWinLines([]);
    setLastPayout(null);
    setIsJackpot(false);
    setTotalBet(p => p + amount);

    const finalReels: string[][] = Array.from({ length: COLS }, () =>
      Array.from({ length: ROWS }, () => theme.emoji[Math.floor(Math.random() * theme.emoji.length)])
    );

    if (Math.random() < 0.005) {
      const jackpotSym = theme.emoji[0];
      for (let c = 0; c < COLS; c++) finalReels[c] = [jackpotSym, jackpotSym, jackpotSym];
    }

    for (let col = 0; col < COLS; col++) {
      setSpinningCols(prev => new Set(prev).add(col));
      await new Promise(r => setTimeout(r, 200 + col * 200));
      setReels(prev => {
        const next = prev.map(c => [...c]);
        next[col] = finalReels[col];
        return next;
      });
      setSpinningCols(prev => {
        const next = new Set(prev);
        next.delete(col);
        return next;
      });
    }

    const { winLines: lines, payout: payMult, isJackpot: jackpot } = computePaylines(finalReels);
    const winAmount = amount * payMult;

    setWinLines(lines);
    setLastPayout(winAmount);
    setIsJackpot(jackpot);
    if (winAmount > 0) setTotalWon(p => p + winAmount);
    setSpinHistory(prev => [{ payout: winAmount, mult: payMult }, ...prev.slice(0, 19)]);

    if (jackpot) {
      setShowConfetti(true);
      const jpWin = jackpotPool;
      try {
        await supabase.rpc('increment_balance', { p_user_id: user.id, p_amount: jpWin, p_is_demo: isDemo });
        await supabase.from('global_stats').update({ jackpot_pool: 50000 }).eq('id', 1);
        setJackpotPool(50000);
      } catch { /* fallback */ }
    } else if (winAmount > 0) {
      try {
        await supabase.rpc('increment_balance', { p_user_id: user.id, p_amount: winAmount, p_is_demo: isDemo });
      } catch { /* fallback */ }
    }

    await supabase.from('slot_spins').insert({
      user_id: user.id,
      theme: selectedTheme,
      bet_amount: amount,
      result_reels: finalReels,
      payout: winAmount,
      win_lines: lines,
      is_jackpot: jackpot,
      is_demo: isDemo,
    });

    if (winAmount > 0) {
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'win',
        amount: winAmount,
        currency: 'USDT',
        reference_type: 'slot_spin',
        is_demo: isDemo,
      });
    }

    refreshWallet();
    setSpinning(false);

    if (autoSpinRef.current) {
      setTimeout(() => {
        if (autoSpinRef.current) spin();
      }, 800);
    }
  }, [spinning, user, wallet, betAmount, selectedTheme, theme, jackpotPool, refreshWallet]);

  const toggleAutoSpin = () => {
    const next = !autoSpin;
    setAutoSpin(next);
    autoSpinRef.current = next;
    if (next && !spinning) spin();
  };

  const isCellOnWinLine = (row: number, col: number): boolean => {
    for (const lineIdx of winLines) {
      const pattern = PAYLINE_PATTERNS[lineIdx];
      for (const [r, c] of pattern.cells) {
        if (r === row && c === col) return true;
      }
    }
    return false;
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-16">
      <ConfettiBlast active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {isJackpot && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-scale">
          <div className="text-center p-8">
            <div className="text-8xl mb-4 animate-float">🏆</div>
            <div className="text-5xl font-black neon-text-gold text-[#FFD700] mb-2">JACKPOT!</div>
            <div className="text-3xl font-black text-[#00FF88]">+${jackpotPool.toLocaleString()}</div>
            <NeonButton variant="gold" size="lg" className="mt-6" onClick={() => setIsJackpot(false)}>수령하기!</NeonButton>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-5 h-5 text-[#FFD700]" />
          <h1 className="text-xl font-black text-[var(--text-primary)]">슬롯 머신</h1>
          <div className="px-2 py-0.5 rounded-full bg-[rgba(255,215,0,0.15)] text-[#FFD700] text-xs font-bold">RTP {theme.rtp}%</div>
          <div className="ml-auto px-3 py-1 rounded-full bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] text-[#FFD700] text-xs font-bold">
            잭팫 ${jackpotPool.toLocaleString()}
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setSelectedTheme(t.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                selectedTheme === t.id ? 'border-current shadow-[0_0_15px_currentColor]' : 'border-[rgba(255,255,255,0.08)] text-[var(--text-muted)]'
              }`}
              style={selectedTheme === t.id ? { color: t.color, borderColor: t.color, background: t.bg } : {}}>
              {t.name}
            </button>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 mb-6 border" style={{ borderColor: theme.border }}>
          <div className="relative mb-6">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {reels.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-2">
                  {col.map((sym, ri) => {
                    const isWin = isCellOnWinLine(ri, ci) && !spinning;
                    const isSpinningCol = spinningCols.has(ci);
                    return (
                      <div key={ri}
                        className={`aspect-square flex items-center justify-center rounded-xl text-3xl sm:text-4xl transition-all duration-300 ${
                          isSpinningCol ? 'scale-90 blur-[1px]' : 'scale-100 blur-0'
                        } ${isWin ? 'ring-2 scale-110' : ''}`}
                        style={{
                          background: isWin ? theme.bg : 'rgba(0,0,0,0.3)',
                          borderColor: isWin ? theme.color : 'transparent',
                          boxShadow: isWin ? `0 0 15px ${theme.color}` : 'none',
                          transition: 'all 0.3s ease',
                        }}>
                        {sym}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {lastPayout !== null && !spinning && lastPayout > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="glass px-6 py-4 rounded-2xl text-center border animate-fade-in-scale" style={{ borderColor: theme.color }}>
                  <div className="text-3xl font-black" style={{ color: theme.color }}>+${lastPayout.toFixed(2)}</div>
                  <div className="text-sm text-[var(--text-secondary)]">WIN! ({winLines.length} 페이라인)</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">베팅 금액</label>
              <div className="flex gap-2">
                <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)}
                  className="input-cyber flex-1 px-3 py-2.5 text-base" disabled={spinning || autoSpin} />
                <div className="flex gap-1">
                  {[5, 10, 25, 50].map(v => (
                    <button key={v} onClick={() => setBetAmount(String(v))} disabled={spinning || autoSpin}
                      className="px-2 py-2 text-xs rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-40">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <NeonButton variant="primary" size="lg" onClick={spin} loading={spinning} disabled={!user || autoSpin} className="px-8">
                <Play className="w-5 h-5" /> 스핀
              </NeonButton>
              <button onClick={toggleAutoSpin} disabled={!user}
                className={`px-4 py-3.5 rounded-xl font-bold text-sm transition-all border ${
                  autoSpin ? 'bg-[rgba(255,107,53,0.2)] border-[#FF6B35] text-[#FF6B35]' : 'border-[rgba(0,212,255,0.3)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.1)]'
                }`}>
                {autoSpin ? <RotateCcw className="w-5 h-5 animate-spin" /> : 'AUTO'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-cyber p-4 text-center">
            <div className="text-lg font-black text-[var(--text-primary)]">${totalBet.toFixed(0)}</div>
            <div className="text-xs text-[var(--text-muted)]">총 베팅</div>
          </div>
          <div className="card-cyber p-4 text-center">
            <div className="text-lg font-black text-[#00FF88]">${totalWon.toFixed(0)}</div>
            <div className="text-xs text-[var(--text-muted)]">총 획득</div>
          </div>
          <div className="card-cyber p-4 text-center">
            <div className={`text-lg font-black ${totalWon - totalBet >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
              ${(totalWon - totalBet).toFixed(0)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">순손익</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4 border border-[rgba(0,212,255,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">페이테이블</span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { match: '5개 일치', mult: '50x', color: '#FFD700' },
                { match: '4개 일치', mult: '10x', color: '#00FF88' },
                { match: '3개 일치', mult: '2x', color: '#00D4FF' },
              ].map(row => (
                <div key={row.match} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(0,0,0,0.2)]">
                  <span className="text-[var(--text-secondary)]">{row.match}</span>
                  <span className="font-black" style={{ color: row.color }}>{row.mult}</span>
                </div>
              ))}
              <div className="text-xs text-[var(--text-muted)] mt-2">
                {PAYLINE_PATTERNS.length}개 페이라인 / RTP {theme.rtp}% / 변동성: {theme.volatility}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 border border-[rgba(0,212,255,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">스핀 기록</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {spinHistory.length === 0 && <div className="text-xs text-[var(--text-muted)] text-center py-4">스핀 기록 없음</div>}
              {spinHistory.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-[var(--text-muted)]">#{spinHistory.length - i}</span>
                  <span className={s.payout > 0 ? 'text-[#00FF88] font-bold' : 'text-[#FF6B35]'}>
                    {s.payout > 0 ? `+$${s.payout.toFixed(2)} (${s.mult}x)` : '미스'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
