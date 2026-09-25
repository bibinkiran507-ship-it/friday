import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { TradingHeader } from './TradingHeader';
import { MarginCallBanner } from './MarginCallBanner';
import { TradingChart } from './TradingChart';
import { OrderBook } from './OrderBook';
import { OrderForm } from './OrderForm';
import { PositionsTable } from './PositionsTable';
import { FridayCopilotDrawer } from './FridayCopilotDrawer';
import { Bot } from 'lucide-react';

export const TradingTerminal: React.FC = () => {
  const { toast, isFridayDrawerOpen, setIsFridayDrawerOpen } = useTrading();

  return (
    <div className="w-full h-screen text-white flex flex-col overflow-hidden relative font-sans select-none bg-transparent">

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 right-6 z-50 bg-[#0E1332]/80 border border-blue-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-2xl flex items-center gap-2 animate-fade-down text-[13px] font-[450]">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="animate-fade-down z-30 shrink-0">
        <TradingHeader />
        <MarginCallBanner />
      </div>

      {/* Main Terminal Grid */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">
        {/* Left / Center: Chart + Positions Dock */}
        <div className="flex-1 flex flex-col min-w-0 animate-slide-in-left">
          <TradingChart />
          <PositionsTable />
        </div>

        {/* Mid-Right: Order Book */}
        <div className="hidden md:flex flex-col h-full shrink-0">
          <OrderBook />
        </div>

        {/* Right: Order Entry Panel */}
        <div className="h-full shrink-0">
          <OrderForm />
        </div>
      </div>

      {/* F.R.I.D.A.Y. AI Copilot Drawer */}
      <FridayCopilotDrawer />

      {/* F.R.I.D.A.Y. Trigger Orb */}
      {!isFridayDrawerOpen && (
        <button
          onClick={() => setIsFridayDrawerOpen(true)}
          className="fixed bottom-3 left-4 z-40 px-3 py-1.5 rounded-full bg-[#080D24]/65 backdrop-blur-xl hover:bg-[#0E1538]/85 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-105 active:scale-95 transition-all group flex items-center gap-2 cursor-pointer text-[12px] font-mono"
          title="Activate F.R.I.D.A.Y. AI Copilot (Ctrl+J)"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform" />
            <span className="absolute -inset-1 rounded-full border border-dashed border-cyan-400/50 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <span className="font-semibold tracking-wide">F.R.I.D.A.Y.</span>
          <kbd className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] text-cyan-400/80 border border-cyan-500/30">
            Ctrl+J
          </kbd>
        </button>
      )}
    </div>
  );
};
