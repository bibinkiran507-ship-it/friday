import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '@/context/TradingContext';
import { Cpu, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

export const OrderBook: React.FC = () => {
  const { orderBook, recentTrades, activeMarket, aiSignal, prefillOrderFromBook } = useTrading();
  const [activeTab, setActiveTab] = useState<'book' | 'trades' | 'signals'>('book');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(activeMarket.price);

  useEffect(() => {
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
  }, [activeMarket.price]);

  const quoteSymbol = activeMarket.symbol.split('/')[1] || 'USD';
  const isAiBullish = aiSignal?.bias?.includes('BULLISH');

  return (
    <div className="w-[300px] xl:w-[310px] bg-black/40 border-r border-white/[0.10] flex flex-col select-none text-[12px] h-full overflow-hidden">
      {/* ─── Clean Segmented Tab Switcher ────────────────────────────────────── */}
      <div className="h-[44px] border-b border-white/[0.10] px-2.5 flex items-center justify-between bg-black/20 shrink-0">
        <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] gap-0.5">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
              activeTab === 'book'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-white/45 hover:text-white'
            }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
              activeTab === 'trades'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-white/45 hover:text-white'
            }`}
          >
            Trades
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'signals'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-sm'
                : 'text-cyan-400/70 hover:text-cyan-300'
            }`}
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>AI Signals</span>
          </button>
        </div>

        {activeTab === 'book' && (
          <div className="text-[10px] text-white/80 font-mono tabular-nums flex items-center gap-1.5">
            <span className="text-white/40 hidden xl:inline text-[9px]">CLICK ROW TO FILL</span>
            <span>Spread:</span>
            <span className="text-cyan-300 font-bold">{orderBook.spread.toFixed(activeMarket.precision)}</span>
          </div>
        )}
      </div>

      {/* ─── TAB 1: ORDER BOOK ────────────────────────────────────────────────── */}
      {activeTab === 'book' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden p-2">
          {/* Header Row */}
          <div className="grid grid-cols-3 text-[10px] font-mono text-white/70 pb-1 px-1 border-b border-white/[0.10] shrink-0 uppercase tracking-wider">
            <span>Price ({quoteSymbol})</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks (Sell Orders - Top down red) */}
          <div className="flex flex-col justify-end space-y-0.5 overflow-hidden flex-1 py-1">
            {orderBook.asks.slice(-9).map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                onClick={() => prefillOrderFromBook({ price: ask.price, size: ask.size, side: 'buy' })}
                title={`Click to Limit BUY ${ask.size.toFixed(3)} @ $${ask.price.toFixed(activeMarket.precision)}`}
                className="grid grid-cols-3 font-mono text-[11px] tabular-nums items-center h-[21px] min-h-[21px] shrink-0 px-1 relative cursor-pointer hover:bg-rose-500/20 active:scale-[0.99] rounded transition-all group"
              >
                {/* Horizontal Depth Tint */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none rounded transition-all duration-300 group-hover:bg-rose-500/25"
                  style={{ width: `${Math.min(100, ask.depthPercent)}%` }}
                />
                <span className="text-rose-300 font-bold z-10 truncate drop-shadow-sm group-hover:underline">{ask.price.toFixed(activeMarket.precision)}</span>
                <span className="text-right text-white z-10 truncate">{ask.size.toFixed(3)}</span>
                <span className="text-right text-white/70 z-10 truncate">{ask.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Spread / Current Mark Price Banner */}
          <div className="py-2 px-2.5 my-1 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between font-mono shrink-0 shadow-sm">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-[15px] font-bold tracking-tight tabular-nums transition-all duration-300 ${
                  priceFlash === 'up'
                    ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : priceFlash === 'down'
                    ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                    : 'text-white'
                }`}
              >
                ${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}
              </span>
              <span className="text-[10px] text-white/70 font-mono">USD</span>
            </div>

            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                activeMarket.change24h >= 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {activeMarket.change24h >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {activeMarket.change24h >= 0 ? '+' : ''}{activeMarket.change24h}%
            </span>
          </div>

          {/* Bids (Buy Orders - Bottom green) */}
          <div className="flex flex-col space-y-0.5 overflow-hidden flex-1 py-1">
            {orderBook.bids.slice(0, 9).map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                onClick={() => prefillOrderFromBook({ price: bid.price, size: bid.size, side: 'sell' })}
                title={`Click to Limit SELL ${bid.size.toFixed(3)} @ $${bid.price.toFixed(activeMarket.precision)}`}
                className="grid grid-cols-3 font-mono text-[11px] tabular-nums items-center h-[21px] min-h-[21px] shrink-0 px-1 relative cursor-pointer hover:bg-emerald-500/20 active:scale-[0.99] rounded transition-all group"
              >
                {/* Horizontal Depth Tint */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none rounded transition-all duration-300 group-hover:bg-emerald-500/25"
                  style={{ width: `${Math.min(100, bid.depthPercent)}%` }}
                />
                <span className="text-emerald-300 font-bold z-10 truncate drop-shadow-sm group-hover:underline">{bid.price.toFixed(activeMarket.precision)}</span>
                <span className="text-right text-white z-10 truncate">{bid.size.toFixed(3)}</span>
                <span className="text-right text-white/70 z-10 truncate">{bid.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Sleek 1-line AI Signal teaser banner at bottom of orderbook */}
          <div
            onClick={() => setActiveTab('signals')}
            className="mt-1 p-2 rounded-xl bg-white/[0.04] border border-cyan-500/25 hover:border-cyan-400/50 cursor-pointer flex items-center justify-between transition-all group shrink-0"
            title="Click to view full AI Signals & Analysis"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-[11px] font-semibold text-white shrink-0">Apogee AI:</span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  isAiBullish
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {aiSignal?.bias || 'NEUTRAL'}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span className="font-semibold">{aiSignal?.confidence || 90}%</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: RECENT TRADES ────────────────────────────────────────────── */}
      {activeTab === 'trades' && (
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <div className="grid grid-cols-3 text-[10px] font-mono text-white/70 pb-1.5 px-1 border-b border-white/[0.10] shrink-0 uppercase tracking-wider">
            <span>Price ({quoteSymbol})</span>
            <span className="text-right">Size</span>
            <span className="text-right">Time</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 py-1 font-mono text-[11px] tabular-nums">
            {recentTrades.map((t) => (
              <div key={t.id} className="grid grid-cols-3 hover:bg-white/[0.04] py-1 px-1 rounded transition-colors items-center">
                <span className={`font-semibold ${t.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.price.toFixed(activeMarket.precision)}
                </span>
                <span className="text-right text-white">{t.size.toFixed(3)}</span>
                <span className="text-right text-white/70 text-[10px]">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: FULL AI SIGNALS DASHBOARD ───────────────────────────────── */}
      {activeTab === 'signals' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3">
          {/* Header Bias Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-white">Apogee Neural Engine</div>
                <div className="text-[10px] text-white/70">{activeMarket.symbol} Deep Scan</div>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold border ${
                isAiBullish
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
              }`}
            >
              {aiSignal?.bias || 'NEUTRAL'}
            </span>
          </div>

          {/* Model Confidence Bar */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex justify-between text-[11px] font-mono mb-1.5">
              <span className="text-white/80">Model Confidence</span>
              <span className="text-cyan-300 font-bold">{aiSignal?.confidence || 90}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${aiSignal?.confidence || 90}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-white/75 text-[10px]">Volatility Model</div>
              <div className="text-amber-300 font-semibold mt-0.5">{aiSignal?.volatilityForecast || 'MODERATE'}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-white/75 text-[10px]">Algorithm Latency</div>
              <div className="text-emerald-400 font-semibold mt-0.5">8.4 ms</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-white/75 text-[10px]">Key Support</div>
              <div className="text-emerald-300 font-semibold mt-0.5">
                ${(aiSignal?.supportLevel || activeMarket.price * 0.98).toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-white/75 text-[10px]">Key Resistance</div>
              <div className="text-rose-400 font-semibold mt-0.5">
                ${(aiSignal?.resistanceLevel || activeMarket.price * 1.02).toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}
              </div>
            </div>
          </div>

          {/* AI Rationale Narrative */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-white/90 leading-relaxed">
            <div className="text-white/70 text-[10px] uppercase font-mono tracking-wider mb-1">Model Rationale</div>
            {aiSignal?.rationale || 'Institutional orderbook flow indicates strong consolidation with directional momentum pending breakout.'}
          </div>

          {/* Back to Orderbook button */}
          <button
            onClick={() => setActiveTab('book')}
            className="w-full py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white hover:text-white text-[11px] font-medium transition-colors border border-white/[0.15]"
          >
            Return to Order Book
          </button>
        </div>
      )}
    </div>
  );
};
