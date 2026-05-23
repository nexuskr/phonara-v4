import { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart2, DollarSign, AlertTriangle, X } from 'lucide-react';
import NeonButton from '../components/ui/NeonButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';

interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Position {
  id: string;
  pair: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  leverage: number;
  liqPrice: number;
  pnl: number;
  pnlPercent: number;
  isDemo: boolean;
}

interface OrderBook {
  asks: [number, number][];
  bids: [number, number][];
}

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ARB/USDT'];
const BASE_PRICES: Record<string, number> = { 'BTC/USDT': 67450, 'ETH/USDT': 3820, 'SOL/USDT': 184, 'BNB/USDT': 612, 'ARB/USDT': 1.24 };

function generateOHLC(base: number, count: number): OHLC[] {
  const candles: OHLC[] = [];
  let price = base;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.48) * price * 0.015;
    const open = price;
    price += change;
    const high = Math.max(open, price) * (1 + Math.random() * 0.005);
    const low = Math.min(open, price) * (1 - Math.random() * 0.005);
    const volume = Math.floor(Math.random() * 500000 + 50000);
    candles.push({ time: now - i * 60000, open, high, low, close: price, volume });
  }
  return candles;
}

function drawChart(canvas: HTMLCanvasElement, candles: OHLC[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  if (!candles.length) { ctx.restore(); return; }

  const priceMin = Math.min(...candles.map(c => c.low));
  const priceMax = Math.max(...candles.map(c => c.high));
  const priceRange = priceMax - priceMin || 1;
  const candleWidth = (W - 60) / candles.length;
  const chartH = H - 30;
  const priceToY = (p: number) => chartH - ((p - priceMin) / priceRange) * (chartH - 20) - 10;

  ctx.strokeStyle = 'rgba(0,212,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const y = (chartH / 6) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    const price = priceMax - (priceRange / 6) * i;
    ctx.fillStyle = 'rgba(0,212,255,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText(price.toFixed(0), W - 55, y + 4);
  }

  candles.forEach((c, i) => {
    const x = i * candleWidth + 5;
    const isUp = c.close >= c.open;
    const color = isUp ? '#00FF88' : '#FF6B35';
    ctx.strokeStyle = color;
    ctx.fillStyle = isUp ? 'rgba(0,255,136,0.7)' : 'rgba(255,107,53,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, priceToY(c.high));
    ctx.lineTo(x + candleWidth / 2, priceToY(c.low));
    ctx.stroke();
    const bodyTop = priceToY(Math.max(c.open, c.close));
    const bodyH = Math.max(1, Math.abs(priceToY(c.open) - priceToY(c.close)));
    ctx.fillRect(x + 1, bodyTop, candleWidth - 3, bodyH);
  });

  const lastClose = candles[candles.length - 1].close;
  const ly = priceToY(lastClose);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(0,212,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W - 60, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#00D4FF';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(lastClose.toFixed(1), W - 55, ly + 4);
  ctx.restore();
}

export default function TradingPage() {
  const { user, wallet, refreshWallet } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [candles, setCandles] = useState<OHLC[]>(() => generateOHLC(BASE_PRICES['BTC/USDT'], 60));
  const [price, setPrice] = useState(BASE_PRICES['BTC/USDT']);
  const [priceChange, setPriceChange] = useState(2.34);
  const [orderSide, setOrderSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [orderSize, setOrderSize] = useState('100');
  const [leverage, setLeverage] = useState(10);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeTab, setActiveTab] = useState<'chart' | 'orderbook' | 'positions'>('chart');
  const [orderBook, setOrderBook] = useState<OrderBook>({ asks: [], bids: [] });
  const candleCountRef = useRef(60);

  const generateOrderBook = useCallback((p: number) => {
    const asks: [number, number][] = Array.from({ length: 12 }, (_, i) => [p * (1 + (i + 1) * 0.0002), Math.floor(Math.random() * 10000 + 100)]);
    const bids: [number, number][] = Array.from({ length: 12 }, (_, i) => [p * (1 - (i + 1) * 0.0002), Math.floor(Math.random() * 10000 + 100)]);
    return { asks, bids };
  }, []);

  useEffect(() => {
    const base = BASE_PRICES[selectedPair];
    setCandles(generateOHLC(base, 60));
    setPrice(base);
    setPriceChange(0);
    setOrderBook(generateOrderBook(base));
    candleCountRef.current = 60;
  }, [selectedPair, generateOrderBook]);

  useEffect(() => {
    let tickCount = 0;
    const interval = setInterval(() => {
      tickCount++;
      setPrice(p => {
        const delta = (Math.random() - 0.48) * p * 0.001;
        const np = p + delta;
        setPriceChange(prev => prev + (Math.random() - 0.5) * 0.05);

        setCandles(prev => {
          const last = prev[prev.length - 1];
          let updated = [...prev.slice(0, -1), { ...last, close: np, high: Math.max(last.high, np), low: Math.min(last.low, np) }];

          if (tickCount % 60 === 0) {
            candleCountRef.current++;
            updated.push({
              time: Date.now(),
              open: np,
              high: np,
              low: np,
              close: np,
              volume: Math.floor(Math.random() * 500000 + 50000),
            });
            if (updated.length > 80) updated = updated.slice(updated.length - 80);
          }
          return updated;
        });

        setPositions(prev => prev.map(pos => {
          const priceDiff = pos.side === 'long' ? np - pos.entryPrice : pos.entryPrice - np;
          const pnl = (priceDiff / pos.entryPrice) * pos.size * pos.leverage;
          const pnlPercent = (priceDiff / pos.entryPrice) * pos.leverage * 100;
          return { ...pos, pnl, pnlPercent };
        }));

        setOrderBook(generateOrderBook(np));
        return np;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [generateOrderBook, selectedPair]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    drawChart(canvas, candles);
  }, [candles]);

  useEffect(() => {
    if (!user) return;
    const liquidated = positions.filter(pos => {
      return (pos.side === 'long' && price <= pos.liqPrice) || (pos.side === 'short' && price >= pos.liqPrice);
    });
    if (liquidated.length > 0) {
      for (const pos of liquidated) {
        supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bet',
          amount: -pos.size,
          currency: 'USDT',
          reference_type: 'liquidation',
          is_demo: pos.isDemo,
        }).then(() => {});
      }
      setPositions(prev => prev.filter(pos => {
        const isLiq = (pos.side === 'long' && price <= pos.liqPrice) || (pos.side === 'short' && price >= pos.liqPrice);
        return !isLiq;
      }));
    }
  }, [price, positions, user]);

  const handleOrder = async () => {
    if (!user || !wallet) return;
    const size = parseFloat(orderSize);
    if (isNaN(size) || size <= 0) return;
    const isDemo = wallet.is_demo_mode;
    const margin = size / leverage;

    try {
      const { data: newBalance } = await supabase.rpc('decrement_balance', {
        p_user_id: user.id,
        p_amount: margin,
        p_is_demo: isDemo,
      });
      if (newBalance === null) {
        alert('잔고가 부족합니다');
        return;
      }
    } catch {
      alert('주문 실패: 잔고 부족');
      return;
    }

    const liqDist = price * (0.8 / leverage);
    const liqPrice = orderSide === 'long' ? price - liqDist : price + liqDist;

    const position: Position = {
      id: crypto.randomUUID(),
      pair: selectedPair,
      side: orderSide,
      size: margin,
      entryPrice: price,
      leverage,
      liqPrice,
      pnl: 0,
      pnlPercent: 0,
      isDemo,
    };
    setPositions(prev => [position, ...prev]);

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'bet',
      amount: -margin,
      currency: 'USDT',
      reference_type: 'trading_open',
      is_demo: isDemo,
    });

    refreshWallet();
  };

  const closePosition = async (pos: Position) => {
    if (!user) return;
    const credit = pos.size + pos.pnl;

    try {
      if (credit > 0) {
        await supabase.rpc('increment_balance', {
          p_user_id: user.id,
          p_amount: credit,
          p_is_demo: pos.isDemo,
        });
      }

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: pos.pnl >= 0 ? 'win' : 'bet',
        amount: Math.abs(credit),
        currency: 'USDT',
        reference_type: 'trading_close',
        is_demo: pos.isDemo,
      });
    } catch (err) {
      console.error('Close position error:', err);
    }

    setPositions(prev => prev.filter(p => p.id !== pos.id));
    refreshWallet();
  };

  const maxAsk = Math.max(...orderBook.asks.map(a => a[1]), 1);
  const maxBid = Math.max(...orderBook.bids.map(b => b[1]), 1);

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-16">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2">
          {PAIRS.map(pair => (
            <button key={pair} onClick={() => setSelectedPair(pair)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                selectedPair === pair ? 'bg-[rgba(0,212,255,0.15)] border-[#00D4FF] text-[#00D4FF]' : 'border-[rgba(255,255,255,0.08)] text-[var(--text-muted)]'
              }`}>
              {pair}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl p-4 mb-4 border border-[rgba(0,212,255,0.1)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-3xl font-black text-[var(--text-primary)]">
                ${price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${priceChange >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              {[
                { label: '24h 고가', value: `$${(price * 1.03).toFixed(0)}`, color: 'text-[#00FF88]' },
                { label: '24h 저가', value: `$${(price * 0.97).toFixed(0)}`, color: 'text-[#FF6B35]' },
                { label: '24h 거래량', value: '42.7B', color: 'text-[var(--text-secondary)]' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-[var(--text-muted)] text-xs mb-0.5">{item.label}</div>
                  <div className={`font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-4 md:hidden">
          {(['chart', 'orderbook', 'positions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-[rgba(0,212,255,0.2)] text-[#00D4FF]' : 'text-[var(--text-muted)]'}`}>
              {tab === 'chart' ? '차트' : tab === 'orderbook' ? '오더북' : '포지션'}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className={`md:col-span-2 lg:col-span-2 ${activeTab !== 'chart' && 'hidden md:block'}`}>
            <div className="glass rounded-2xl overflow-hidden border border-[rgba(0,212,255,0.08)]" style={{ height: 320 }}>
              <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
            </div>

            <div className={`mt-4 ${activeTab !== 'positions' && 'hidden md:block'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">내 포지션</span>
                <span className="text-xs text-[var(--text-muted)]">{positions.length}개</span>
              </div>
              {positions.length === 0 ? (
                <div className="glass rounded-xl p-4 text-center text-sm text-[var(--text-muted)] border border-[rgba(0,212,255,0.05)]">열린 포지션 없음</div>
              ) : (
                <div className="space-y-2">
                  {positions.map(pos => (
                    <div key={pos.id} className={`glass rounded-xl p-3 border ${pos.pnl >= 0 ? 'border-[rgba(0,255,136,0.2)]' : 'border-[rgba(255,107,53,0.2)]'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-0.5 rounded text-xs font-bold ${pos.side === 'long' ? 'bg-[rgba(0,255,136,0.15)] text-[#00FF88]' : 'bg-[rgba(255,107,53,0.15)] text-[#FF6B35]'}`}>
                            {pos.side === 'long' ? '롱' : '숏'} {pos.leverage}x
                          </div>
                          <span className="text-sm font-bold text-[var(--text-primary)]">{pos.pair}</span>
                        </div>
                        <button onClick={() => closePosition(pos)} className="text-[var(--text-muted)] hover:text-[#FF6B35] transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <div>
                          <span className="text-[var(--text-muted)]">진입 </span>
                          <span className="font-bold">${pos.entryPrice.toFixed(1)}</span>
                          <span className="text-[var(--text-muted)] ml-2">청산 </span>
                          <span className="text-[#FF6B35] font-bold">${pos.liqPrice.toFixed(1)}</span>
                        </div>
                        <div className={`font-black ${pos.pnl >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${activeTab !== 'orderbook' && 'hidden md:block'}`}>
            <div className="glass rounded-2xl p-4 border border-[rgba(0,212,255,0.08)]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">오더북</span>
              </div>
              <div className="text-xs text-[var(--text-muted)] flex justify-between mb-2 px-1"><span>가격</span><span>수량</span></div>
              <div className="space-y-0.5 mb-2">
                {orderBook.asks.slice(0, 8).reverse().map(([p, q], i) => (
                  <div key={i} className="relative flex justify-between text-xs px-2 py-1 rounded overflow-hidden">
                    <div className="absolute inset-0 right-0" style={{ width: `${(q / maxAsk) * 100}%`, background: 'rgba(255,107,53,0.08)', marginLeft: 'auto' }} />
                    <span className="relative text-[#FF6B35] font-mono">{p.toFixed(1)}</span>
                    <span className="relative text-[var(--text-muted)]">{q.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="text-center text-sm font-black text-[var(--text-primary)] py-1.5 border-y border-[rgba(0,212,255,0.1)]">${price.toFixed(1)}</div>
              <div className="space-y-0.5 mt-2">
                {orderBook.bids.slice(0, 8).map(([p, q], i) => (
                  <div key={i} className="relative flex justify-between text-xs px-2 py-1 rounded overflow-hidden">
                    <div className="absolute inset-0" style={{ width: `${(q / maxBid) * 100}%`, background: 'rgba(0,255,136,0.08)' }} />
                    <span className="relative text-[#00FF88] font-mono">{p.toFixed(1)}</span>
                    <span className="relative text-[var(--text-muted)]">{q.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${activeTab !== 'chart' && activeTab !== 'positions' && 'hidden md:block'}`}>
            <div className="glass rounded-2xl p-4 border border-[rgba(0,212,255,0.08)]">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">주문 입력</span>
              </div>

              <div className="flex gap-2 mb-4">
                {(['long', 'short'] as const).map(side => (
                  <button key={side} onClick={() => setOrderSide(side)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                      orderSide === side
                        ? side === 'long' ? 'bg-[rgba(0,255,136,0.2)] text-[#00FF88] border border-[#00FF88]' : 'bg-[rgba(255,107,53,0.2)] text-[#FF6B35] border border-[#FF6B35]'
                        : 'text-[var(--text-muted)] border border-[rgba(255,255,255,0.08)]'
                    }`}>
                    {side === 'long' ? '▲ 롱' : '▼ 숏'}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 mb-4">
                {(['market', 'limit', 'stop'] as const).map(t => (
                  <button key={t} onClick={() => setOrderType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${orderType === t ? 'bg-[rgba(0,212,255,0.2)] text-[#00D4FF]' : 'text-[var(--text-muted)]'}`}>
                    {t === 'market' ? '시장가' : t === 'limit' ? '지정가' : '스탑'}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-[var(--text-muted)]">레버리지</label>
                  <span className="text-xs font-black text-[#FFD700]">{leverage}x</span>
                </div>
                <input type="range" min={1} max={50} value={leverage} onChange={e => setLeverage(Number(e.target.value))} className="w-full accent-[#00D4FF]" />
                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-0.5">
                  {[1, 5, 10, 25, 50].map(v => (
                    <button key={v} onClick={() => setLeverage(v)} className="hover:text-[#00D4FF] transition-colors">{v}x</button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">주문 크기 (USDT 마진)</label>
                  <input type="number" value={orderSize} onChange={e => setOrderSize(e.target.value)} className="input-cyber w-full px-3 py-2.5 text-sm" />
                </div>
              </div>

              <div className="glass rounded-xl p-3 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">주문 가치</span>
                  <span className="font-bold text-[var(--text-primary)]">${(parseFloat(orderSize) * leverage || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">필요 마진</span>
                  <span className="font-bold text-[var(--text-primary)]">${(parseFloat(orderSize) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">예상 청산가</span>
                  <span className="font-bold text-[#FF6B35]">
                    ${orderSide === 'long' ? (price * (1 - 0.8 / leverage)).toFixed(1) : (price * (1 + 0.8 / leverage)).toFixed(1)}
                  </span>
                </div>
              </div>

              <NeonButton variant={orderSide === 'long' ? 'success' : 'danger'} size="lg" className="w-full" onClick={handleOrder} disabled={!user}>
                {orderSide === 'long' ? '▲ 롱 진입' : '▼ 숏 진입'}
              </NeonButton>

              {!user && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#FFD700]">
                  <AlertTriangle className="w-3.5 h-3.5" /> 로그인 후 거래 가능
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
