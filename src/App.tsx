import { useState, createContext, useContext } from 'react';
import { TradingProvider, useTrading } from '@/context/TradingContext';
import Hero from '@/components/Hero';
import { MarketTickerBar } from '@/components/landing/MarketTickerBar';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { TradingTerminal } from '@/components/trading/TradingTerminal';
import { ScrollReveal } from '@/components/common/ScrollReveal';
import { AuthPage } from '@/components/auth/AuthPage';
import { QuantLabPage } from '@/components/quant/QuantLabPage';
import { ArchitecturePage } from '@/components/architecture/ArchitecturePage';
import { SplitScreenPage } from '@/components/trading/SplitScreenPage';
import { CinematicBackgroundVideo } from '@/components/common/CinematicBackgroundVideo';

export interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue>({ user: null, signOut: () => {} });
export const useAuth = () => useContext(AuthContext);

// Persist auth across hot-reload in dev (sessionStorage)
function getStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem('apogee_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function MainContent() {
  const { viewMode, setViewMode } = useTrading();

  return (
    <div className="w-full min-h-screen text-white flex flex-col relative overflow-x-hidden bg-[#080A19]">
      {/* Persistent Cinematic Video Background - Shared across Landing, Terminal, Quant Lab & Architecture */}
      <CinematicBackgroundVideo />

      {/* Subtle vignette layer */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 transition-colors duration-500 ${
          viewMode === 'terminal'
            ? 'bg-black/20'
            : viewMode === 'quant-lab' || viewMode === 'architecture' || viewMode === 'split-screen'
            ? 'bg-black/55'
            : 'bg-black/15'
        }`}
      />

      {viewMode === 'split-screen' && (
        <div className="relative z-10 w-full h-screen">
          <SplitScreenPage />
        </div>
      )}

      {viewMode === 'architecture' && (
        <div className="relative z-10 w-full min-h-screen">
          <ArchitecturePage />
        </div>
      )}

      {viewMode === 'quant-lab' && (
        <div className="relative z-10 w-full min-h-screen">
          <QuantLabPage />
        </div>
      )}

      {viewMode === 'terminal' && (
        <div className="relative z-10 w-full h-screen overflow-hidden">
          <TradingTerminal />
        </div>
      )}

      {viewMode === 'landing' && (
        <div className="relative z-10 w-full min-h-screen flex flex-col justify-between">
          {/* 1. Hero Section */}
          <div className="relative z-10">
            <Hero />
          </div>

          {/* 2. Real-time Market Ticker Ribbon */}
          <div id="market-ticker" className="relative z-10">
            <ScrollReveal direction="down" delay={100}>
              <MarketTickerBar />
            </ScrollReveal>
          </div>

          {/* 3. Features & Stats */}
          <div id="features-section" className="relative z-10">
            <FeaturesSection />
          </div>

          {/* 4. Footer */}
          <footer className="relative z-10 w-full bg-[#050711]/90 backdrop-blur-xl border-t border-white/[0.08] py-8 px-5 sm:px-8 md:px-[82px] text-white/40 text-[13px] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
                <path
                  d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z"
                  fill="white"
                />
              </svg>
              <span className="text-white font-[450]">Apogee Pro Terminal</span>
              <span>© 2026 Apogee Systems Inc. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All Matching Systems Operational
              </span>
              <span
                onClick={() => {
                  setViewMode('architecture');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Architecture & Docs
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">API Keys</span>
              <span className="hover:text-white cursor-pointer transition-colors">Security</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  const handleAuthSuccess = (u: AuthUser) => {
    sessionStorage.setItem('apogee_user', JSON.stringify(u));
    setUser(u);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('apogee_user');
    setUser(null);
  };

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <AuthContext.Provider value={{ user, signOut: handleSignOut }}>
      <TradingProvider>
        <MainContent />
      </TradingProvider>
    </AuthContext.Provider>
  );
}
