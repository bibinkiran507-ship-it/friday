import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { ShieldAlert, ArrowUpRight } from 'lucide-react';

export const MarginCallBanner: React.FC = () => {
  const { isMarginCall, marginRatioPercent, marginUsed, balance, setIsDepositOpen } = useTrading();

  if (!isMarginCall) return null;

  return (
    <div className="w-full bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-rose-950/90 border-b border-rose-500/40 px-4 py-2 flex items-center justify-between backdrop-blur-xl animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.25)] z-40 select-none text-[12px]">
      <div className="flex items-center gap-3">
        <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-rose-300 uppercase text-[11px] font-mono">
            ⚠️ MARGIN CALL WARNING ({marginRatioPercent}%)
          </span>
          <span className="text-white/80 hidden sm:inline">
            High liquidation risk: You have utilized <strong className="text-rose-300 font-mono">${marginUsed.toLocaleString()}</strong> of your <strong className="text-white font-mono">${balance.toLocaleString()}</strong> cash collateral.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDepositOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-[11px] shadow-md shadow-rose-600/30 transition-all font-mono"
        >
          <span>Deposit Collateral</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
