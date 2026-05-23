import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ParticleField from './components/ui/ParticleField';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Navbar from './components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CrashPage from './pages/CrashPage';
import SlotsPage from './pages/SlotsPage';
import TradingPage from './pages/TradingPage';
import AdminPage from './pages/AdminPage';

type Page = 'landing' | 'dashboard' | 'crash' | 'slots' | 'trading' | 'admin';

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('landing');

  useEffect(() => {
    if (!loading) {
      setPage(user ? 'dashboard' : 'landing');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
        <div className="text-center">
          <div className="text-3xl font-black text-[#00D4FF] neon-text-blue mb-4 animate-pulse-glow">
            Loavable
          </div>
          <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user || page === 'landing') {
    return <LandingPage onEnter={() => setPage('dashboard')} />;
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-void)' }}>
      <ParticleField />
      <div className="relative z-10">
        <Navbar currentPage={page} onNavigate={setPage} />
        <main>
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
          {page === 'crash' && <CrashPage />}
          {page === 'slots' && <SlotsPage />}
          {page === 'trading' && <TradingPage />}
          {page === 'admin' && <AdminPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
