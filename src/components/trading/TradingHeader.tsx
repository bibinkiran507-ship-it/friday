import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '@/context/TradingContext';
import { useAuth } from '@/App';
import {
  Search,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ArrowLeft,
  LogOut,
  Plus,
  Activity,
  ChevronDown,
  Wallet,
  Radio,
  Check,
  Zap,
  Bot,
  LayoutGrid,
} from 'lucide-react';
import { DepositModal } from './DepositModal';
import { MarketSearchModal } from './MarketSearchModal';

interface TradingHeaderProps {
  isSplitScreen?: boolean;
  onToggleSplitScreen?: () => void;
}

export const TradingHeader: React.FC<TradingHeaderProps> = () => {
  const { user, signOut } = useAuth();
  const {
    activeMarket,
    balance,
    stockAssetValue,
    totalPortfolioValue,
    marginUsed,
    marginRatioPercent,
    isMarginCall,
    isDepositOpen,
    setIsDepositOpen,
    isFridayDrawerOpen,
    setIsFridayDrawerOpen,
    resetAccount,
    setViewMode,
    feedStatus,
    toggleFeedMode,
  } = useTrading();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFeedMenuOpen, setIsFeedMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  const prevPriceRef = useRef(activeMarket.price);
  const prevSymbolRef = useRef(activeMarket.symbol);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const feedMenuRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / '/' shortcut to open market search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (feedMenuRef.current && !feedMenuRef.current.contains(e.target as Node)) {
        setIsFeedMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flash price when updated
  useEffect(() => {
    if (prevSymbolRef.current !== activeMarket.symbol) {
      prevSymbolRef.current = activeMarket.symbol;
      prevPriceRef.current = activeMarket.price;
      return;
    }
    if (activeMarket.price > prevPriceRef.current) {
      setPriceFlash('up');
      const timer = setTimeout(() => setPriceFlash(null), 500);
      prevPriceRef.current = activeMarket.price;
      return () => clearTimeout(timer);
    } else if (activeMarket.price < prevPriceRef.current) {
      setPriceFlash('down');
      const timer = setTimeout(() => setPriceFlash(null), 500);
      prevPriceRef.current = activeMarket.price;
      return () => clearTimeout(timer);
    }
  }, [activeMarket.price, activeMarket.symbol]);

  const handleReset = () => {
    setIsResetting(true);
    resetAccount();
    setTimeout(() => setIsResetting(false), 800);
  };

  const isPositive = activeMarket.change24h >= 0;

  return (
    <header className="h-[52px] bg-black/30 backdrop-blur-xl border-b border-white/[0.10] px-3 sm:px-4 flex items-center justify-between z-30 select-none text-[12px]">
      {/* ─── Left Section: Brand & Active Market Selector ─────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Brand */}
        <div
          onClick={() => setViewMode('landing')}
          className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition-opacity pr-1"
          title="Return to Landing Page"
        >
          <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
            <path
              d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z"
              fill="white"
            />
          </svg>
          <span className="text-white text-[14px] font-bold tracking-tight">Apogee</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
            PRO
          </span>
        </div>

        <div className="h-4 w-px bg-white/10 hidden md:block" />

        {/* Market Selector Pill */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-cyan-500/40 transition-all text-left group cursor-pointer"
          title="Search Stocks, Crypto, Forex (Ctrl+K or /)"
        >
          <Search className="w-3.5 h-3.5 text-white/50 group-hover:text-cyan-400 transition-colors" />
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-[13px] tracking-tight">{activeMarket.symbol}</span>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium ${
                activeMarket.category === 'stock'
                  ? 'bg-blue-500/20 text-blue-300'
                  : activeMarket.category === 'crypto'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {activeMarket.category}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 pl-1.5 border-l border-white/10 text-white/40 text-[10px]">
            <kbd className="px-1.5 py-0.2 rounded bg-white/5 text-[9px] font-mono border border-white/10 text-white/50">
              Ctrl+K
            </kbd>
          </div>
        </button>

        {/* Consolidated Asset Telemetry Capsule */}
        <div className="hidden md:flex items-center bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1 gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-[14px] font-mono font-bold tracking-tight tabular-nums transition-all duration-300 ${
                priceFlash === 'up'
                  ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : priceFlash === 'down'
                  ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                  : 'text-white'
              }`}
            >
              ${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}
            </span>
            <span
              className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{activeMarket.change24h}%
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-3 text-[10px] font-mono tabular-nums border-l border-white/10 pl-2.5 text-white/50">
            <div>
              <span className="text-white/30 mr-1">24h H:</span>
              <span className="text-white/80 font-medium">${activeMarket.high24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-white/30 mr-1">24h L:</span>
              <span className="text-white/80 font-medium">${activeMarket.low24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-white/30 mr-1">Vol:</span>
              <span className="text-white/80 font-medium">{activeMarket.volume24h}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Section: Clean Action Center ───────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Live / Simulated Feed Mode Switcher */}
        <div ref={feedMenuRef} className="relative">
          <button
            onClick={() => setIsFeedMenuOpen(!isFeedMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all group ${
              feedStatus.mode === 'live'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Market Data Feed Mode: Click to switch between Live Exchange Feeds and Simulator"
          >
            <span className="relative flex h-2 w-2">
              {feedStatus.mode === 'live' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  feedStatus.mode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </span>
            <span className="font-semibold tracking-wide text-[10px]">
              {feedStatus.mode === 'live' ? 'LIVE' : 'SIM'}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform opacity-70 ${isFeedMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFeedMenuOpen && (
            <div className="absolute right-0 top-[38px] w-[290px] bg-[#0A0E24]/85 border border-white/15 rounded-xl shadow-2xl p-2.5 z-50 backdrop-blur-2xl animate-fade-in text-[12px]">
              <div className="px-2 py-1.5 border-b border-white/[0.06] mb-2 flex items-center justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-wider font-mono font-semibold">
                  Market Data Source
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    feedStatus.mode === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {feedStatus.mode === 'live' ? 'Exchange WS Active' : 'Offline Engine'}
                </span>
              </div>

              {/* Option 1: Live Feeds */}
              <button
                onClick={() => {
                  toggleFeedMode('live');
                  setIsFeedMenuOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 p-2 rounded-lg transition-all text-left mb-1.5 border ${
                  feedStatus.mode === 'live'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'hover:bg-white/[0.04] border-transparent text-white/70'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-[12px]">Live Exchange Feeds</span>
                    {feedStatus.mode === 'live' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                    Real-time Binance WebSockets for Crypto + Yahoo Finance for Equities.
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-emerald-400/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Binance WS {feedStatus.binanceConnected ? 'Connected' : 'Syncing'}</span>
                  </div>
                </div>
              </button>

              {/* Option 2: Simulated Mode */}
              <button
                onClick={() => {
                  toggleFeedMode('simulated');
                  setIsFeedMenuOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 p-2 rounded-lg transition-all text-left border ${
                  feedStatus.mode === 'simulated'
                    ? 'bg-amber-500/10 border-amber-500/30 text-white'
                    : 'hover:bg-white/[0.04] border-transparent text-white/70'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-[12px]">Simulated Market</span>
                    {feedStatus.mode === 'simulated' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                    High-frequency Brownian motion generator for testing strategies offline.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* F.R.I.D.A.Y. Copilot AI Assistant Button */}
        <button
          onClick={() => setIsFridayDrawerOpen(!isFridayDrawerOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all select-none ${
            isFridayDrawerOpen
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border-cyan-500/30'
          }`}
          title="Toggle F.R.I.D.A.Y. AI Copilot (Ctrl+J)"
        >
          <div className="relative w-3.5 h-3.5 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-cyan-300" />
            <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <span className="font-mono font-bold tracking-wider text-[11px]">F.R.I.D.A.Y.</span>
        </button>

        {/* Multi-Chart Split Screen Page Button */}
        <button
          onClick={() => setViewMode('split-screen')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 text-[11px] font-medium transition-all"
          title="Open Multi-Chart Split Screen Page"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Split Screen</span>
        </button>

        {/* Quant Lab Backtesting Button */}
        <button
          onClick={() => setViewMode('quant-lab')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-all"
          title="Open Quantitative Strategy Backtester Page"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Quant Lab</span>
        </button>

        {/* Margin Risk Alert Pill */}
        {isMarginCall && (
          <div
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-bold animate-pulse cursor-pointer hover:bg-rose-500/30 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            title="Margin Call Warning: Deposit Collateral"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>RISK {marginRatioPercent}%</span>
          </div>
        )}

        {/* Unified Portfolio Value & Deposit Pill */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 gap-2">
          <div className="px-2">
            <div className="text-[8px] text-white/40 uppercase tracking-wider font-mono">Portfolio</div>
            <div className="text-[12px] font-mono font-bold text-white tabular-nums leading-tight">
              ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Quick Deposit Button */}
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold transition-all"
            title="Deposit simulation funds"
          >
            <Plus className="w-3 h-3" />
            <span>Deposit</span>
          </button>
        </div>

        {/* Clean Account Menu Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 p-1 pr-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            title="User Settings & Controls"
          >
            <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[11px] font-bold overflow-hidden shrink-0">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover rounded-md" referrerPolicy="no-referrer" />
              ) : (
                user?.name ? user.name[0].toUpperCase() : 'U'
              )}
            </div>
            <span className="hidden sm:inline text-[11px] font-medium text-white max-w-[80px] truncate">
              {user?.name || 'Trader'}
            </span>
            <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-[44px] w-[240px] bg-[#0A0E24]/85 border border-white/15 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-2xl animate-fade-in text-[12px]">
              {/* Account summary header */}
              <div className="p-2 border-b border-white/[0.06] mb-1">
                <div className="flex items-start gap-2.5">
                  {user?.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg border border-white/20 object-cover shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-semibold text-[13px] truncate">{user?.name || 'Trader'}</div>
                    <div className="text-white/40 text-[11px] truncate">{user?.email || 'trader@apogee.pro'}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-white/40">Available Cash:</span>
                  <span className="text-emerald-400 font-semibold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {stockAssetValue > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                    <span className="text-white/40">Stock Assets:</span>
                    <span className="text-blue-400 font-semibold">${stockAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {marginUsed > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                    <span className="text-white/40">Margin Used:</span>
                    <span className={`font-semibold ${isMarginCall ? 'text-rose-400 font-bold' : 'text-amber-400'}`}>
                      ${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({marginRatioPercent}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Menu Actions */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsDepositOpen(true);
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors text-left"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deposit / Withdraw Funds</span>
              </button>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleReset();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors text-left"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset Simulation Portfolio</span>
              </button>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setViewMode('landing');
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors text-left"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                <span>Return to Landing Page</span>
              </button>

              <div className="h-px bg-white/[0.06] my-1" />

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────────────── */}
      <MarketSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
    </header>
  );
};
