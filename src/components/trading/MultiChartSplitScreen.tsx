import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTrading } from '@/context/TradingContext';
import { MarketTicker } from '@/types/trading';
import type { Candle } from '@/types/trading';
import { X, ChevronDown, Maximize2, Minimize2, LayoutGrid, Columns, Rows, PanelLeft, RefreshCw } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SplitLayout = '1x1' | '1x2' | '2x1' | '2x2' | '3-left' | '3-right';
type ChartStyle = 'candles' | 'line' | 'area';

interface PanelConfig {
  id: string;
  symbol: string;
  timeframe: string;
  chartStyle: ChartStyle;
  showEMA: boolean;
  showBB: boolean;
  showVolume: boolean;
}

interface MiniChartPanelProps {
  config: PanelConfig;
  isActive: boolean;
  markets: MarketTicker[];
  candles: Candle[];
  onActivate: () => void;
  onUpdate: (updates: Partial<PanelConfig>) => void;
  onClose?: () => void;
  panelIndex: number;
  totalPanels: number;
}

// ─── Candle generator helper ───────────────────────────────────────────────────

function generatePanelCandles(basePrice: number, precision: number, count = 60): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const step = 60 * 1000 * 5;
  let price = basePrice;
  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * step;
    const vol = Math.max(0.001, price * 0.0025);
    const change = (Math.random() - 0.49) * vol;
    const close = Number(Math.max(0.001, price).toFixed(precision));
    const open = Number(Math.max(0.001, price - change).toFixed(precision));
    const high = Number((Math.max(open, close) + Math.random() * vol * 0.4).toFixed(precision));
    const low = Number(Math.max(0.001, Math.min(open, close) - Math.random() * vol * 0.4).toFixed(precision));
    candles.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 80 + 15) });
    price = open;
  }
  return candles;
}

// ─── Mini Chart Panel ──────────────────────────────────────────────────────────

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'];

const MiniChartPanel: React.FC<MiniChartPanelProps> = ({
  config,
  isActive,
  markets,
  onActivate,
  onUpdate,
  onClose,
  panelIndex,
}) => {
  const market = useMemo(
    () => markets.find((m) => m.symbol === config.symbol) ?? markets[panelIndex % markets.length],
    [markets, config.symbol, panelIndex]
  );

  const [localCandles, setLocalCandles] = useState<Candle[]>(() =>
    generatePanelCandles(market?.price ?? 100, market?.precision ?? 2)
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [isSymbolOpen, setIsSymbolOpen] = useState(false);
  const [isTfOpen, setIsTfOpen] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const prevPriceRef = useRef(market?.price ?? 0);
  const symbolDropRef = useRef<HTMLDivElement>(null);
  const tfDropRef = useRef<HTMLDivElement>(null);
  const styleDropRef = useRef<HTMLDivElement>(null);

  // Refresh candles when symbol changes
  useEffect(() => {
    if (market) {
      setLocalCandles(generatePanelCandles(market.price, market.precision ?? 2));
      prevPriceRef.current = market.price;
    }
  }, [market?.symbol]);

  // Live price pulse simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!market) return;
      setLocalCandles((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const vol = Math.max(0.001, market.price * 0.0015);
        const delta = (Math.random() - 0.49) * vol;
        const newClose = Number(Math.max(0.001, last.close + delta).toFixed(market.precision ?? 2));
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);
        const updated = [...prev.slice(0, -1), { ...last, close: newClose, high: newHigh, low: newLow }];
        if (newClose > last.close) setPriceFlash('up');
        else if (newClose < last.close) setPriceFlash('down');
        setTimeout(() => setPriceFlash(null), 400);
        return updated;
      });
    }, 2000 + panelIndex * 300);
    return () => clearInterval(interval);
  }, [market?.symbol, panelIndex]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (symbolDropRef.current && !symbolDropRef.current.contains(e.target as Node)) setIsSymbolOpen(false);
      if (tfDropRef.current && !tfDropRef.current.contains(e.target as Node)) setIsTfOpen(false);
      if (styleDropRef.current && !styleDropRef.current.contains(e.target as Node)) setIsStyleOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Chart math
  const chartHeight = 200;
  const chartWidth = 600;
  const candleCount = localCandles.length;
  const colWidth = chartWidth / Math.max(1, candleCount);

  const { minPrice, priceRange, maxVolume } = useMemo(() => {
    if (!localCandles.length) return { minPrice: 1, priceRange: 1, maxVolume: 1 };
    let min = Infinity, max = -Infinity, maxVol = 0;
    localCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });
    const pad = (max - min) * 0.1 || market?.price * 0.005 || 1;
    return { minPrice: Math.max(0.0001, min - pad), priceRange: (max - min + pad * 2) || 1, maxVolume: maxVol || 1 };
  }, [localCandles, market?.price]);

  const getY = (p: number) => Math.max(2, Math.min(chartHeight - 2, chartHeight - ((p - minPrice) / priceRange) * chartHeight));
  const getX = (i: number) => i * colWidth + colWidth / 2;

  const ema20 = useMemo(() => {
    if (!localCandles.length) return [];
    const k = 2 / 21;
    let e = localCandles[0].close;
    return localCandles.map((c) => { e = c.close * k + e * (1 - k); return e; });
  }, [localCandles]);

  const lastCandle = localCandles[localCandles.length - 1];
  const hoverCandle = hoverIdx !== null ? localCandles[hoverIdx] : lastCandle;
  const precision = market?.precision ?? 2;
  const livePrice = lastCandle?.close ?? market?.price ?? 0;
  const liveY = getY(livePrice);
  const change = lastCandle ? ((lastCandle.close - localCandles[0].close) / localCandles[0].close) * 100 : 0;
  const isUp = change >= 0;

  // Line/area path
  const linePath = useMemo(() => {
    if (localCandles.length < 2) return '';
    return localCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.close)}`).join(' ');
  }, [localCandles, minPrice, priceRange]);

  const areaPath = linePath ? `${linePath} L ${getX(candleCount - 1)} ${chartHeight} L ${getX(0)} ${chartHeight} Z` : '';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverIdx(Math.min(candleCount - 1, Math.max(0, Math.floor(ratio * candleCount))));
  };

  const chartBorderColor = isActive ? 'border-blue-500/50' : 'border-white/[0.07]';
  const chartGlowClass = isActive ? 'shadow-[0_0_0_1px_rgba(59,130,246,0.3),inset_0_0_30px_rgba(59,130,246,0.04)]' : '';

  return (
    <div
      className={`flex flex-col h-full bg-[#060818]/90 border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer select-none ${chartBorderColor} ${chartGlowClass}`}
      onClick={onActivate}
    >
      {/* Panel Toolbar */}
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.06] bg-black/30 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Symbol Picker */}
        <div className="flex items-center gap-1.5">
          <div className="relative" ref={symbolDropRef}>
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-mono font-semibold text-white transition-all"
              onClick={() => { setIsSymbolOpen((v) => !v); setIsTfOpen(false); setIsStyleOpen(false); }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${market?.category === 'crypto' ? 'bg-amber-400' : market?.category === 'forex' ? 'bg-cyan-400' : 'bg-blue-400'}`}
              />
              {config.symbol}
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>
            {isSymbolOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-lg bg-[#0D1025]/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  {markets.map((m) => (
                    <button
                      key={m.symbol}
                      className={`w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-white/[0.08] transition-colors flex items-center gap-2 ${m.symbol === config.symbol ? 'bg-blue-500/10 text-blue-300' : 'text-white/70'}`}
                      onClick={() => { onUpdate({ symbol: m.symbol }); setIsSymbolOpen(false); }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.category === 'crypto' ? 'bg-amber-400' : m.category === 'forex' ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                      <span className="font-semibold">{m.symbol}</span>
                      <span className="text-white/30 ml-auto text-[10px]">{m.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeframe */}
          <div className="relative" ref={tfDropRef}>
            <button
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-white/60 hover:text-white transition-all"
              onClick={() => { setIsTfOpen((v) => !v); setIsSymbolOpen(false); setIsStyleOpen(false); }}
            >
              {config.timeframe}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {isTfOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-lg bg-[#0D1025]/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl overflow-hidden">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    className={`block w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-white/[0.08] transition-colors ${tf === config.timeframe ? 'text-blue-400 bg-blue-500/10' : 'text-white/60'}`}
                    onClick={() => { onUpdate({ timeframe: tf }); setIsTfOpen(false); }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chart Style */}
          <div className="relative" ref={styleDropRef}>
            <button
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-white/50 hover:text-white transition-all"
              onClick={() => { setIsStyleOpen((v) => !v); setIsSymbolOpen(false); setIsTfOpen(false); }}
            >
              {config.chartStyle === 'candles' ? '📊' : config.chartStyle === 'line' ? '📈' : '🌊'}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {isStyleOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-28 rounded-lg bg-[#0D1025]/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl overflow-hidden">
                {(['candles', 'line', 'area'] as ChartStyle[]).map((style) => (
                  <button
                    key={style}
                    className={`block w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-white/[0.08] transition-colors capitalize ${style === config.chartStyle ? 'text-blue-400 bg-blue-500/10' : 'text-white/60'}`}
                    onClick={() => { onUpdate({ chartStyle: style }); setIsStyleOpen(false); }}
                  >
                    {style === 'candles' ? '📊 ' : style === 'line' ? '📈 ' : '🌊 '}{style}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Price + Change */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-mono text-[12px] font-bold tabular-nums transition-colors duration-200 ${priceFlash === 'up' ? 'text-emerald-300' : priceFlash === 'down' ? 'text-rose-300' : 'text-white'}`}
          >
            {livePrice.toFixed(precision)}
          </span>
          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-white/[0.08] text-white/30 hover:text-white transition-all"
            title="Refresh candles"
            onClick={() => market && setLocalCandles(generatePanelCandles(market.price, market.precision ?? 2))}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          {onClose && (
            <button
              className="p-1 rounded hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all"
              title="Close panel"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* OHLCV Bar */}
      {hoverCandle && (
        <div className="flex items-center gap-3 px-2.5 py-0.5 text-[10px] font-mono border-b border-white/[0.04] bg-black/10 shrink-0 overflow-x-auto">
          <span className="text-white/40">O <span className="text-white/80">{hoverCandle.open.toFixed(precision)}</span></span>
          <span className="text-white/40">H <span className="text-emerald-400">{hoverCandle.high.toFixed(precision)}</span></span>
          <span className="text-white/40">L <span className="text-rose-400">{hoverCandle.low.toFixed(precision)}</span></span>
          <span className="text-white/40">C <span className={hoverCandle.close >= hoverCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{hoverCandle.close.toFixed(precision)}</span></span>
          <span className="text-white/40">Vol <span className="text-white/60">{hoverCandle.volume}</span></span>
        </div>
      )}

      {/* Chart SVG */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <svg
          className="w-full h-full cursor-crosshair"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`areaGrad-${config.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`upGrad-${config.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id={`dnGrad-${config.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} y1={chartHeight * f} x2={chartWidth} y2={chartHeight * f} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          ))}

          {/* Volume bars */}
          {config.showVolume && localCandles.map((c, i) => {
            const volH = (c.volume / maxVolume) * (chartHeight * 0.18);
            return (
              <rect
                key={`vol-${i}`}
                x={i * colWidth + 1}
                y={chartHeight - volH}
                width={Math.max(1, colWidth - 2)}
                height={volH}
                fill={c.close >= c.open ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)'}
              />
            );
          })}

          {/* Area fill for line/area */}
          {(config.chartStyle === 'area') && areaPath && (
            <path d={areaPath} fill={`url(#areaGrad-${config.id})`} />
          )}

          {/* Line */}
          {(config.chartStyle === 'line' || config.chartStyle === 'area') && linePath && (
            <path d={linePath} fill="none" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={1.5} />
          )}

          {/* Candles */}
          {config.chartStyle === 'candles' && localCandles.map((c, i) => {
            const bullish = c.close >= c.open;
            const x = i * colWidth;
            const bodyTop = getY(Math.max(c.open, c.close));
            const bodyBot = getY(Math.min(c.open, c.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);
            const cx = x + colWidth / 2;
            return (
              <g key={`c-${i}`}>
                <line x1={cx} y1={getY(c.high)} x2={cx} y2={getY(c.low)} stroke={bullish ? '#10b981' : '#f43f5e'} strokeWidth={1} opacity={0.7} />
                <rect
                  x={x + colWidth * 0.1}
                  y={bodyTop}
                  width={Math.max(1, colWidth * 0.8)}
                  height={bodyH}
                  fill={bullish ? `url(#upGrad-${config.id})` : `url(#dnGrad-${config.id})`}
                  rx={0.5}
                />
              </g>
            );
          })}

          {/* EMA line */}
          {config.showEMA && ema20.length > 1 && (
            <polyline
              points={ema20.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1}
              opacity={0.7}
            />
          )}

          {/* Hover crosshair */}
          {hoverIdx !== null && (
            <>
              <line x1={getX(hoverIdx)} y1={0} x2={getX(hoverIdx)} y2={chartHeight} stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="3,3" />
              <circle cx={getX(hoverIdx)} cy={getY(localCandles[hoverIdx]?.close ?? livePrice)} r={3} fill={isUp ? '#10b981' : '#f43f5e'} opacity={0.9} />
            </>
          )}

          {/* Live price line */}
          <line x1={0} y1={liveY} x2={chartWidth} y2={liveY} stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={0.8} strokeDasharray="4,4" opacity={0.5} />
          <rect x={chartWidth - 70} y={liveY - 8} width={68} height={16} rx={3} fill={isUp ? '#10b981' : '#f43f5e'} opacity={0.85} />
          <text x={chartWidth - 36} y={liveY + 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="white" fontWeight="bold">
            {livePrice.toFixed(Math.min(precision, 4))}
          </text>
        </svg>

        {/* Active panel indicator */}
        {isActive && (
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
        )}
      </div>
    </div>
  );
};

// ─── Layout Config ─────────────────────────────────────────────────────────────

const LAYOUT_CONFIG: Record<SplitLayout, { label: string; icon: React.ReactNode; panels: number; gridClass: string }> = {
  '1x1': { label: 'Single', icon: <Maximize2 className="w-3.5 h-3.5" />, panels: 1, gridClass: 'grid-cols-1 grid-rows-1' },
  '1x2': { label: '1×2', icon: <Columns className="w-3.5 h-3.5" />, panels: 2, gridClass: 'grid-cols-2 grid-rows-1' },
  '2x1': { label: '2×1', icon: <Rows className="w-3.5 h-3.5" />, panels: 2, gridClass: 'grid-cols-1 grid-rows-2' },
  '2x2': { label: '2×2', icon: <LayoutGrid className="w-3.5 h-3.5" />, panels: 4, gridClass: 'grid-cols-2 grid-rows-2' },
  '3-left': { label: '3L', icon: <PanelLeft className="w-3.5 h-3.5" />, panels: 3, gridClass: '' },
  '3-right': { label: '3R', icon: <PanelLeft className="w-3.5 h-3.5 rotate-180" />, panels: 3, gridClass: '' },
};

const DEFAULT_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'NVDA/USD', 'AAPL/USD'];
const DEFAULT_TF = '5m';

function createPanel(symbol: string, index: number): PanelConfig {
  return {
    id: `panel-${Date.now()}-${index}`,
    symbol,
    timeframe: DEFAULT_TF,
    chartStyle: 'candles',
    showEMA: true,
    showBB: false,
    showVolume: true,
  };
}

// ─── Main MultiChartSplitScreen ────────────────────────────────────────────────

interface MultiChartSplitScreenProps {
  onClose: () => void;
}

export const MultiChartSplitScreen: React.FC<MultiChartSplitScreenProps> = ({ onClose }) => {
  const { markets, candles } = useTrading();

  const [layout, setLayout] = useState<SplitLayout>('1x2');
  const [activePanelId, setActivePanelId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    const syms = DEFAULT_SYMBOLS;
    return [
      createPanel(syms[0] ?? 'BTC/USDT', 0),
      createPanel(syms[1] ?? 'ETH/USDT', 1),
      createPanel(syms[2] ?? 'NVDA/USD', 2),
      createPanel(syms[3] ?? 'AAPL/USD', 3),
    ];
  });

  const requiredPanels = LAYOUT_CONFIG[layout].panels;
  const visiblePanels = panels.slice(0, requiredPanels);

  useEffect(() => {
    if (panels.length > 0 && !activePanelId) {
      setActivePanelId(panels[0].id);
    }
  }, []);

  const updatePanel = useCallback((id: string, updates: Partial<PanelConfig>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);



  const syncAllToActive = () => {
    const active = panels.find((p) => p.id === activePanelId);
    if (!active) return;
    setPanels((prev) =>
      prev.map((p) => (p.id === activePanelId ? p : { ...p, timeframe: active.timeframe, chartStyle: active.chartStyle }))
    );
  };

  // ─── 3-panel custom layouts ────────────────────────────────────────────────

  const render3LeftLayout = () => (
    <div className="flex h-full gap-1">
      <div className="flex-[2] min-w-0">
        <MiniChartPanel
          config={visiblePanels[0]}
          isActive={activePanelId === visiblePanels[0]?.id}
          markets={markets}
          candles={candles}
          onActivate={() => setActivePanelId(visiblePanels[0]?.id)}
          onUpdate={(u) => updatePanel(visiblePanels[0]?.id, u)}
          panelIndex={0}
          totalPanels={3}
        />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {visiblePanels.slice(1).map((panel, i) => (
          <div key={panel.id} className="flex-1 min-h-0">
            <MiniChartPanel
              config={panel}
              isActive={activePanelId === panel.id}
              markets={markets}
              candles={candles}
              onActivate={() => setActivePanelId(panel.id)}
              onUpdate={(u) => updatePanel(panel.id, u)}
              panelIndex={i + 1}
              totalPanels={3}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const render3RightLayout = () => (
    <div className="flex h-full gap-1">
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {visiblePanels.slice(0, 2).map((panel, i) => (
          <div key={panel.id} className="flex-1 min-h-0">
            <MiniChartPanel
              config={panel}
              isActive={activePanelId === panel.id}
              markets={markets}
              candles={candles}
              onActivate={() => setActivePanelId(panel.id)}
              onUpdate={(u) => updatePanel(panel.id, u)}
              panelIndex={i}
              totalPanels={3}
            />
          </div>
        ))}
      </div>
      <div className="flex-[2] min-w-0">
        <MiniChartPanel
          config={visiblePanels[2]}
          isActive={activePanelId === visiblePanels[2]?.id}
          markets={markets}
          candles={candles}
          onActivate={() => setActivePanelId(visiblePanels[2]?.id)}
          onUpdate={(u) => updatePanel(visiblePanels[2]?.id, u)}
          panelIndex={2}
          totalPanels={3}
        />
      </div>
    </div>
  );

  const renderGridLayout = () => (
    <div className={`grid h-full gap-1 ${LAYOUT_CONFIG[layout].gridClass}`}>
      {visiblePanels.map((panel, i) => (
        <MiniChartPanel
          key={panel.id}
          config={panel}
          isActive={activePanelId === panel.id}
          markets={markets}
          candles={candles}
          onActivate={() => setActivePanelId(panel.id)}
          onUpdate={(u) => updatePanel(panel.id, u)}
          panelIndex={i}
          totalPanels={requiredPanels}
        />
      ))}
    </div>
  );

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-[#050814]/97 backdrop-blur-2xl'
    : 'absolute inset-0 z-20 flex flex-col bg-[#050814]/97 backdrop-blur-2xl rounded-lg border border-white/[0.08]';

  return (
    <div className={containerClasses}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-black/30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[13px] font-semibold text-white tracking-wide">Multi-Chart Split Screen</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-400">
              {visiblePanels.length} PANELS
            </span>
          </div>

          {/* Layout Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {(Object.keys(LAYOUT_CONFIG) as SplitLayout[]).map((key) => {
              const cfg = LAYOUT_CONFIG[key];
              return (
                <button
                  key={key}
                  title={cfg.label}
                  onClick={() => setLayout(key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
                    layout === key
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {cfg.icon}
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sync button */}
          <button
            onClick={syncAllToActive}
            title="Sync all panels to active panel settings"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-indigo-500/20 border border-white/[0.06] hover:border-indigo-500/30 text-[10px] font-mono text-white/50 hover:text-indigo-300 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-white/40 hover:text-white transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.06] text-white/40 hover:text-rose-400 transition-all"
            title="Close split screen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="flex-1 p-1.5 min-h-0 overflow-hidden">
        {layout === '3-left' ? render3LeftLayout() : layout === '3-right' ? render3RightLayout() : renderGridLayout()}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.05] bg-black/20 shrink-0 text-[10px] font-mono text-white/30">
        <div className="flex items-center gap-3">
          <span>
            Active:{' '}
            <span className="text-blue-400 font-semibold">
              {panels.find((p) => p.id === activePanelId)?.symbol ?? '—'}
            </span>
          </span>
          <span className="text-white/15">|</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live simulation active
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Click a panel to activate</span>
          <span className="text-white/15">|</span>
          <span>Sync button copies active panel's TF & style to all others</span>
        </div>
      </div>
    </div>
  );
};
