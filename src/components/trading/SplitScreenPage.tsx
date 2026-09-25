import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTrading } from '@/context/TradingContext';
import { MarketTicker } from '@/types/trading';
import type { Candle } from '@/types/trading';
import {
  X,
  ChevronDown,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Columns,
  Rows,
  PanelLeft,
  RefreshCw,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SplitLayout = '1x1' | '1x2' | '2x1' | '2x2' | '3-left' | '3-right' | '4-focus';
type ChartStyle = 'candles' | 'line' | 'area';

interface PanelConfig {
  id: string;
  symbol: string;
  timeframe: string;
  chartStyle: ChartStyle;
  showEMA: boolean;
  showBB: boolean;
  showVolume: boolean;
  label?: string;
}

// ─── Candle generator ─────────────────────────────────────────────────────────

function generatePanelCandles(basePrice: number, precision = 2, count = 70): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const step = 60_000 * 5;
  let price = basePrice;
  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * step;
    const vol = Math.max(0.001, price * 0.0028);
    const change = (Math.random() - 0.49) * vol;
    const close = +Math.max(0.001, price).toFixed(precision);
    const open = +Math.max(0.001, price - change).toFixed(precision);
    const high = +(Math.max(open, close) + Math.random() * vol * 0.4).toFixed(precision);
    const low = +Math.max(0.001, Math.min(open, close) - Math.random() * vol * 0.4).toFixed(precision);
    candles.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 80 + 15) });
    price = open;
  }
  return candles;
}

// ─── Mini Chart Panel ──────────────────────────────────────────────────────────

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'];

interface MiniPanelProps {
  config: PanelConfig;
  isActive: boolean;
  markets: MarketTicker[];
  onActivate: () => void;
  onUpdate: (u: Partial<PanelConfig>) => void;
  onClose?: () => void;
  panelIndex: number;
  compact?: boolean;
}

const MiniPanel: React.FC<MiniPanelProps> = ({
  config,
  isActive,
  markets,
  onActivate,
  onUpdate,
  onClose,
  panelIndex,
  compact = false,
}) => {
  const market = useMemo(
    () => markets.find((m) => m.symbol === config.symbol) ?? markets[panelIndex % markets.length],
    [markets, config.symbol, panelIndex]
  );

  const [candles, setCandles] = useState<Candle[]>(() =>
    generatePanelCandles(market?.price ?? 100, market?.precision ?? 2)
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const [symOpen, setSymOpen] = useState(false);
  const [tfOpen, setTfOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const symRef = useRef<HTMLDivElement>(null);
  const tfRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (market) setCandles(generatePanelCandles(market.price, market.precision ?? 2));
  }, [market?.symbol]);

  // Live price drift
  useEffect(() => {
    const id = setInterval(() => {
      if (!market) return;
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const vol = Math.max(0.001, last.close * 0.0018);
        const delta = (Math.random() - 0.49) * vol;
        const nc = +Math.max(0.001, last.close + delta).toFixed(market.precision ?? 2);
        setFlash(nc > last.close ? 'up' : 'down');
        setTimeout(() => setFlash(null), 350);
        return [
          ...prev.slice(0, -1),
          { ...last, close: nc, high: Math.max(last.high, nc), low: Math.min(last.low, nc) },
        ];
      });
    }, 1800 + panelIndex * 250);
    return () => clearInterval(id);
  }, [market?.symbol, panelIndex]);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (symRef.current && !symRef.current.contains(e.target as Node)) setSymOpen(false);
      if (tfRef.current && !tfRef.current.contains(e.target as Node)) setTfOpen(false);
      if (styleRef.current && !styleRef.current.contains(e.target as Node)) setStyleOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Chart math
  const W = 600, H = compact ? 160 : 220;
  const count = candles.length;
  const cw = W / Math.max(1, count);

  const { minP, range, maxVol } = useMemo(() => {
    if (!candles.length) return { minP: 1, range: 1, maxVol: 1 };
    let mn = Infinity, mx = -Infinity, mv = 0;
    candles.forEach((c) => {
      if (c.low < mn) mn = c.low;
      if (c.high > mx) mx = c.high;
      if (c.volume > mv) mv = c.volume;
    });
    const pad = (mx - mn) * 0.1 || (market?.price ?? 1) * 0.005 || 1;
    return { minP: Math.max(0.0001, mn - pad), range: (mx - mn + pad * 2) || 1, maxVol: mv || 1 };
  }, [candles, market?.price]);

  const gy = (p: number) => Math.max(2, Math.min(H - 2, H - ((p - minP) / range) * H));
  const gx = (i: number) => i * cw + cw / 2;

  const ema20 = useMemo(() => {
    if (!candles.length) return [];
    const k = 2 / 21;
    let e = candles[0].close;
    return candles.map((c) => { e = c.close * k + e * (1 - k); return e; });
  }, [candles]);

  const linePts = candles.map((c, i) => `${i === 0 ? 'M' : 'L'}${gx(i)},${gy(c.close)}`).join(' ');
  const areaPts = linePts + ` L${gx(count - 1)},${H} L${gx(0)},${H} Z`;

  const last = candles[candles.length - 1];
  const hover = hoverIdx !== null ? candles[hoverIdx] : last;
  const prec = market?.precision ?? 2;
  const liveP = last?.close ?? market?.price ?? 0;
  const liveY = gy(liveP);
  const chg = candles.length > 1 ? ((last.close - candles[0].close) / candles[0].close) * 100 : 0;
  const isUp = chg >= 0;

  const catColor = market?.category === 'crypto' ? 'bg-amber-400' : market?.category === 'forex' ? 'bg-cyan-400' : 'bg-blue-400';

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer select-none ${
        isActive
          ? 'border-blue-500/60 shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_0_24px_rgba(59,130,246,0.12)]'
          : 'border-white/[0.06] hover:border-white/[0.12]'
      } bg-[#060818]/95`}
      onClick={onActivate}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/[0.05] bg-black/30 shrink-0 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Symbol */}
        <div className="relative" ref={symRef}>
          <button
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-mono font-bold text-white transition-all"
            onClick={() => { setSymOpen(v => !v); setTfOpen(false); setStyleOpen(false); }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${catColor}`} />
            {config.symbol}
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>
          {symOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl bg-[#0C1026]/98 border border-white/[0.12] shadow-2xl backdrop-blur-xl overflow-hidden">
              <div className="py-1 max-h-60 overflow-y-auto">
                {markets.map((m) => (
                  <button
                    key={m.symbol}
                    className={`w-full text-left px-3 py-2 text-[11px] font-mono flex items-center gap-2 hover:bg-white/[0.06] transition-colors ${m.symbol === config.symbol ? 'text-blue-300 bg-blue-500/10' : 'text-white/70'}`}
                    onClick={() => { onUpdate({ symbol: m.symbol }); setSymOpen(false); }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.category === 'crypto' ? 'bg-amber-400' : m.category === 'forex' ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                    <span className="font-bold">{m.symbol}</span>
                    <span className="ml-auto text-[10px] text-white/30 capitalize">{m.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeframe */}
        <div className="relative" ref={tfRef}>
          <button
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-white/55 hover:text-white transition-all"
            onClick={() => { setTfOpen(v => !v); setSymOpen(false); setStyleOpen(false); }}
          >
            {config.timeframe}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {tfOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-xl bg-[#0C1026]/98 border border-white/[0.12] shadow-2xl backdrop-blur-xl overflow-hidden">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  className={`block w-full text-left px-4 py-2 text-[11px] font-mono hover:bg-white/[0.08] transition-colors ${tf === config.timeframe ? 'text-blue-300 bg-blue-500/10' : 'text-white/55'}`}
                  onClick={() => { onUpdate({ timeframe: tf }); setTfOpen(false); }}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Style */}
        <div className="relative" ref={styleRef}>
          <button
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-white/45 hover:text-white transition-all"
            onClick={() => { setStyleOpen(v => !v); setSymOpen(false); setTfOpen(false); }}
          >
            {config.chartStyle === 'candles' ? '📊' : config.chartStyle === 'line' ? '📈' : '🌊'}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {styleOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-xl bg-[#0C1026]/98 border border-white/[0.12] shadow-2xl backdrop-blur-xl overflow-hidden">
              {(['candles', 'line', 'area'] as ChartStyle[]).map((s) => (
                <button
                  key={s}
                  className={`block w-full text-left px-4 py-2 text-[11px] font-mono hover:bg-white/[0.08] transition-colors capitalize ${s === config.chartStyle ? 'text-blue-300 bg-blue-500/10' : 'text-white/55'}`}
                  onClick={() => { onUpdate({ chartStyle: s }); setStyleOpen(false); }}
                >
                  {s === 'candles' ? '📊 Candles' : s === 'line' ? '📈 Line' : '🌊 Area'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EMA toggle */}
        <button
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${config.showEMA ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-white/[0.06] text-white/30 hover:text-white'}`}
          onClick={() => onUpdate({ showEMA: !config.showEMA })}
        >
          EMA
        </button>
        <button
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${config.showVolume ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'border-white/[0.06] text-white/30 hover:text-white'}`}
          onClick={() => onUpdate({ showVolume: !config.showVolume })}
        >
          Vol
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Live price */}
        <span className={`font-mono text-[12px] font-bold tabular-nums transition-colors duration-200 ${flash === 'up' ? 'text-emerald-300' : flash === 'down' ? 'text-rose-300' : 'text-white'}`}>
          {liveP.toFixed(Math.min(prec, 5))}
        </span>
        <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
          {isUp ? '+' : ''}{chg.toFixed(2)}%
        </span>

        {/* Refresh */}
        <button
          className="p-1 rounded hover:bg-white/[0.08] text-white/25 hover:text-white/80 transition-all"
          onClick={() => market && setCandles(generatePanelCandles(market.price, market.precision ?? 2))}
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>

        {/* Close */}
        {onClose && (
          <button
            className="p-1 rounded hover:bg-rose-500/20 text-white/25 hover:text-rose-400 transition-all"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* OHLCV bar */}
      {hover && !compact && (
        <div className="flex items-center gap-3 px-2.5 py-0.5 text-[10px] font-mono border-b border-white/[0.04] bg-black/10 shrink-0 overflow-x-auto whitespace-nowrap">
          <span className="text-white/35">O <span className="text-white/75">{hover.open.toFixed(prec)}</span></span>
          <span className="text-white/35">H <span className="text-emerald-400">{hover.high.toFixed(prec)}</span></span>
          <span className="text-white/35">L <span className="text-rose-400">{hover.low.toFixed(prec)}</span></span>
          <span className="text-white/35">C <span className={hover.close >= hover.open ? 'text-emerald-400' : 'text-rose-400'}>{hover.close.toFixed(prec)}</span></span>
          <span className="text-white/35">Vol <span className="text-white/55">{hover.volume}</span></span>
        </div>
      )}

      {/* SVG Chart */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <svg
          className="w-full h-full cursor-crosshair"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHoverIdx(Math.min(count - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * count))));
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`ag-${config.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.28" />
              <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`ug-${config.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id={`dg-${config.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" /><stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="rgba(255,255,255,0.035)" strokeWidth={1} />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={`v${f}`} x1={W * f} y1={0} x2={W * f} y2={H} stroke="rgba(255,255,255,0.02)" strokeWidth={1} />
          ))}

          {/* Volume bars */}
          {config.showVolume && candles.map((c, i) => {
            const vh = (c.volume / maxVol) * H * 0.15;
            return <rect key={`v${i}`} x={i * cw + 0.5} y={H - vh} width={Math.max(0.5, cw - 1)} height={vh}
              fill={c.close >= c.open ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'} />;
          })}

          {/* Area */}
          {config.chartStyle === 'area' && <path d={areaPts} fill={`url(#ag-${config.id})`} />}

          {/* Line / Area stroke */}
          {(config.chartStyle === 'line' || config.chartStyle === 'area') && (
            <path d={linePts} fill="none" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={1.5} />
          )}

          {/* Candles */}
          {config.chartStyle === 'candles' && candles.map((c, i) => {
            const bull = c.close >= c.open;
            const bTop = gy(Math.max(c.open, c.close));
            const bBot = gy(Math.min(c.open, c.close));
            const bH = Math.max(1, bBot - bTop);
            const cx = i * cw + cw / 2;
            return (
              <g key={`c${i}`}>
                <line x1={cx} y1={gy(c.high)} x2={cx} y2={gy(c.low)} stroke={bull ? '#10b981' : '#f43f5e'} strokeWidth={1} opacity={0.65} />
                <rect x={i * cw + cw * 0.1} y={bTop} width={Math.max(0.5, cw * 0.8)} height={bH}
                  fill={bull ? `url(#ug-${config.id})` : `url(#dg-${config.id})`} rx={0.5} />
              </g>
            );
          })}

          {/* EMA */}
          {config.showEMA && ema20.length > 1 && (
            <polyline points={ema20.map((v, i) => `${gx(i)},${gy(v)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth={1.2} opacity={0.75} />
          )}

          {/* Crosshair */}
          {hoverIdx !== null && (
            <>
              <line x1={gx(hoverIdx)} y1={0} x2={gx(hoverIdx)} y2={H} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="3,3" />
              <circle cx={gx(hoverIdx)} cy={gy(candles[hoverIdx]?.close ?? liveP)} r={3} fill={isUp ? '#10b981' : '#f43f5e'} opacity={0.9} />
            </>
          )}

          {/* Live price line */}
          <line x1={0} y1={liveY} x2={W} y2={liveY} stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={0.8} strokeDasharray="4,4" opacity={0.45} />
          <rect x={W - 72} y={liveY - 8} width={70} height={16} rx={3} fill={isUp ? '#059669' : '#e11d48'} opacity={0.9} />
          <text x={W - 37} y={liveY + 4.5} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="white" fontWeight="bold">
            {liveP.toFixed(Math.min(prec, 5))}
          </text>
        </svg>

        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
        )}
      </div>
    </div>
  );
};

// ─── Layout definitions ────────────────────────────────────────────────────────

const LAYOUTS: { key: SplitLayout; label: string; panels: number; icon: React.ReactNode }[] = [
  { key: '1x1', label: 'Single', panels: 1, icon: <Maximize2 className="w-3.5 h-3.5" /> },
  { key: '1x2', label: '1×2', panels: 2, icon: <Columns className="w-3.5 h-3.5" /> },
  { key: '2x1', label: '2×1', panels: 2, icon: <Rows className="w-3.5 h-3.5" /> },
  { key: '2x2', label: '2×2', panels: 4, icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { key: '3-left', label: '3 (L)', panels: 3, icon: <PanelLeft className="w-3.5 h-3.5" /> },
  { key: '3-right', label: '3 (R)', panels: 3, icon: <PanelLeft className="w-3.5 h-3.5 rotate-180" /> },
  { key: '4-focus', label: '4 Focus', panels: 4, icon: <BarChart2 className="w-3.5 h-3.5" /> },
];

const DEFAULT_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'NVDA/USD', 'AAPL/USD', 'SOL/USDT', 'TSLA/USD'];

function mkPanel(sym: string, i: number): PanelConfig {
  return { id: `p-${Date.now()}-${i}`, symbol: sym, timeframe: '5m', chartStyle: 'candles', showEMA: true, showBB: false, showVolume: true };
}

// ─── SplitScreenPage (full page) ───────────────────────────────────────────────

export const SplitScreenPage: React.FC = () => {
  const { markets, setViewMode } = useTrading();

  const [layout, setLayout] = useState<SplitLayout>('1x2');
  const [panels, setPanels] = useState<PanelConfig[]>(() =>
    DEFAULT_SYMBOLS.slice(0, 4).map((s, i) => mkPanel(s, i))
  );
  const [activeId, setActiveId] = useState<string>(() => panels[0]?.id ?? '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const active = panels.find((p) => p.id === activeId);
  const required = LAYOUTS.find((l) => l.key === layout)?.panels ?? 2;
  const visible = panels.slice(0, required);

  const updatePanel = useCallback((id: string, u: Partial<PanelConfig>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...u } : p)));
  }, []);

  const syncAll = () => {
    if (!active) return;
    setPanels((prev) =>
      prev.map((p) => (p.id === activeId ? p : { ...p, timeframe: active.timeframe, chartStyle: active.chartStyle, showEMA: active.showEMA, showVolume: active.showVolume }))
    );
  };

  // Ensure enough panels exist when layout changes
  useEffect(() => {
    if (panels.length < required) {
      const extra: PanelConfig[] = [];
      for (let i = panels.length; i < required; i++) {
        const sym = DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length] ?? 'BTC/USDT';
        extra.push(mkPanel(sym, i));
      }
      setPanels((prev) => [...prev, ...extra]);
    }
  }, [required]);

  // Stats for status bar
  const bullCount = visible.filter((p) => {
    const m = markets.find((mk) => mk.symbol === p.symbol);
    return (m?.change24h ?? 0) >= 0;
  }).length;
  const bearCount = visible.length - bullCount;

  // ─── Layout renderers ──────────────────────────────────────────────────────

  const renderPanel = (p: PanelConfig, i: number, compact = false) => (
    <MiniPanel
      key={p.id}
      config={p}
      isActive={activeId === p.id}
      markets={markets}
      onActivate={() => setActiveId(p.id)}
      onUpdate={(u) => updatePanel(p.id, u)}
      panelIndex={i}
      compact={compact}
    />
  );

  const renderGrid = () => {
    if (layout === '1x1') return <div className="h-full">{renderPanel(visible[0], 0)}</div>;
    if (layout === '1x2') return (
      <div className="grid grid-cols-2 gap-2 h-full">
        {visible.map((p, i) => <div key={p.id} className="min-h-0">{renderPanel(p, i)}</div>)}
      </div>
    );
    if (layout === '2x1') return (
      <div className="grid grid-rows-2 gap-2 h-full">
        {visible.map((p, i) => <div key={p.id} className="min-h-0">{renderPanel(p, i)}</div>)}
      </div>
    );
    if (layout === '2x2') return (
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
        {visible.map((p, i) => <div key={p.id} className="min-h-0">{renderPanel(p, i)}</div>)}
      </div>
    );
    if (layout === '3-left') return (
      <div className="flex gap-2 h-full">
        <div className="flex-[2] min-w-0">{renderPanel(visible[0], 0)}</div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {visible.slice(1).map((p, i) => <div key={p.id} className="flex-1 min-h-0">{renderPanel(p, i + 1, true)}</div>)}
        </div>
      </div>
    );
    if (layout === '3-right') return (
      <div className="flex gap-2 h-full">
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {visible.slice(0, 2).map((p, i) => <div key={p.id} className="flex-1 min-h-0">{renderPanel(p, i, true)}</div>)}
        </div>
        <div className="flex-[2] min-w-0">{renderPanel(visible[2], 2)}</div>
      </div>
    );
    if (layout === '4-focus') return (
      <div className="flex gap-2 h-full">
        <div className="flex-[3] min-w-0">{renderPanel(visible[0], 0)}</div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {visible.slice(1).map((p, i) => <div key={p.id} className="flex-1 min-h-0">{renderPanel(p, i + 1, true)}</div>)}
        </div>
      </div>
    );
    return null;
  };

  // ─── Market summary ticker ─────────────────────────────────────────────────

  const watchlistMarkets = useMemo(() => markets.slice(0, 8), [markets]);

  return (
    <div className={`flex flex-col text-white font-sans select-none ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-screen'} bg-transparent`}>

      {/* ─── Top Navigation Bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 h-[52px] bg-black/35 backdrop-blur-2xl border-b border-white/[0.08] px-4 flex items-center gap-3 z-30">
        {/* Brand + back */}
        <button
          onClick={() => setViewMode('landing')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
            <path d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z" fill="white" />
          </svg>
          <span className="text-white text-[14px] font-bold tracking-tight">Apogee</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">PRO</span>
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Page title */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-white tracking-wide">Multi-Chart Split Screen</span>
          <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/25 text-indigo-300">
            {visible.length} PANELS
          </span>
        </div>

        <div className="h-4 w-px bg-white/10 hidden md:block" />

        {/* Layout picker */}
        <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              title={l.label}
              onClick={() => setLayout(l.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
                layout === l.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {l.icon}
              <span className="hidden lg:inline">{l.label}</span>
            </button>
          ))}
        </div>

        {/* Sync button */}
        <button
          onClick={syncAll}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-indigo-500/15 border border-white/[0.06] hover:border-indigo-500/25 text-[10px] font-mono text-white/40 hover:text-indigo-300 transition-all"
          title="Sync all panels to active panel settings"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sync All</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Market mood badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <TrendingUp className="w-3 h-3" />{bullCount} Bull
          </span>
          <span className="text-white/15">|</span>
          <span className="flex items-center gap-1 text-rose-400">
            <TrendingDown className="w-3 h-3" />{bearCount} Bear
          </span>
        </div>

        {/* Nav actions */}
        <button
          onClick={() => setViewMode('terminal')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.08] text-[11px] font-medium transition-all"
          title="Go to Trading Terminal"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Terminal</span>
        </button>
        <button
          onClick={() => setViewMode('quant-lab')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-emerald-300 border border-emerald-500/25 text-[11px] font-medium transition-all"
          title="Quant Lab"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Quant Lab</span>
        </button>
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-white/40 hover:text-white transition-all"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ─── Watchlist Ticker Strip ─────────────────────────────────────────── */}
      <div className="shrink-0 h-[34px] bg-black/20 border-b border-white/[0.05] flex items-center px-3 gap-1 overflow-x-auto z-20">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider mr-2 shrink-0">Watchlist</span>
        {watchlistMarkets.map((m) => {
          const isWatchUp = m.change24h >= 0;
          const isActive = visible.some((p) => p.symbol === m.symbol);
          return (
            <button
              key={m.symbol}
              onClick={() => {
                if (active) updatePanel(activeId, { symbol: m.symbol });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono transition-all shrink-0 ${
                isActive
                  ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                  : 'hover:bg-white/[0.06] text-white/50 hover:text-white border border-transparent hover:border-white/[0.08]'
              }`}
              title={`Set active panel to ${m.symbol}`}
            >
              <span className={`font-bold ${isActive ? 'text-indigo-300' : 'text-white/80'}`}>{m.symbol}</span>
              <span className={isWatchUp ? 'text-emerald-400' : 'text-rose-400'}>
                {isWatchUp ? '+' : ''}{m.change24h.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Chart Grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 p-2 min-h-0 overflow-hidden">
        {renderGrid()}
      </div>

      {/* ─── Status Bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-[30px] bg-black/25 border-t border-white/[0.05] flex items-center justify-between px-4 text-[10px] font-mono text-white/30 z-20">
        <div className="flex items-center gap-4">
          <span>
            Active Panel:{' '}
            <span className="text-indigo-300 font-semibold">{active?.symbol ?? '—'}</span>
            <span className="text-white/20 mx-1">·</span>
            <span className="text-white/40">{active?.timeframe}</span>
            <span className="text-white/20 mx-1">·</span>
            <span className="text-white/40 capitalize">{active?.chartStyle}</span>
          </span>
          <span className="hidden md:flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live simulation
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/25">
          <span>Click panel to activate · Watchlist bar sets active panel's symbol</span>
          <span className="hidden lg:inline">Sync All copies active TF + style to all panels</span>
        </div>
      </div>
    </div>
  );
};
