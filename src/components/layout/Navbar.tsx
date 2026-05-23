import { useState } from 'react';
import { TrendingUp, Zap, Layers, BarChart2, Shield, Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Page = 'landing' | 'dashboard' | 'crash' | 'slots' | 'trading' | 'admin';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: '대시보드', icon: BarChart2 },
  { id: 'crash' as Page, label: '크래시', icon: Zap },
  { id: 'slots' as Page, label: '슬롯', icon: Layers },
  { id: 'trading' as Page, label: '트레이딩', icon: TrendingUp },
];

export default function Navbar({ currentPage, onNavigate }: Props) {
  const { profile, wallet, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const balance = wallet
    ? wallet.is_demo_mode
      ? wallet.demo_balance
      : wallet.fuel_balance
    : 0;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 glass-deep border-b border-[rgba(0,212,255,0.1)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0050CC] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,212,255,0.7)] transition-all">
              <Zap className="w-5 h-5 text-[#040810] fill-current" />
            </div>
            <span className="text-lg font-black text-[var(--text-primary)] hidden sm:block">
              Loav<span className="neon-text-blue text-[#00D4FF]">able</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[rgba(0,212,255,0.15)] text-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {wallet && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-[rgba(0,212,255,0.2)]">
                <div className={`w-2 h-2 rounded-full ${wallet.is_demo_mode ? 'bg-[#FFD700]' : 'bg-[#00FF88]'} animate-pulse`} />
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  ${balance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs ${wallet.is_demo_mode ? 'text-[#FFD700]' : 'text-[#00FF88]'}`}>
                  {wallet.is_demo_mode ? 'DEMO' : 'FUEL'}
                </span>
              </div>
            )}

            {profile?.is_admin && (
              <button
                onClick={() => onNavigate('admin')}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#FFD700] transition-colors"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0050CC] flex items-center justify-center">
                <User className="w-4 h-4 text-[#040810]" />
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#FF6B35] transition-colors hidden sm:block"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <button
              className="md:hidden p-2 text-[var(--text-secondary)]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden glass-deep border-t border-[rgba(0,212,255,0.1)] animate-slide-in-up">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      isActive
                        ? 'bg-[rgba(0,212,255,0.15)] text-[#00D4FF]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
              {wallet && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">잔고</span>
                  <span className="font-bold text-[#00D4FF]">${balance.toLocaleString()}</span>
                </div>
              )}
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#FF6B35] font-medium"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-deep border-t border-[rgba(0,212,255,0.1)] safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-[#00D4FF]' : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_#00D4FF]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[#00D4FF]" />}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
