import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { Cpu } from 'lucide-react';

export const AiSignalsCard: React.FC = () => {
  const { aiSignal } = useTrading();

  const isBullish = aiSignal.bias.includes('BULLISH');

  return (
    <div className="p-3 bg-[#090C1E] border-t border-white/[0.08] text-[11px] select-none shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-white/80 font-[450]">
          <Cpu className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="tracking-tight">Apogee AI Signals</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold transition-all duration-300 ${
            isBullish
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]'
          }`}
        >
          {aiSignal.bias}
        </span>
      </div>

      {/* Animated Confidence Bar */}
      <div className="mb-2 p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
        <div className="flex justify-between text-[10px] font-mono mb-1">
          <span className="text-white/40">Model Confidence</span>
          <span className="text-emerald-400 font-semibold">{aiSignal.confidence}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${aiSignal.confidence}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2 font-mono">
        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
          <div className="text-white/40 text-[10px]">Confidence</div>
          <div className="text-white font-medium">{aiSignal.confidence}%</div>
        </div>
        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
          <div className="text-white/40 text-[10px]">Volatility Model</div>
          <div className="text-amber-400 font-medium">{aiSignal.volatilityForecast}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2 font-mono">
        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
          <div className="text-white/40 text-[10px]">Key Support</div>
          <div className="text-emerald-400 font-medium">${aiSignal.supportLevel.toLocaleString()}</div>
        </div>
        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
          <div className="text-white/40 text-[10px]">Key Resistance</div>
          <div className="text-rose-400 font-medium">${aiSignal.resistanceLevel.toLocaleString()}</div>
        </div>
      </div>

      <p className="text-[10px] text-white/50 leading-relaxed font-sans line-clamp-2">
        {aiSignal.rationale}
      </p>
    </div>
  );
};
