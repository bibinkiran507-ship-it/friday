import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTrading } from '@/context/TradingContext';
import {
  Play,
  Download,
  Sliders,
  TrendingUp,
  Activity,
  ShieldAlert,
  Layers,
  X,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Award,
} from 'lucide-react';
import {
  AVAILABLE_STRATEGIES,
  DEFAULT_CONFIG,
  runBacktest,
  generateHistoricalDataset,
  exportTradesToCSV,
} from '@/utils/backtestEngine';
import { StrategyType, StrategyParamConfig, BacktestResult } from '@/types/backtest';

interface BacktesterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BacktesterModal: React.FC<BacktesterModalProps> = ({ isOpen, onClose }) => {
  const { markets, activeSymbol } = useTrading();

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('ema_cross');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(activeSymbol || 'BTC/USDT');
  const [sampleDays, setSampleDays] = useState<number>(180);
  const [config, setConfig] = useState<StrategyParamConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'chart' | 'trades' | 'parameters' | 'viva'>('chart');
  const [tradeFilter, setTradeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [hoverPointIndex, setHoverPointIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Find active market price
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
    }, 450);
  };

  // Run backtest automatically on first open
  useEffect(() => {
    if (isOpen && !result) {
      handleRunBacktest();
    }
  }, [isOpen]);

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    if (!result) return [];
    if (tradeFilter === 'win') return result.trades.filter((t) => t.pnl > 0);
    if (tradeFilter === 'loss') return result.trades.filter((t) => t.pnl <= 0);
    return result.trades;
  }, [result, tradeFilter]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div
        ref={containerRef}
        className="relative w-full max-w-6xl h-[92vh] bg-[#0A0D1F]/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans"
      >
        {/* ─── Top Control Header ─────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600/30 to-emerald-500/20 border border-blue-500/30">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold tracking-tight text-white">Quant Lab Backtester</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Algorithmic Engine
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Multi-strategy institutional risk simulator & quantitative statistical backtesting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Asset Picker */}
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-blue-500"
            >
              {markets.map((m) => (
                <option key={m.symbol} value={m.symbol} className="bg-[#0E1228] text-white">
                  {m.symbol} ({m.name})
                </option>
              ))}
            </select>

            {/* Time Horizon */}
            <select
              value={sampleDays}
              onChange={(e) => setSampleDays(Number(e.target.value))}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-blue-500"
            >
              <option value={90} className="bg-[#0E1228]">90 Days (Quarterly)</option>
              <option value={180} className="bg-[#0E1228]">180 Days (Half Year)</option>
              <option value={365} className="bg-[#0E1228]">365 Days (1 Year)</option>
            </select>

            {/* Run Button */}
            <button
              onClick={handleRunBacktest}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-medium text-[12px] shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
            </button>

            {/* CSV Export */}
            {result && result.trades.length > 0 && (
              <button
                onClick={() => exportTradesToCSV(result)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/10 text-[12px] transition-colors"
                title="Download Trade Ledger as CSV for Excel/Audit"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Strategy Selector Strip ────────────────────────────────────────── */}
        <div className="px-5 py-2 border-b border-white/[0.06] bg-black/20 flex flex-wrap items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-white/40 font-mono uppercase tracking-wider mr-2">Strategy Model:</span>
          {AVAILABLE_STRATEGIES.map((strat) => {
            const isActive = selectedStrategy === strat.id;
            return (
              <button
                key={strat.id}
                onClick={() => {
                  setSelectedStrategy(strat.id);
                  setTimeout(handleRunBacktest, 50);
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-[450] transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm shadow-blue-500/20'
                    : 'bg-white/[0.02] text-white/60 border-white/[0.04] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>{strat.name.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Institutional KPI Summary Cards ────────────────────────────────── */}
        {result && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 border-b border-white/[0.06] bg-black/10">
            {/* 1. Net Return & Alpha */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between">
              <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Strategy Return</div>
              <div
                className={`text-[18px] font-mono font-bold leading-tight ${
                  result.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.totalReturnPercent >= 0 ? '+' : ''}
                {result.totalReturnPercent}%
              </div>
              <div className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                <span>Alpha:</span>
                <span className={result.alphaPercent >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                  {result.alphaPercent >= 0 ? '+' : ''}
                  {result.alphaPercent}%
                </span>
              </div>
            </div>

            {/* 2. Benchmark (Buy & Hold) */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between">
              <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Buy & Hold</div>
              <div
                className={`text-[18px] font-mono font-bold leading-tight ${
                  result.benchmarkReturnPercent >= 0 ? 'text-white' : 'text-rose-400'
                }`}
              >
                {result.benchmarkReturnPercent >= 0 ? '+' : ''}
                {result.benchmarkReturnPercent}%
              </div>
              <div className="text-[10px] font-mono text-white/40">Market Passive Return</div>
            </div>

            {/* 3. Sharpe Ratio (Academic Hallmark) */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Sharpe Ratio</span>
                <Award className="w-3 h-3 text-amber-400" />
              </div>
              <div
                className={`text-[18px] font-mono font-bold leading-tight ${
                  result.sharpeRatio >= 1.5
                    ? 'text-emerald-400'
                    : result.sharpeRatio >= 1.0
                    ? 'text-blue-400'
                    : 'text-amber-400'
                }`}
              >
                {result.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-[10px] font-mono text-white/50">
                {result.sharpeRatio >= 2.0
                  ? 'Institutional grade (>2.0)'
                  : result.sharpeRatio >= 1.0
                  ? 'Adequate risk/reward'
                  : 'High volatility drag'}
              </div>
            </div>

            {/* 4. Maximum Drawdown */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between">
              <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Max Drawdown</div>
              <div className="text-[18px] font-mono font-bold leading-tight text-rose-400">
                -{result.maxDrawdownPercent}%
              </div>
              <div className="text-[10px] font-mono text-white/40">Peak-to-Trough Decline</div>
            </div>

            {/* 5. Win Rate % */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between">
              <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Win Rate</div>
              <div className="text-[18px] font-mono font-bold leading-tight text-emerald-400">
                {result.winRatePercent}%
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex mt-1">
                <div style={{ width: `${result.winRatePercent}%` }} className="bg-emerald-400 h-full" />
                <div style={{ width: `${100 - result.winRatePercent}%` }} className="bg-rose-500 h-full" />
              </div>
            </div>

            {/* 6. Profit Factor */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between">
              <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Profit Factor</div>
              <div className="text-[18px] font-mono font-bold leading-tight text-white">
                {result.profitFactor}x
              </div>
              <div className="text-[10px] font-mono text-white/50">
                {result.winningTrades}W / {result.losingTrades}L ({result.totalTrades} Total)
              </div>
            </div>
          </div>
        )}

        {/* ─── Navigation Tabs ────────────────────────────────────────────────── */}
        <div className="h-[40px] px-5 border-b border-white/[0.06] bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1.5 py-2 font-[450] text-[12px] border-b-2 transition-colors ${
                activeTab === 'chart'
                  ? 'border-blue-500 text-white font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Equity Curve & Drawdown</span>
            </button>

            <button
              onClick={() => setActiveTab('trades')}
              className={`flex items-center gap-1.5 py-2 font-[450] text-[12px] border-b-2 transition-colors ${
                activeTab === 'trades'
                  ? 'border-blue-500 text-white font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Trade Execution Ledger</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                {result?.trades.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('parameters')}
              className={`flex items-center gap-1.5 py-2 font-[450] text-[12px] border-b-2 transition-colors ${
                activeTab === 'parameters'
                  ? 'border-blue-500 text-white font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parameter Tuning & Risk</span>
            </button>

            <button
              onClick={() => setActiveTab('viva')}
              className={`flex items-center gap-1.5 py-2 font-[450] text-[12px] border-b-2 transition-colors ${
                activeTab === 'viva'
                  ? 'border-emerald-400 text-emerald-300 font-semibold'
                  : 'border-transparent text-emerald-400/60 hover:text-emerald-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quant Formulas & Viva Guide</span>
            </button>
          </div>

          {/* Quick legend for chart */}
          {activeTab === 'chart' && (
            <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-emerald-400" />
                <span className="text-white/70">Algorithm Equity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-white/40" />
                <span className="text-white/40">Benchmark (Buy & Hold)</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tab Content Area ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: Equity Curve & Drawdown Chart */}
          {activeTab === 'chart' && result && chartMetrics && (
            <div className="flex flex-col gap-4">
              {/* Main SVG Equity Curve */}
              <div className="relative h-[260px] w-full bg-black/40 rounded-xl border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden">
                {/* Hover Inspector Tooltip */}
                {currentHoverPoint && (
                  <div className="absolute top-3 left-4 z-20 px-3 py-1.5 rounded-lg bg-[#121633]/90 border border-blue-500/40 backdrop-blur-md shadow-xl text-[11px] font-mono flex items-center gap-4 animate-fade-in">
                    <div>
                      <span className="text-white/40">Date: </span>
                      <span className="text-white font-medium">{currentHoverPoint.dateStr}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-semibold">
                        Algo: ${currentHoverPoint.strategyEquity.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">
                        Hold: ${currentHoverPoint.benchmarkEquity.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-rose-400">DD: -{currentHoverPoint.drawdownPercent}%</span>
                    </div>
                  </div>
                )}

                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 1000 240"
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoverPointIndex(null)}
                >
                  <defs>
                    <linearGradient id="algoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Grid Lines */}
                  {[0.2, 0.5, 0.8].map((ratio) => {
                    const y = ratio * 240;
                    const val = chartMetrics.topBound - ratio * chartMetrics.eqRange;
                    return (
                      <g key={ratio}>
                        <line x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                        <text x="990" y={y - 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="monospace">
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
                        const y = 240 - ((p.benchmarkEquity - chartMetrics.bottomBound) / chartMetrics.eqRange) * 240;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />

                  {/* Strategy Filled Area */}
                  <path
                    d={`${chartMetrics.pts
                      .map((p, i) => {
                        const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                        const y = 240 - ((p.strategyEquity - chartMetrics.bottomBound) / chartMetrics.eqRange) * 240;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')} L 1000 240 L 0 240 Z`}
                    fill="url(#algoGrad)"
                  />

                  {/* Strategy Equity Line */}
                  <path
                    d={chartMetrics.pts
                      .map((p, i) => {
                        const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                        const y = 240 - ((p.strategyEquity - chartMetrics.bottomBound) / chartMetrics.eqRange) * 240;
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
                        height="240"
                        fill="transparent"
                        onMouseEnter={() => setHoverPointIndex(i)}
                      />
                    );
                  })}

                  {/* Active Hover Point Circle */}
                  {hoverPointIndex !== null && (
                    <circle
                      cx={(hoverPointIndex / (chartMetrics.pts.length - 1)) * 1000}
                      cy={
                        240 -
                        ((chartMetrics.pts[hoverPointIndex].strategyEquity - chartMetrics.bottomBound) /
                          chartMetrics.eqRange) *
                          240
                      }
                      r="5"
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                </svg>
              </div>

              {/* Underwater Drawdown Chart */}
              <div className="h-[100px] w-full bg-black/40 rounded-xl border border-white/[0.06] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-white/40">Underwater Drawdown Profile (Risk Exposure)</span>
                  <span className="text-rose-400">Max DD: -{result.maxDrawdownPercent}%</span>
                </div>
                <svg className="w-full h-[60px]" viewBox="0 0 1000 60" preserveAspectRatio="none">
                  <path
                    d={`M 0 0 ${chartMetrics.pts
                      .map((p, i) => {
                        const x = (i / (chartMetrics.pts.length - 1)) * 1000;
                        const y = (p.drawdownPercent / chartMetrics.maxDd) * 60;
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
            <div className="flex flex-col gap-3">
              {/* Filter controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(['all', 'win', 'loss'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTradeFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono uppercase transition-colors ${
                        tradeFilter === filter
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'bg-white/[0.04] text-white/50 hover:text-white'
                      }`}
                    >
                      {filter === 'all'
                        ? `All (${result.trades.length})`
                        : filter === 'win'
                        ? `Wins (${result.winningTrades})`
                        : `Losses (${result.losingTrades})`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => exportTradesToCSV(result)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download CSV Ledger</span>
                </button>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-black/30">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-white/[0.04] text-white/50 border-b border-white/[0.06]">
                    <tr>
                      <th className="p-2.5">Trade #</th>
                      <th className="p-2.5">Direction</th>
                      <th className="p-2.5">Entry Date & Price</th>
                      <th className="p-2.5">Exit Date & Price</th>
                      <th className="p-2.5">Position Size</th>
                      <th className="p-2.5">Net PnL ($)</th>
                      <th className="p-2.5">Return (%)</th>
                      <th className="p-2.5">Capital Balance</th>
                      <th className="p-2.5">Exit Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredTrades.map((t) => {
                      const isWin = t.pnl > 0;
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-2.5 text-white/60">#{t.tradeNum}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                              LONG
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="text-white">${t.entryPrice.toLocaleString()}</div>
                            <div className="text-white/40 text-[10px]">{t.entryDate}</div>
                          </td>
                          <td className="p-2.5">
                            <div className="text-white">${t.exitPrice.toLocaleString()}</div>
                            <div className="text-white/40 text-[10px]">{t.exitDate}</div>
                          </td>
                          <td className="p-2.5 text-white/80">{t.size.toFixed(4)}</td>
                          <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}${t.pnl.toLocaleString()}
                          </td>
                          <td className={`p-2.5 font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{t.pnlPercent}%
                          </td>
                          <td className="p-2.5 text-white">${t.cumulativeEquity.toLocaleString()}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
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

          {/* TAB 3: Parameter Tuning Drawer */}
          {activeTab === 'parameters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              {/* Portfolio & Risk Parameters */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-400" />
                  <span>Risk Management & Execution Controls</span>
                </h3>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
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
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
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
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-white/50">Stop Loss Limit (%)</span>
                    <span className="text-rose-400 font-medium">-{config.stopLossPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={0.5}
                    value={config.stopLossPercent}
                    onChange={(e) => setConfig({ ...config, stopLossPercent: Number(e.target.value) })}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-white/50">Take Profit Target (%)</span>
                    <span className="text-emerald-400 font-medium">+{config.takeProfitPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={config.takeProfitPercent}
                    onChange={(e) => setConfig({ ...config, takeProfitPercent: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-white/50">Fee & Slippage Modeling (% per side)</span>
                    <span className="text-white/80 font-mono">{config.feePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={config.feePercent}
                    onChange={(e) => setConfig({ ...config, feePercent: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Strategy Specific Indicator Parameters */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Strategy Mathematical Inputs</span>
                </h3>

                {selectedStrategy === 'ema_cross' && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">Fast EMA Period</span>
                        <span className="text-blue-400 font-semibold">{config.fastEma} bars</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={30}
                        value={config.fastEma}
                        onChange={(e) => setConfig({ ...config, fastEma: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">Slow EMA Period</span>
                        <span className="text-blue-400 font-semibold">{config.slowEma} bars</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        value={config.slowEma}
                        onChange={(e) => setConfig({ ...config, slowEma: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </>
                )}

                {selectedStrategy === 'rsi_reversion' && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">RSI Calculation Period</span>
                        <span className="text-emerald-400 font-semibold">{config.rsiPeriod} bars</span>
                      </div>
                      <input
                        type="range"
                        min={7}
                        max={28}
                        value={config.rsiPeriod}
                        onChange={(e) => setConfig({ ...config, rsiPeriod: Number(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">Oversold Trigger Level</span>
                        <span className="text-emerald-400 font-semibold">{config.rsiOversold}</span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={45}
                        value={config.rsiOversold}
                        onChange={(e) => setConfig({ ...config, rsiOversold: Number(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">Overbought Exit Level</span>
                        <span className="text-rose-400 font-semibold">{config.rsiOverbought}</span>
                      </div>
                      <input
                        type="range"
                        min={55}
                        max={85}
                        value={config.rsiOverbought}
                        onChange={(e) => setConfig({ ...config, rsiOverbought: Number(e.target.value) })}
                        className="w-full accent-rose-500"
                      />
                    </div>
                  </>
                )}

                {selectedStrategy === 'macd_momentum' && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">MACD Fast Period</span>
                        <span className="text-blue-400 font-semibold">{config.macdFast}</span>
                      </div>
                      <input
                        type="range"
                        min={6}
                        max={20}
                        value={config.macdFast}
                        onChange={(e) => setConfig({ ...config, macdFast: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">MACD Slow Period</span>
                        <span className="text-blue-400 font-semibold">{config.macdSlow}</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={40}
                        value={config.macdSlow}
                        onChange={(e) => setConfig({ ...config, macdSlow: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </>
                )}

                {selectedStrategy === 'bollinger_breakout' && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">SMA Period</span>
                        <span className="text-amber-400 font-semibold">{config.bbPeriod}</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={40}
                        value={config.bbPeriod}
                        onChange={(e) => setConfig({ ...config, bbPeriod: Number(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-white/50">Standard Deviation Multiplier (σ)</span>
                        <span className="text-amber-400 font-semibold">{config.bbStdDev}σ</span>
                      </div>
                      <input
                        type="range"
                        min={1.5}
                        max={3.0}
                        step={0.1}
                        value={config.bbStdDev}
                        onChange={(e) => setConfig({ ...config, bbStdDev: Number(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={handleRunBacktest}
                  className="mt-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[12px] transition-colors"
                >
                  Apply & Re-run Simulation
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Quantitative Formulas & Viva Guide (Academic Showcase) */}
          {activeTab === 'viva' && (
            <div className="space-y-4 max-w-4xl text-[12px] text-white/80 leading-relaxed">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 to-black/60 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2 text-blue-300 font-semibold text-[14px]">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>College Project Viva Presentation Notes</span>
                </div>
                <p className="text-white/60 mb-3">
                  These mathematical formulas and definitions explain how the quantitative engine calculates
                  risk-adjusted performance without lookahead bias.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sharpe Ratio */}
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="font-semibold text-emerald-400 font-mono mb-1">
                      1. Annualized Sharpe Ratio ($S$)
                    </div>
                    <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-blue-300 mb-2 border border-white/[0.04]">
                      Sharpe = [(Mean Daily Return - R_f) / Daily StdDev] × √252
                    </div>
                    <p className="text-[11px] text-white/60">
                      Measures excess return earned per unit of total risk (volatility). An annualized Sharpe ratio
                      &gt; 1.0 is considered good in hedge funds; &gt; 2.0 is institutional alpha.
                    </p>
                  </div>

                  {/* Sortino Ratio */}
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="font-semibold text-emerald-400 font-mono mb-1">
                      2. Sortino Ratio
                    </div>
                    <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-blue-300 mb-2 border border-white/[0.04]">
                      Sortino = [(Mean Daily Return - R_f) / Downside Deviation] × √252
                    </div>
                    <p className="text-[11px] text-white/60">
                      Unlike Sharpe which penalizes upside volatility (big gains), Sortino only penalizes negative
                      returns (downside losses), providing a more realistic assessment of downside risk.
                    </p>
                  </div>

                  {/* Maximum Drawdown */}
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="font-semibold text-rose-400 font-mono mb-1">
                      3. Maximum Drawdown (MDD)
                    </div>
                    <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-rose-300 mb-2 border border-white/[0.04]">
                      MDD = max[(Peak_Equity - Trough_Equity) / Peak_Equity] × 100%
                    </div>
                    <p className="text-[11px] text-white/60">
                      Quantifies the worst-case capital decline a trader would experience during the historical period.
                      Vital for margin requirements and liquidation risk.
                    </p>
                  </div>

                  {/* Alpha */}
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="font-semibold text-emerald-400 font-mono mb-1">
                      4. Strategy Alpha (α)
                    </div>
                    <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-emerald-300 mb-2 border border-white/[0.04]">
                      Alpha = Strategy Total Return (%) - Buy & Hold Return (%)
                    </div>
                    <p className="text-[11px] text-white/60">
                      Shows whether active algorithmic trading generated excess returns over simply holding the asset
                      passively.
                    </p>
                  </div>
                </div>
              </div>

              {/* Strategy Rules Explanation */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Execution Rules for Current Strategy: {result?.strategyName}</span>
                </h4>
                <p className="text-white/60 text-[11px] mb-2">
                  {AVAILABLE_STRATEGIES.find((s) => s.id === selectedStrategy)?.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="font-bold">Advantages: </span>
                    {AVAILABLE_STRATEGIES.find((s) => s.id === selectedStrategy)?.pros}
                  </div>
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <span className="font-bold">Limitations: </span>
                    {AVAILABLE_STRATEGIES.find((s) => s.id === selectedStrategy)?.cons}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
