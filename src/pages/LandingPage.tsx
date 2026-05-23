import { useState } from 'react';
import { Zap, TrendingUp, Star, Shield, Users, Globe, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NeonButton from '../components/ui/NeonButton';
import ParticleField from '../components/ui/ParticleField';

interface Props {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const stats = [
    { label: '글로벌 드림베터', value: '148,392', color: 'text-[#00D4FF]' },
    { label: '총 지급액', value: '$78.9억', color: 'text-[#00FF88]' },
    { label: '잭팟 풀', value: '$50,000', color: 'text-[#FFD700]' },
    { label: '최고 배율', value: '247.3x', color: 'text-[#FF6B35]' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) { setError(error); return; }
        onEnter();
      } else {
        if (!username.trim()) { setError('사용자명을 입력해주세요'); return; }
        const { error } = await signUp(email, password, username.trim());
        if (error) { setError(error); return; }
        onEnter();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-void)' }}>
      <ParticleField />

      <div className="fixed top-1/4 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #00D4FF, transparent)' }} />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #00FF88, transparent)', animationDelay: '1s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FFD700, transparent)' }} />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col justify-center px-8 py-20 lg:py-0 lg:px-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#0050CC] flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.5)]">
              <Zap className="w-7 h-7 text-[#040810] fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                Loav<span className="neon-text-blue text-[#00D4FF]">able</span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase">DreamBurst Platform</p>
            </div>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            <span className="text-[var(--text-primary)]">당신의 꿈이</span>
            <br />
            <span className="neon-text-blue text-[#00D4FF]">현실이 됩니다</span>
            <br />
            <span className="holographic bg-clip-text text-transparent">지금 바로</span>
          </h2>

          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-lg leading-relaxed">
            매일 10초 꿈을 녹음하면 무료 드림티켓 지급.
            지구상 최고의 크래시 게임, 슬롯, 레버리지 트레이딩을
            한 플랫폼에서 경험하세요.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-10 max-w-md">
            {stats.map(s => (
              <div key={s.label} className="glass px-4 py-3 rounded-xl">
                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="flex -space-x-2">
              {['김','이','박','최','정'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full glass border border-[rgba(0,212,255,0.3)] flex items-center justify-center text-xs font-bold text-[#00D4FF]">
                  {c}
                </div>
              ))}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="text-[#00FF88] font-bold">3,847명</span>이 지금 플레이 중
            </div>
            <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { icon: Shield, label: 'Provably Fair' },
              { icon: Globe, label: '글로벌 #1' },
              { icon: Users, label: '바이럴 8% 수익' },
              { icon: Star, label: '잭팟 $50,000' },
              { icon: TrendingUp, label: '50x 레버리지' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-[rgba(0,212,255,0.15)] text-xs text-[var(--text-secondary)]">
                <Icon className="w-3 h-3 text-[#00D4FF]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-[420px] flex items-center justify-center px-6 py-10 lg:py-0">
          <div className="w-full max-w-sm glass rounded-3xl p-8 animate-fade-in-scale border border-[rgba(0,212,255,0.15)]">
            <div className="flex bg-[rgba(0,0,0,0.3)] rounded-xl p-1 mb-8">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    mode === m
                      ? 'bg-gradient-to-r from-[#00D4FF] to-[#0090FF] text-[#040810]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1.5">닉네임</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="드림베터 닉네임"
                    className="input-cyber w-full px-4 py-3 text-base"
                    maxLength={20}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="input-cyber w-full px-4 py-3 text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="6자 이상"
                    className="input-cyber w-full px-4 py-3 pr-12 text-base"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-[rgba(255,107,53,0.1)] border border-[rgba(255,107,53,0.3)] text-sm text-[#FF6B35]">
                  {error}
                </div>
              )}

              <NeonButton type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
                {mode === 'login' ? '입장하기' : '드림베터 시작'}
              </NeonButton>
            </form>

            <div className="mt-6 px-4 py-3 rounded-xl bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.15)]">
              <div className="text-xs text-[#FFD700] font-bold mb-1">데모 계정 혜택</div>
              <div className="text-xs text-[var(--text-secondary)]">
                가입 즉시 <span className="text-[#00FF88] font-bold">$10,000 USDT</span> 데모 잔고 지급 + 첫 입금 시 최대 <span className="text-[#FF6B35] font-bold">+60% 보너스</span>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center mt-4 leading-relaxed">
              18세 이상만 이용 가능. 책임감 있는 게임을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
