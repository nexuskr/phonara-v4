import { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'gold' | 'orange';
  trend?: number;
}

const colorMap = {
  blue: { text: 'text-[#00D4FF]', glow: 'neon-text-blue', border: 'border-[rgba(0,212,255,0.2)]', bg: 'bg-[rgba(0,212,255,0.05)]' },
  green: { text: 'text-[#00FF88]', glow: 'neon-text-green', border: 'border-[rgba(0,255,136,0.2)]', bg: 'bg-[rgba(0,255,136,0.05)]' },
  gold: { text: 'text-[#FFD700]', glow: 'neon-text-gold', border: 'border-[rgba(255,215,0,0.2)]', bg: 'bg-[rgba(255,215,0,0.05)]' },
  orange: { text: 'text-[#FF6B35]', glow: 'neon-text-orange', border: 'border-[rgba(255,107,53,0.2)]', bg: 'bg-[rgba(255,107,53,0.05)]' },
};

export default function StatCard({ label, value, sub, icon, color = 'blue', trend }: Props) {
  const c = colorMap[color];
  return (
    <div className={`card-cyber p-4 ${c.bg} ${c.border} border`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[var(--text-secondary)] text-sm font-medium">{label}</span>
        {icon && <div className={`${c.text} opacity-80`}>{icon}</div>}
      </div>
      <div className={`text-2xl font-black ${c.text} ${c.glow}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {sub && <span className="text-[var(--text-muted)] text-xs">{sub}</span>}
        {trend !== undefined && (
          <span className={`text-xs font-bold ${trend >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B35]'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
