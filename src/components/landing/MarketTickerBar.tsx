import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

export const MarketTickerBar: React.FC = () => {
  const { markets, setActiveSymbol, setViewMode } = useTrading();

  const handleSelect = (symbol: string) => {
    setActiveSymbol(symbol);
    setViewMode('terminal');
  };

  return (
    <div className="w-full bg-[rgba(10,7,7,0.35)] backdrop-blur-[17px] border-y border-white/[0.08] py-3.5 px-4 overflow-x-auto no-scrollbar select-none">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-6 min-w-max">
        <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-wider font-mono pr-4 border-r border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Markets</span>
        </div>

        <div className="flex items-center gap-8">
          {markets.map((m) => {
            const isPos = m.change24h >= 0;
            return (
              <div
                key={m.symbol}
                onClick={() => handleSelect(m.symbol)}
                className="flex items-center gap-3 cursor-pointer group hover:bg-white/[0.04] px-3 py-1.5 rounded-xl transition-all"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-[13px] font-[450] group-hover:text-blue-400 transition-colors">
                      {m.symbol}
                    </span>
                    <span className="text-[10px] text-white/40 uppercase font-mono">{m.category}</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/60">Vol {m.volume24h}</div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[13px] text-white font-medium">
                    ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.precision })}
                  </div>
                  <div className={`text-[11px] flex items-center justify-end gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isPos ? '+' : ''}{m.change24h}%</span>
                  </div>
                </div>

                <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setViewMode('terminal')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-[450] transition-colors whitespace-nowrap shadow-lg shadow-blue-500/20"
        >
          Open Terminal
        </button>
      </div>
    </div>
  );
};
