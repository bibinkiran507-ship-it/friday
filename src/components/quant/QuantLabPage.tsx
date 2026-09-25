import React, { useState, useMemo, useEffect } from 'react';
import { useTrading } from '@/context/TradingContext';
import {
  Play,
  Download,
  Sliders,
  TrendingUp,
  Activity,
  ShieldAlert,
  Layers,
  BookOpen,
  RefreshCw,
  Award,
  ArrowLeft,
  Search,
} from 'lucide-react';
import {
  AVAILABLE_STRATEGIES,
  DEFAULT_CONFIG,
  runBacktest,
  generateHistoricalDataset,
  exportTradesToCSV,
} from '@/utils/backtestEngine';
import { StrategyType, StrategyParamConfig, BacktestResult } from '@/types/backtest';
import { MarketSearchModal } from '@/components/trading/MarketSearchModal';

export const QuantLabPage: React.FC = () => {
  const { markets, activeSymbol, setViewMode } = useTrading();

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('ema_cross');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(activeSymbol || 'BTC/USDT');
  const [sampleDays, setSampleDays] = useState<number>(180);
  const [config, setConfig] = useState<StrategyParamConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'chart' | 'trades' | 'parameters' | 'viva'>('chart');
  const [tradeFilter, setTradeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [hoverPointIndex, setHoverPointIndex] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync selectedSymbol with activeSymbol if user changed it in search modal
  useEffect(() => {
    if (activeSymbol && activeSymbol !== selectedSymbol) {
      setSelectedSymbol(activeSymbol);
    }
  }, [activeSymbol]);

  // Find active market
  const currentMarket = useMemo(() => {
    return markets.find((m) => m.symbol === selectedSymbol) || markets[0];
  }, [markets, selectedSymbol]);

  // Execute Backtest
  const handleRunBacktest = () => {
    setIsSimulating(true);
    setTimeout(() => {
      try {
        const basePrice = currentMarket?.price || 100;
        const precision = currentMarket?.precision ?? 2;
        const candles = generateHistoricalDataset(selectedSymbol, basePrice, sampleDays, precision);
        const res = runBacktest(selectedStrategy, candles, config, selectedSymbol);
        setResult(res);
      } catch (err) {
        console.error('Backtest error:', err);
      } finally {
        setIsSimulating(false);
      }
    }, 400);
  };

  // Run automatically on first mount
  useEffect(() => {
    handleRunBacktest();
  }, [selectedStrategy, selectedSymbol, sampleDays]);

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    if (!result) return [];
    if (tradeFilter === 'win') return result.trades.filter((t) => t.pnl > 0);
    if (tradeFilter === 'loss') return result.trades.filter((t) => t.pnl <= 0);
    return result.trades;
  }, [result, tradeFilter]);

  // Compute SVG dimensions and bounds for Equity Curve
  const chartMetrics = result
    ? (() => {
        const pts = result.equityCurve;
        if (!pts.length) return null;

        const maxEq = Math.max(...pts.map((p) => Math.max(p.strategyEquity, p.benchmarkEquity)));
        const minEq = Math.min(...pts.map((p) => Math.min(p.strategyEquity, p.benchmarkEquity)));
        const padding = (maxEq - minEq) * 0.1 || 1000;
        const topBound = maxEq + padding;
        const bottomBound = Math.max(0, minEq - padding);
        const eqRange = topBound - bottomBound || 1;

        const maxDd = Math.max(...pts.map((p) => p.drawdownPercent), 1);

        return { pts, topBound, bottomBound, eqRange, maxDd };
      })()
    : null;

  const currentHoverPoint =
    hoverPointIndex !== null && chartMetrics ? chartMetrics.pts[hoverPointIndex] : null;

  return (
    <div className="w-full min-h-screen bg-transparent text-white flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Transparent Glassmorphic Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-black/30 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />

      {/* ─── 1. Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="relative z-20 h-[62px] bg-[#070A18]/60 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Back to Terminal & Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('terminal')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/10 text-[13px] font-medium transition-all hover:scale-[1.02] shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Back to Terminal</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white text-[16px] font-bold tracking-tight">Quant Strategy Lab</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  Institutional Engine
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls (Asset, Horizon, Run, Export) */}
        <div className="flex items-center gap-3">
          {/* Asset Picker Button (opens Search Modal) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-mono transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white font-semibold">{selectedSymbol}</span>
            <span className="text-white/40 hidden md:inline">({currentMarket.name})</span>
          </button>

          {/* Lookback Horizon */}
          <select
            value={sampleDays}
            onChange={(e) => setSampleDays(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={90} className="bg-[#0E1228]">90 Days (Quarter)</option>
            <option value={180} className="bg-[#0E1228]">180 Days (6 Months)</option>
            <option value={365} className="bg-[#0E1228]">365 Days (1 Year)</option>
          </select>

          {/* Run Simulation Button */}
          <button
            onClick={handleRunBacktest}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold text-[13px] shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isSimulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isSimulating ? 'Computing...' : 'Run Simulation'}</span>
          </button>

          {/* Export CSV */}
          {result && result.trades.length > 0 && (
            <button
              onClick={() => exportTradesToCSV(result)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/10 text-[12px] font-mono transition-colors"
              title="Download Trade Ledger as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── 2. Strategy Selector Strip ────────────────────────────────────── */}
      <div className="relative z-10 px-4 sm:px-8 py-3.5 bg-[#070A18]/40 border-b border-white/[0.06] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-[11px] text-white/40 font-mono uppercase tracking-wider mr-2 shrink-0">
              Strategy Model:
            </span>
            {AVAILABLE_STRATEGIES.map((strat) => {
              const isActive = selectedStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => setSelectedStrategy(strat.id)}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-[450] transition-all flex items-center gap-2 border shrink-0 ${
                    isActive
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-md shadow-blue-500/20 font-semibold'
                      : 'bg-white/[0.03] text-white/60 border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-white/20'}`} />
                  <span>{strat.name.split('(')[0].trim()}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/50">
                    {strat.category}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-white/50 hidden lg:block">
            {AVAILABLE_STRATEGIES.find((s) => s.id === selectedStrategy)?.description}
          </div>
        </div>
      </div>

      {/* ─── 3. Main Page Body ──────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Institutional KPI Summary Row */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Strategy Return & Alpha */}
            <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-lg transition-all">
              <div className="text-[11px] text-white/40 uppercase font-mono tracking-wider">Strategy Return</div>
              <div
                className={`text-[24px] font-mono font-bold leading-tight my-1 ${
                  result.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.totalReturnPercent >= 0 ? '+' : ''}
                {result.totalReturnPercent}%
              </div>
              <div className="text-[11px] font-mono text-white/50 flex items-center justify-between">
                <span>Alpha:</span>
                <span className={result.alphaPercent >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                  {result.alphaPercent >= 0 ? '+' : ''}
                  {result.alphaPercent}%
                </span>
              </div>
            </div>

            {/* 2. Buy & Hold Benchmark */}
            <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-lg transition-all">
              <div className="text-[11px] text-white/40 uppercase font-mono tracking-wider">Buy & Hold</div>
              <div
                className={`text-[24px] font-mono font-bold leading-tight my-1 ${
                  result.benchmarkReturnPercent >= 0 ? 'text-white' : 'text-rose-400'
                }`}
              >
                {result.benchmarkReturnPercent >= 0 ? '+' : ''}
                {result.benchmarkReturnPercent}%
              </div>
              <div className="text-[11px] font-mono text-white/40">Market Benchmark</div>
            </div>

            {/* 3. Sharpe Ratio */}
            <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40 uppercase font-mono tracking-wider">Sharpe Ratio</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div
                className={`text-[24px] font-mono font-bold leading-tight my-1 ${
                  result.sharpeRatio >= 1.5
                    ? 'text-emerald-400'
                    : result.sharpeRatio >= 1.0
                    ? 'text-blue-400'
                    : 'text-amber-400'
                }`}
              >
                {result.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-white/50">
                {result.sharpeRatio >= 2.0
                  ? 'Institutional (>2.0)'
                  : result.sharpeRatio >= 1.0
                  ? 'Market Beating (>1.0)'
                  : 'Volatile Drag (<1.0)'}
              </div>
            </div>

            {/* 4. Max Drawdown */}
            <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-lg transition-all">
              <div className="text-[11px] text-white/40 uppercase font-mono tracking-wider">Max Drawdown</div>
              <div className="text-[24px] font-mono font-bold leading-tight my-1 text-rose-400">
                -{result.maxDrawdownPercent}%
              </div>
              <div className="text-[11px] font-mono text-white/40">Peak-to-Trough Drop</div>
            </div>

            {/* 5. Win Rate */}
            <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-lg transition-all">
              <div className="text-[11px] text-white/40 uppercase font-mono tracking-wider">Win Rate</div>
              <div className="text-[24px] font-mono font-bold leading-tight my-1 text-emerald-400">
                {result.winRatePercent}%
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex mt-1">
                <div style={{ width: `${result.winRatePercent}%` }} className="bg-emerald-400 h-full" />
                <div style={{ width: `${100 - result.winRatePercent}%` }} className="bg-rose-500 h-full" />
              </div>
            </div>

            {/* 6. Profit Factor */}
            <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-lg transition-all">
              <div className="text-[11px] text-white/40 uppercase font-mono tracking-wider">Profit Factor</div>
              <div className="text-[24px] font-mono font-bold leading-tight my-1 text-white">
                {result.profitFactor}x
              </div>
              <div className="text-[11px] font-mono text-white/50">
                {result.winningTrades}W / {result.losingTrades}L ({result.totalTrades} Total)
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. Main Section Tabs ─────────────────────────────────────────── */}
        <div className="bg-black/30 border border-white/[0.08] rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden">
          {/* Tab Header Bar */}
          <div className="h-[50px] px-6 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex items-center gap-2 py-3 font-[450] text-[13px] border-b-2 transition-all ${
                  activeTab === 'chart'
                    ? 'border-blue-500 text-white font-semibold'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Equity Curve & Drawdown Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('trades')}
                className={`flex items-center gap-2 py-3 font-[450] text-[13px] border-b-2 transition-all ${
                  activeTab === 'trades'
                    ? 'border-blue-500 text-white font-semibold'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Trade Execution Ledger</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono font-semibold">
                  {result?.trades.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('parameters')}
                className={`flex items-center gap-2 py-3 font-[450] text-[13px] border-b-2 transition-all ${
                  activeTab === 'parameters'
                    ? 'border-blue-500 text-white font-semibold'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Parameter Tuning & Risk</span>
              </button>

              <button
                onClick={() => setActiveTab('viva')}
                className={`flex items-center gap-2 py-3 font-[450] text-[13px] border-b-2 transition-all ${
                  activeTab === 'viva'
                    ? 'border-emerald-400 text-emerald-300 font-semibold'
                    : 'border-transparent text-emerald-400/60 hover:text-emerald-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Quant Formulas & Viva Guide</span>
              </button>
            </div>

            {/* Legend */}
            {activeTab === 'chart' && (
              <div className="hidden sm:flex items-center gap-5 text-[12px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-white/80">Strategy Portfolio ($)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1.5 rounded-full bg-white/40" />
                  <span className="text-white/40">Benchmark (Buy & Hold)</span>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content Container */}
          <div className="p-6">
            {/* TAB 1: Equity Curve & Drawdown Chart */}
            {activeTab === 'chart' && result && chartMetrics && (
              <div className="flex flex-col gap-6">
                {/* Main Equity Graph */}
                <div className="relative h-[360px] w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 flex flex-col justify-between overflow-hidden">
                  {/* Hover Inspector Tooltip */}
                  {currentHoverPoint && (
                    <div className="absolute top-4 left-6 z-20 px-4 py-2 rounded-xl bg-[#121635]/95 border border-blue-500/40 backdrop-blur-md shadow-2xl text-[12px] font-mono flex items-center gap-5 animate-fade-in">
                      <div>
                        <span className="text-white/40">Date: </span>
                        <span className="text-white font-medium">{currentHoverPoint.dateStr}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-bold">
                          Algo: ${currentHoverPoint.strategyEquity.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">
                          Hold: ${currentHoverPoint.benchmarkEquity.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-semibold">DD: -{currentHoverPoint.drawdownPercent}%</span>
                      </div>
                    </div>
                  )}

                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 1000 320"
                    preserveAspectRatio="none"
                    onMouseLeave={() => setHoverPointIndex(null)}
                  >
                    <defs>
                      <linearGradient id="quantPageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guide Lines */}
                    {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                      const y = ratio * 320;
                      const val = chartMetrics.topBound - ratio * chartMetrics.eqRange;
                      return (
                        <g key={ratio}>
                          <line x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                          <text x="990" y={y - 5} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="monospace">
                            ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </text>
                        </g>
                      );
                    })}

                    {/* Benchmark Line (Gray dashed) */}
                    <path
                      d={chartMetrics.pts
                        .map((p, i) => {
                          const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                          const y = 320 - ((p.benchmarkEquity - chartMetrics.bottomBound) / chartMetrics.eqRange) * 320;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />

                    {/* Strategy Filled Area */}
                    <path
                      d={`${chartMetrics.pts
                        .map((p, i) => {
                          const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                          const y = 320 - ((p.strategyEquity - chartMetrics.bottomBound) / chartMetrics.eqRange) * 320;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')} L 1000 320 L 0 320 Z`}
                      fill="url(#quantPageGrad)"
                    />

                    {/* Strategy Line */}
                    <path
                      d={chartMetrics.pts
                        .map((p, i) => {
                          const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                          const y = 320 - ((p.strategyEquity - chartMetrics.bottomBound) / chartMetrics.eqRange) * 320;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                    />

                    {/* Interactive Crosshair Hover Area */}
                    {chartMetrics.pts.map((_, i) => {
                      const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                      return (
                        <rect
                          key={i}
                          x={x - 500 / chartMetrics.pts.length}
                          y="0"
                          width={1000 / chartMetrics.pts.length}
                          height="320"
                          fill="transparent"
                          onMouseEnter={() => setHoverPointIndex(i)}
                        />
                      );
                    })}

                    {/* Active Point Highlight */}
                    {hoverPointIndex !== null && (
                      <circle
                        cx={(hoverPointIndex / (chartMetrics.pts.length - 1)) * 1000}
                        cy={
                          320 -
                          ((chartMetrics.pts[hoverPointIndex].strategyEquity - chartMetrics.bottomBound) /
                            chartMetrics.eqRange) *
                            320
                        }
                        r="6"
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                      />
                    )}
                  </svg>
                </div>

                {/* Underwater Drawdown Profile */}
                <div className="h-[140px] w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/[0.06] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[12px] font-mono">
                    <span className="text-white/50">Underwater Drawdown Profile (Downside Capital Risk)</span>
                    <span className="text-rose-400 font-semibold">Max Peak-to-Trough: -{result.maxDrawdownPercent}%</span>
                  </div>
                  <svg className="w-full h-[90px]" viewBox="0 0 1000 90" preserveAspectRatio="none">
                    <path
                      d={`M 0 0 ${chartMetrics.pts
                        .map((p, i) => {
                          const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                          const y = (p.drawdownPercent / chartMetrics.maxDd) * 90;
                          return `L ${x} ${y}`;
                        })
                        .join(' ')} L 1000 0 Z`}
                      fill="rgba(244,63,94,0.25)"
                      stroke="#F43F5E"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* TAB 2: Trade Execution Ledger */}
            {activeTab === 'trades' && result && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['all', 'win', 'loss'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTradeFilter(filter)}
                        className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono uppercase transition-colors ${
                          tradeFilter === filter
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'bg-white/[0.04] text-white/50 hover:text-white'
                        }`}
                      >
                        {filter === 'all'
                          ? `All Trades (${result.trades.length})`
                          : filter === 'win'
                          ? `Winning (${result.winningTrades})`
                          : `Losing (${result.losingTrades})`}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => exportTradesToCSV(result)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[12px] font-mono transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Audit Ledger</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-black/20 backdrop-blur-md">
                  <table className="w-full text-left text-[12px] font-mono">
                    <thead className="bg-white/[0.04] text-white/50 border-b border-white/[0.06] text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Direction</th>
                        <th className="p-3">Entry Date & Price</th>
                        <th className="p-3">Exit Date & Price</th>
                        <th className="p-3">Size</th>
                        <th className="p-3">Net PnL ($)</th>
                        <th className="p-3">Return (%)</th>
                        <th className="p-3">Portfolio Balance</th>
                        <th className="p-3">Exit Trigger</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredTrades.map((t) => {
                        const isWin = t.pnl > 0;
                        return (
                          <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="p-3 text-white/50">#{t.tradeNum}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                                LONG
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="text-white font-medium">${t.entryPrice.toLocaleString()}</div>
                              <div className="text-white/40 text-[11px]">{t.entryDate}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-white font-medium">${t.exitPrice.toLocaleString()}</div>
                              <div className="text-white/40 text-[11px]">{t.exitDate}</div>
                            </td>
                            <td className="p-3 text-white/80">{t.size.toFixed(4)}</td>
                            <td className={`p-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isWin ? '+' : ''}${t.pnl.toLocaleString()}
                            </td>
                            <td className={`p-3 font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isWin ? '+' : ''}{t.pnlPercent}%
                            </td>
                            <td className="p-3 text-white">${t.cumulativeEquity.toLocaleString()}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  t.exitReason === 'take_profit'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : t.exitReason === 'stop_loss'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                {t.exitReason.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Parameter Tuning */}
            {activeTab === 'parameters' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                {/* Risk Parameters */}
                <div className="p-5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/[0.08] flex flex-col gap-4">
                  <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                    <span>Risk Management & Position Controls</span>
                  </h3>

                  <div>
                    <div className="flex justify-between text-[12px] font-mono mb-1.5">
                      <span className="text-white/50">Initial Simulation Capital</span>
                      <span className="text-emerald-400 font-semibold">${config.initialCapital.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={1000000}
                      step={10000}
                      value={config.initialCapital}
                      onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[12px] font-mono mb-1.5">
                      <span className="text-white/50">Position Sizing (% of cash)</span>
                      <span className="text-white font-medium">{config.positionSizePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={config.positionSizePercent}
                      onChange={(e) => setConfig({ ...config, positionSizePercent: Number(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[12px] font-mono mb-1.5">
                      <span className="text-white/50">Stop Loss Limit (%)</span>
                      <span className="text-rose-400 font-semibold">-{config.stopLossPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={config.stopLossPercent}
                      onChange={(e) => setConfig({ ...config, stopLossPercent: Number(e.target.value) })}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[12px] font-mono mb-1.5">
                      <span className="text-white/50">Take Profit Target (%)</span>
                      <span className="text-emerald-400 font-semibold">+{config.takeProfitPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={30}
                      step={1}
                      value={config.takeProfitPercent}
                      onChange={(e) => setConfig({ ...config, takeProfitPercent: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Strategy Inputs */}
                <div className="p-5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/[0.08] flex flex-col gap-4">
                  <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span>Strategy Mathematical Parameters</span>
                  </h3>

                  {selectedStrategy === 'ema_cross' && (
                    <>
                      <div>
                        <div className="flex justify-between text-[12px] font-mono mb-1.5">
                          <span className="text-white/50">Fast EMA Period</span>
                          <span className="text-blue-400 font-semibold">{config.fastEma} bars</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={30}
                          value={config.fastEma}
                          onChange={(e) => setConfig({ ...config, fastEma: Number(e.target.value) })}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[12px] font-mono mb-1.5">
                          <span className="text-white/50">Slow EMA Period</span>
                          <span className="text-blue-400 font-semibold">{config.slowEma} bars</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={config.slowEma}
                          onChange={(e) => setConfig({ ...config, slowEma: Number(e.target.value) })}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  {selectedStrategy === 'rsi_reversion' && (
                    <>
                      <div>
                        <div className="flex justify-between text-[12px] font-mono mb-1.5">
                          <span className="text-white/50">RSI Calculation Period</span>
                          <span className="text-emerald-400 font-semibold">{config.rsiPeriod} bars</span>
                        </div>
                        <input
                          type="range"
                          min={7}
                          max={28}
                          value={config.rsiPeriod}
                          onChange={(e) => setConfig({ ...config, rsiPeriod: Number(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[12px] font-mono mb-1.5">
                          <span className="text-white/50">Oversold Trigger Level</span>
                          <span className="text-emerald-400 font-semibold">{config.rsiOversold}</span>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={45}
                          value={config.rsiOversold}
                          onChange={(e) => setConfig({ ...config, rsiOversold: Number(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleRunBacktest}
                    className="mt-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] transition-colors"
                  >
                    Apply Parameters & Re-run Simulation
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Academic Viva Guide */}
            {activeTab === 'viva' && (
              <div className="space-y-5 max-w-5xl text-[13px] text-white/80 leading-relaxed">
                <div className="p-6 rounded-2xl bg-blue-950/20 backdrop-blur-md border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2 text-blue-300 font-semibold text-[15px]">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <span>College Project Viva Presentation Notes</span>
                  </div>
                  <p className="text-white/60 mb-5">
                    These mathematical formulas and definitions explain how the quantitative engine calculates
                    risk-adjusted performance without lookahead bias.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sharpe Ratio */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="font-semibold text-emerald-400 font-mono mb-1">
                        1. Annualized Sharpe Ratio ($S$)
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/50 font-mono text-[12px] text-blue-300 mb-2 border border-white/[0.04]">
                        Sharpe = [(Mean Daily Return - R_f) / Daily StdDev] × √252
                      </div>
                      <p className="text-[12px] text-white/60">
                        Measures excess return earned per unit of total risk (volatility). An annualized Sharpe ratio
                        &gt; 1.0 is considered good in hedge funds; &gt; 2.0 is institutional alpha.
                      </p>
                    </div>

                    {/* Sortino Ratio */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="font-semibold text-emerald-400 font-mono mb-1">
                        2. Sortino Ratio
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/50 font-mono text-[12px] text-blue-300 mb-2 border border-white/[0.04]">
                        Sortino = [(Mean Daily Return - R_f) / Downside Deviation] × √252
                      </div>
                      <p className="text-[12px] text-white/60">
                        Unlike Sharpe which penalizes upside volatility (big gains), Sortino only penalizes negative
                        returns (downside losses), providing a more realistic assessment of downside risk.
                      </p>
                    </div>

                    {/* Maximum Drawdown */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="font-semibold text-rose-400 font-mono mb-1">
                        3. Maximum Drawdown (MDD)
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/50 font-mono text-[12px] text-rose-300 mb-2 border border-white/[0.04]">
                        MDD = max[(Peak_Equity - Trough_Equity) / Peak_Equity] × 100%
                      </div>
                      <p className="text-[12px] text-white/60">
                        Quantifies the worst-case capital decline a trader would experience during the historical period.
                      </p>
                    </div>

                    {/* Alpha */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="font-semibold text-emerald-400 font-mono mb-1">
                        4. Strategy Alpha (α)
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/50 font-mono text-[12px] text-emerald-300 mb-2 border border-white/[0.04]">
                        Alpha = Strategy Total Return (%) - Buy & Hold Return (%)
                      </div>
                      <p className="text-[12px] text-white/60">
                        Shows whether active algorithmic trading generated excess returns over simply holding the asset
                        passively.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Market Search Modal */}
      <MarketSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
