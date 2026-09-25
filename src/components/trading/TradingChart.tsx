import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTrading } from '@/context/TradingContext';

export const TradingChart: React.FC = () => {
  const { candles, activeMarket, activeTimeframe, setActiveTimeframe, tradeHistory, feedStatus } = useTrading();

  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [candleCountdown, setCandleCountdown] = useState<string>('00:45');
  const [lastTradeExecution, setLastTradeExecution] = useState<{
    id: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    symbol: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevPriceRef = useRef<number>(activeMarket.price);
  const prevTradeIdRef = useRef<string | null>(null);
  const prevSymbolRef = useRef<string>(activeMarket.symbol);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];
  const precision = activeMarket.precision ?? 2;

  // Listen to trade execution events on the active market
  useEffect(() => {
    if (tradeHistory.length > 0) {
      const latest = tradeHistory[0];
      if (latest.id !== prevTradeIdRef.current) {
        prevTradeIdRef.current = latest.id;
        if (latest.symbol === activeMarket.symbol) {
          const isBuy = latest.side === 'buy' || latest.side === 'long';
          setLastTradeExecution({
            id: latest.id,
            side: isBuy ? 'buy' : 'sell',
            size: latest.size,
            price: latest.closePrice || latest.entryPrice,
            symbol: latest.symbol,
          });

          setPriceFlash(isBuy ? 'up' : 'down');

          const timer = setTimeout(() => {
            setLastTradeExecution(null);
          }, 3500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [tradeHistory, activeMarket.symbol]);

  // Track live price motion for subtle flash
  useEffect(() => {
    if (prevSymbolRef.current !== activeMarket.symbol) {
      prevSymbolRef.current = activeMarket.symbol;
      prevPriceRef.current = activeMarket.price;
      return;
    }

    const diff = activeMarket.price - prevPriceRef.current;
    if (Math.abs(diff) > 0.00001) {
      const isUp = diff > 0;
      setPriceFlash(isUp ? 'up' : 'down');
      prevPriceRef.current = activeMarket.price;

      const flashTimer = setTimeout(() => setPriceFlash(null), 400);
      return () => clearTimeout(flashTimer);
    }
  }, [activeMarket.price, activeMarket.symbol]);

  // Live countdown timer to next candle rollover
  useEffect(() => {
    const stepSec = activeTimeframe === '1m' ? 60 : activeTimeframe === '5m' ? 300 : 900;
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const rem = stepSec - (now % stepSec);
      const mm = String(Math.floor(rem / 60)).padStart(2, '0');
      const ss = String(rem % 60).padStart(2, '0');
      setCandleCountdown(`${mm}:${ss}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeTimeframe]);

  // Filter out any anomalous candles from different price regimes/markets (e.g. BTC $65k on MSFT $421)
  const validCandles = useMemo(() => {
    if (!candles || !candles.length) return [];
    const p = activeMarket.price || 100;
    return candles.filter((c) => {
      if (!c || isNaN(c.open) || isNaN(c.close) || isNaN(c.high) || isNaN(c.low)) return false;
      const ratio = c.close / p;
      return ratio >= 0.25 && ratio <= 4.0;
    });
  }, [candles, activeMarket.price]);

  // Dimensions & bounds (including current market price to prevent clipping)
  const { minPrice, priceRange, maxVolume } = useMemo(() => {
    if (!validCandles.length) {
      const p = activeMarket.price || 100;
      return { minPrice: p * 0.98, maxPrice: p * 1.02, priceRange: p * 0.04, maxVolume: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    validCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Expand bounds with active price
    min = Math.min(min, activeMarket.price);
    max = Math.max(max, activeMarket.price);

    const padding = (max - min) * 0.08 || activeMarket.price * 0.005 || 1;
    return {
      minPrice: Math.max(0.0001, min - padding),
      maxPrice: max + padding,
      priceRange: max - min + padding * 2 || 1,
      maxVolume: maxVol || 1,
    };
  }, [validCandles, activeMarket.price]);

  // Calculations for EMA
  const ema20 = useMemo(() => {
    if (!validCandles.length) return [];
    const k = 2 / (20 + 1);
    let ema = validCandles[0]?.close || 0;
    return validCandles.map((c) => {
      ema = c.close * k + ema * (1 - k);
      return ema;
    });
  }, [validCandles]);

  const ema50 = useMemo(() => {
    if (!validCandles.length) return [];
    const k = 2 / (50 + 1);
    let ema = validCandles[0]?.close || 0;
    return validCandles.map((c) => {
      ema = c.close * k + ema * (1 - k);
      return ema;
    });
  }, [validCandles]);

  // Calculations for Bollinger Bands
  const bollingerBands = useMemo(() => {
    if (!validCandles.length) return [];
    return validCandles.map((_, i) => {
      const start = Math.max(0, i - 19);
      const slice = validCandles.slice(start, i + 1);
      const mean = slice.reduce((acc, c) => acc + c.close, 0) / slice.length;
      const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / slice.length;
      const std = Math.sqrt(variance);
      return {
        middle: mean,
        upper: mean + std * 2,
        lower: mean - std * 2,
      };
    });
  }, [validCandles]);

  // Coordinate mappers
  const chartHeight = 360;
  const chartWidth = 720;
  const candleCount = validCandles.length;
  const colWidth = chartWidth / Math.max(1, candleCount);

  const getY = (price: number) => {
    const y = chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    return Math.max(4, Math.min(chartHeight - 4, y));
  };

  const getX = (index: number) => {
    return index * colWidth + colWidth / 2;
  };

  const activeCandle =
    hoverIndex !== null && validCandles[hoverIndex]
      ? validCandles[hoverIndex]
      : validCandles[validCandles.length - 1];
  const liveY = getY(activeMarket.price);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!candleCount) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const index = Math.min(candleCount - 1, Math.max(0, Math.floor(ratio * candleCount)));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent border-r border-white/[0.08] relative select-none overflow-hidden">
      {/* Chart Toolbar */}
      <div className="h-[46px] border-b border-white/[0.08] px-4 flex items-center justify-between bg-transparent z-10">
        {/* Timeframes & Chart Type Segmented Controls */}
        <div className="flex items-center gap-3">
          {/* Timeframe Pill Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all ${
                  activeTimeframe === tf
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Chart Style Switcher */}
          <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setChartType('candles')}
              className={`px-2.5 py-1 text-[11px] font-[450] rounded-md transition-all ${
                chartType === 'candles'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 text-[11px] font-[450] rounded-md transition-all ${
                chartType === 'line'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Live Status Equalizer & Indicators */}
        <div className="flex items-center gap-3">
          {/* Indicators Pill Bar */}
          <div className="hidden md:flex items-center gap-1.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all border ${
                showEMA
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              EMA 20/50
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all border ${
                showBB
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              Bollinger
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all border ${
                showVolume
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              Volume
            </button>
          </div>

          {/* Live Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              feedStatus?.mode === 'live'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
            title={`Market Data: ${feedStatus?.mode === 'live' ? 'Live Exchange Stream Active' : 'Offline Simulation Active'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                feedStatus?.mode === 'live' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold tracking-wider text-[10px]">
              {feedStatus?.mode === 'live' ? 'LIVE FEED' : 'SIMULATED'}
            </span>
            <span className="text-white/30">|</span>
            <span className="text-white/90">{candleCountdown}</span>
          </div>
        </div>
      </div>

      {/* OHLC Bar with Live Delta Indicator */}
      {activeCandle && (
        <div className="px-4 py-1.5 border-b border-white/[0.04] bg-black/20 flex flex-wrap items-center justify-between text-[11px] font-mono z-10">
          <div className="flex items-center gap-4">
            <span className="text-white/60 font-semibold">{activeMarket.symbol}</span>
            <span>
              <span className="text-white/40 mr-1">O</span>
              <span className="text-white font-medium">${activeCandle.open.toFixed(precision)}</span>
            </span>
            <span>
              <span className="text-white/40 mr-1">H</span>
              <span className="text-emerald-400 font-medium">${activeCandle.high.toFixed(precision)}</span>
            </span>
            <span>
              <span className="text-white/40 mr-1">L</span>
              <span className="text-rose-400 font-medium">${activeCandle.low.toFixed(precision)}</span>
            </span>
            <span>
              <span className="text-white/40 mr-1">C</span>
              <span
                className={`font-medium transition-colors duration-200 ${
                  activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${activeCandle.close.toFixed(precision)}
              </span>
            </span>
            <span>
              <span className="text-white/40 mr-1">Vol</span>
              <span className="text-white/80">{activeCandle.volume}</span>
            </span>
          </div>

          {/* Real-Time Price Action Flasher */}
          <div className="flex items-center gap-2">
            <div
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all duration-300 ${
                priceFlash === 'up'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-105'
                  : priceFlash === 'down'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 scale-105'
                  : 'bg-white/5 text-white/50'
              }`}
            >
              {priceFlash === 'up' ? '▲ BUY FLOW' : priceFlash === 'down' ? '▼ SELL FLOW' : '● ACTIVE'}
            </div>
            {showEMA && ema20.length > 0 && (
              <div className="hidden lg:flex items-center gap-3 text-[10px]">
                <span className="text-amber-400">
                  EMA20: ${(ema20[hoverIndex ?? validCandles.length - 1] || 0).toFixed(precision)}
                </span>
                <span className="text-cyan-400">
                  EMA50: ${(ema50[hoverIndex ?? validCandles.length - 1] || 0).toFixed(precision)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Interactive Chart Canvas */}
      <div ref={containerRef} className="flex-1 w-full relative min-h-[360px] p-2 flex">
        <div className="flex-1 relative h-full">

          {/* ─── TRADE EXECUTED HUD TOAST ──────────────────────────────── */}
          {lastTradeExecution && (
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#090D24]/75 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-xl animate-fade-down">
              <span className={`w-2 h-2 rounded-full ${lastTradeExecution.side === 'buy' ? 'bg-emerald-400' : 'bg-rose-400'} animate-ping`} />
              <span className="text-[11px] font-mono font-bold text-white uppercase">
                {lastTradeExecution.side === 'buy' ? 'BUY ORDER FILLED' : 'SELL ORDER FILLED'}:
              </span>
              <span className="text-[11px] font-mono text-emerald-300 font-semibold tabular-nums">
                {lastTradeExecution.size} {lastTradeExecution.symbol} @ ${lastTradeExecution.price.toFixed(precision)}
              </span>
            </div>
          )}

          <svg
            className="w-full h-full cursor-crosshair overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>

              {/* Laser sweep animation for live price line */}
              <linearGradient id="laserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
              const y = chartHeight * ratio;
              return (
                <line
                  key={idx}
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Bollinger Bands */}
            {showBB && bollingerBands.length > 0 && (
              <>
                <path
                  d={
                    validCandles.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(bollingerBands[i].upper)}`).join(' ') +
                    validCandles
                      .slice()
                      .reverse()
                      .map((_, revI) => {
                        const i = validCandles.length - 1 - revI;
                        return `L ${getX(i)} ${getY(bollingerBands[i].lower)}`;
                      })
                      .join(' ') +
                    ' Z'
                  }
                  fill="rgba(168, 85, 247, 0.08)"
                />
                <path
                  d={validCandles.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(bollingerBands[i].upper)}`).join(' ')}
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.4)"
                  strokeWidth="1"
                />
                <path
                  d={validCandles.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(bollingerBands[i].lower)}`).join(' ')}
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.4)"
                  strokeWidth="1"
                />
              </>
            )}

            {/* Volume Histogram */}
            {showVolume &&
              validCandles.map((c, i) => {
                const volHeight = (c.volume / (maxVolume || 1)) * 55;
                const isGreen = c.close >= c.open;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={i * colWidth + 2}
                    y={chartHeight - volHeight}
                    width={Math.max(1, colWidth - 4)}
                    height={volHeight}
                    fill={isGreen ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)'}
                  />
                );
              })}

            {/* Line / Area Mode with Smooth Glow */}
            {chartType === 'line' && validCandles.length > 0 && (
              <>
                <path
                  d={
                    validCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.close)}`).join(' ') +
                    ` L ${getX(validCandles.length - 1)} ${chartHeight} L ${getX(0)} ${chartHeight} Z`
                  }
                  fill="url(#areaGradient)"
                />
                <path
                  d={validCandles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.close)}`).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                />
              </>
            )}

            {/* Candlestick Mode with Smooth Up/Down Fluid Transitions */}
            {chartType === 'candles' &&
              validCandles.map((c, i) => {
                const isGreen = c.close >= c.open;
                const x = getX(i);
                const isLast = i === validCandles.length - 1;

                // Dynamically animated properties for the active candle
                const wickY1 = getY(c.high);
                const wickY2 = getY(c.low);
                const bodyY = getY(Math.max(c.open, c.close));
                const bodyHeight = Math.max(2, Math.abs(getY(c.open) - getY(c.close)));
                const candleWidth = Math.max(2.5, colWidth - 3.5);

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={wickY1}
                      x2={x}
                      y2={wickY2}
                      stroke={isGreen ? '#10b981' : '#f43f5e'}
                      strokeWidth={isLast ? '2' : '1.2'}
                      style={{
                        transition: isLast ? 'y1 0.25s ease-out, y2 0.25s ease-out' : undefined,
                      }}
                    />
                    {/* Body with smooth up and down breathing transition */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={isGreen ? '#10b981' : '#f43f5e'}
                      rx={0.8}
                      style={{
                        transition: isLast ? 'y 0.25s ease-out, height 0.25s ease-out, fill 0.2s ease-out' : undefined,
                        filter: isLast
                          ? isGreen
                            ? 'drop-shadow(0 0 6px rgba(16,185,129,0.7))'
                            : 'drop-shadow(0 0 6px rgba(244,63,94,0.7))'
                          : undefined,
                      }}
                    />

                    {/* Active Live Pulse Ring on the latest candle close */}
                    {isLast && (
                      <g>
                        {/* Outer expanding radar ring */}
                        <circle
                          cx={x}
                          cy={getY(c.close)}
                          r="7"
                          fill={isGreen ? '#10b981' : '#f43f5e'}
                          className="animate-ping"
                          opacity="0.6"
                          style={{
                            transition: 'cy 0.25s ease-out',
                          }}
                        />
                        {/* Inner glowing nucleus */}
                        <circle
                          cx={x}
                          cy={getY(c.close)}
                          r="4"
                          fill={isGreen ? '#34d399' : '#fb7185'}
                          style={{
                            transition: 'cy 0.25s ease-out',
                            filter: 'drop-shadow(0 0 4px #ffffff)',
                          }}
                        />
                      </g>
                    )}
                  </g>
                );
              })}

            {/* EMA Lines */}
            {showEMA && ema20.length > 0 && (
              <>
                <path
                  d={validCandles.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(ema20[i])}`).join(' ')}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <path
                  d={validCandles.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(ema50[i])}`).join(' ')}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
              </>
            )}

            {/* Crosshair on Hover */}
            {hoverIndex !== null && validCandles[hoverIndex] && (
              <g>
                <line
                  x1={getX(hoverIndex)}
                  y1={0}
                  x2={getX(hoverIndex)}
                  y2={chartHeight}
                  stroke="rgba(255,255,255,0.35)"
                  strokeDasharray="3 3"
                />
                <line
                  x1={0}
                  y1={getY(validCandles[hoverIndex].close)}
                  x2={chartWidth}
                  y2={getY(validCandles[hoverIndex].close)}
                  stroke="rgba(255,255,255,0.35)"
                  strokeDasharray="3 3"
                />
              </g>
            )}

            {/* ─── TRADE EXECUTION MARKER (Minimal non-intrusive fill point) ─── */}
            {lastTradeExecution && (() => {
              const tradeY = getY(lastTradeExecution.price);
              const isBuy = lastTradeExecution.side === 'buy';
              const color = isBuy ? '#10b981' : '#f43f5e';
              return (
                <g>
                  <line
                    x1={0}
                    y1={tradeY}
                    x2={chartWidth}
                    y2={tradeY}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    opacity={0.6}
                  />
                  <circle cx={20} cy={tradeY} r={4} fill={color} className="animate-ping" opacity={0.6} />
                  <circle cx={20} cy={tradeY} r={3} fill={color} />
                </g>
              );
            })()}

            {/* ─── FLUID LIVE PRICE LINE WITH UP-AND-DOWN ANIMATION ────────── */}
            {/* Ambient Background Glow Bar at Live Price */}
            <line
              x1={0}
              y1={liveY}
              x2={chartWidth}
              y2={liveY}
              stroke={priceFlash === 'up' ? '#10b981' : priceFlash === 'down' ? '#f43f5e' : '#3b82f6'}
              strokeWidth="6"
              opacity="0.15"
              style={{
                transition: 'y1 0.28s ease-out, y2 0.28s ease-out, stroke 0.2s ease-out',
              }}
            />

            {/* Main Animated Dashed Line */}
            <line
              x1={0}
              y1={liveY}
              x2={chartWidth}
              y2={liveY}
              stroke={priceFlash === 'up' ? '#34d399' : priceFlash === 'down' ? '#fb7185' : '#60a5fa'}
              strokeDasharray="4 4"
              opacity="0.9"
              strokeWidth="1.6"
              style={{
                transition: 'y1 0.28s ease-out, y2 0.28s ease-out, stroke 0.2s ease-out',
              }}
            />

            {/* Pulsing Beacon Dots at the Right Edge */}
            <circle
              cx={chartWidth - 4}
              cy={liveY}
              r="6"
              fill={priceFlash === 'up' ? '#10b981' : priceFlash === 'down' ? '#f43f5e' : '#3b82f6'}
              className="animate-ping"
              opacity="0.75"
              style={{
                transition: 'cy 0.28s ease-out, fill 0.2s ease-out',
              }}
            />
            <circle
              cx={chartWidth - 4}
              cy={liveY}
              r="4"
              fill={priceFlash === 'up' ? '#34d399' : priceFlash === 'down' ? '#fb7185' : '#93c5fd'}
              style={{
                transition: 'cy 0.28s ease-out, fill 0.2s ease-out',
                filter: 'drop-shadow(0 0 6px #ffffff)',
              }}
            />
          </svg>
        </div>

        {/* Right Y-Axis Price Labels with Gliding Active Badge */}
        <div className="w-[82px] flex flex-col justify-between py-2 text-[10px] font-mono text-white/40 text-right pr-2 select-none border-l border-white/[0.06] bg-transparent relative overflow-hidden shrink-0">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
            const priceVal = minPrice + priceRange * ratio;
            return (
              <div key={ratio} className="tabular-nums">
                ${priceVal.toFixed(precision)}
              </div>
            );
          })}

          {/* Active Live Price Badge with Up/Down Fluid Glide aligned to live line */}
          <div
            className={`absolute right-1 text-white font-bold px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums shadow-lg transition-all duration-300 flex items-center gap-0.5 pointer-events-none z-10 ${
              priceFlash === 'up'
                ? 'bg-emerald-500 shadow-emerald-500/60 ring-1 ring-emerald-400'
                : priceFlash === 'down'
                ? 'bg-rose-500 shadow-rose-500/60 ring-1 ring-rose-400'
                : 'bg-blue-600 shadow-blue-500/50'
            }`}
            style={{
              top: `${Math.max(10, Math.min(90, (liveY / chartHeight) * 100))}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <span>◀</span>
            <span>${activeMarket.price.toFixed(precision)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
