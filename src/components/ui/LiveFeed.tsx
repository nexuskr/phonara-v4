import { useEffect, useState } from 'react';

interface FeedItem {
  id: string;
  username: string;
  action: string;
  amount: number;
  multiplier?: number;
  isWin: boolean;
}

const USERNAMES = ['김민준','이서연','박지호','최유진','정도현','강지원','조서준','윤미래','임현우','한소희'];
const ACTIONS = ['크래시 캐시아웃','슬롯 대박','드림버스트','레버리지 청산','잭팟 당첨'];

function generateFeedItem(): FeedItem {
  const isWin = Math.random() > 0.3;
  const amount = Math.floor(Math.random() * 5000 + 50);
  const mult = (Math.random() * 10 + 1.1).toFixed(2);
  return {
    id: crypto.randomUUID(),
    username: USERNAMES[Math.floor(Math.random() * USERNAMES.length)],
    action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
    amount,
    multiplier: isWin ? Number(mult) : undefined,
    isWin,
  };
}

export default function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(() => Array.from({ length: 8 }, generateFeedItem));

  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => [generateFeedItem(), ...prev.slice(0, 19)]);
    }, 1500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1 overflow-hidden max-h-80">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-300"
          style={{
            background: i === 0 ? 'rgba(0,212,255,0.08)' : 'transparent',
            opacity: Math.max(0.3, 1 - i * 0.06),
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.isWin ? 'bg-[#00FF88]' : 'bg-[#FF6B35]'}`} />
            <span className="text-[var(--text-secondary)] truncate">
              <span className="text-[var(--text-primary)] font-medium">{item.username}</span>
              {' '}{item.action}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {item.multiplier && (
              <span className="text-[#FFD700] font-bold">{item.multiplier}x</span>
            )}
            <span className={`font-bold ${item.isWin ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
              {item.isWin ? '+' : '-'}${item.amount.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
