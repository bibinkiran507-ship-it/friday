import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { Zap, Shield, Cpu, Layers, ArrowRight, TrendingUp, Activity } from 'lucide-react';
import { ScrollReveal } from '@/components/common/ScrollReveal';

export const FeaturesSection: React.FC = () => {
  const { setViewMode, markets, navigateToArchitecture } = useTrading();

  const features = [
    {
      id: 'match-engine',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: 'Ultra-Low Latency Match Engine',
      description:
        'Engineered for high-frequency quantitative execution with sub-5μs matching, deterministic tick handling, and zero slippage algorithms.',
      badge: '5μs Benchmark',
    },
    {
      id: 'quant-lab',
      icon: <Cpu className="w-6 h-6 text-blue-400" />,
      title: 'Quant Lab Strategy Backtester',
      description:
        'Institutional quantitative simulator backtesting multi-regime models (EMA Golden Cross, RSI Reversion, MACD Momentum) with Sharpe ratio and drawdown analytics.',
      badge: 'Quant Engine',
    },
    {
      id: 'liquidity',
      icon: <Layers className="w-6 h-6 text-purple-400" />,
      title: 'Aggregated Tier-1 Liquidity',
      description:
        'Consolidated order book routing across major institutional OTC desks and exchanges for optimal depth and minimal market impact.',
      badge: 'Deep Book',
    },
    {
      id: 'cross-margin',
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: 'Multi-Asset Cross-Margin',
      description:
        'Unified margin collateral across spot, perpetual contracts, synthetic equities, and foreign exchange with intelligent liquidation buffers.',
      badge: '100x Leverage',
    },
  ];

  return (
    <section className="w-full bg-transparent py-24 px-5 sm:px-8 md:px-[82px] border-t border-white/[0.06] relative z-10">
      <div className="max-w-[1800px] mx-auto">
        {/* Header with ScrollReveal */}
        <div className="max-w-[720px] mb-16">
          <ScrollReveal direction="down" delay={100}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[12px] font-[450] mb-4 shadow-inner backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              <span>Next-Gen Trading Infrastructure</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-white text-[32px] sm:text-[44px] md:text-[54px] font-normal leading-[1.05] tracking-tight mb-4 drop-shadow-md">
              Engineered for high-performance quantitative trading
            </h2>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <p className="text-white/80 text-[16px] sm:text-[18px] font-[450] leading-relaxed drop-shadow">
              Institutional precision meets neural market reasoning. Access deep liquidity, millisecond chart execution, and cross-margined leverage in one unified terminal.
            </p>
          </ScrollReveal>
        </div>

        {/* 4 Feature Cards with Staggered ScrollReveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((f, i) => (
            <ScrollReveal key={i} direction="up" delay={150 + i * 120} className="h-full">
              <div
                onClick={() => navigateToArchitecture(f.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateToArchitecture(f.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className="h-full p-6 sm:p-8 rounded-[24px] bg-[rgba(10,13,30,0.22)] backdrop-blur-[14px] border border-white/[0.1] hover:border-blue-400/50 hover:bg-[rgba(10,13,30,0.38)] active:scale-[0.98] hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-300 group flex flex-col justify-between cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] group-hover:bg-blue-500/15 group-hover:border-blue-500/40 transition-colors">
                      {f.icon}
                    </div>
                    <span className="text-[11px] font-mono font-[450] px-2.5 py-1 rounded-full bg-white/[0.06] text-white/75 border border-white/[0.04]">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-white text-[20px] font-[450] mb-3 leading-snug group-hover:text-blue-300 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-white/70 text-[14px] leading-relaxed font-[450]">
                    {f.description}
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-white/50 group-hover:text-blue-400 transition-colors font-medium">
                  <span>Explore Architecture</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Live Market Terminal Preview Bar */}
        <ScrollReveal direction="scale" delay={200} className="mb-20">
          <div className="rounded-[28px] bg-[rgba(10,13,30,0.25)] backdrop-blur-[16px] border border-white/[0.1] p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
              <div>
                <div className="flex items-center gap-2 text-[12px] text-blue-400 font-mono uppercase mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-Time Market Depth & Analytics</span>
                </div>
                <h3 className="text-white text-[22px] sm:text-[28px] font-[450]">
                  Streaming Liquidity across Global Venues
                </h3>
              </div>

              <button
                onClick={() => setViewMode('terminal')}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-[450] text-[14px] transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <span>Launch Interactive Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
              {markets.map((m) => {
                const isPos = m.change24h >= 0;
                return (
                  <div
                    key={m.symbol}
                    onClick={() => setViewMode('terminal')}
                    className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/25 hover:bg-white/[0.08] cursor-pointer transition-all"
                  >
                    <div className="text-[12px] text-white/70 mb-1">{m.symbol}</div>
                    <div className="text-[14px] font-bold text-white mb-1">
                      ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.precision })}
                    </div>
                    <div className={`text-[11px] flex items-center gap-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <TrendingUp className={`w-3 h-3 ${isPos ? '' : 'rotate-180'}`} />
                      <span>{isPos ? '+' : ''}{m.change24h}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Global Statistics Banner with ScrollReveal */}
        <ScrollReveal direction="up" delay={300}>
          <div className="rounded-[30px] bg-[rgba(10,13,30,0.25)] border border-white/[0.1] p-8 sm:p-12 backdrop-blur-[16px] flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 w-full lg:w-auto">
              <div>
                <div className="text-[32px] sm:text-[44px] font-mono font-[450] text-white">$84.2B+</div>
                <div className="text-white/50 text-[13px]">24h Global Volume</div>
              </div>
              <div>
                <div className="text-[32px] sm:text-[44px] font-mono font-[450] text-emerald-400">&lt; 5μs</div>
                <div className="text-white/50 text-[13px]">Execution Latency</div>
              </div>
              <div>
                <div className="text-[32px] sm:text-[44px] font-mono font-[450] text-blue-400">100x</div>
                <div className="text-white/50 text-[13px]">Cross Margin Leverage</div>
              </div>
              <div>
                <div className="text-[32px] sm:text-[44px] font-mono font-[450] text-purple-400">99.999%</div>
                <div className="text-white/50 text-[13px]">SLA System Uptime</div>
              </div>
            </div>

            <button
              onClick={() => setViewMode('terminal')}
              className="w-full sm:w-auto px-8 py-4 rounded-[14px] bg-[#E9E9E9] hover:bg-white text-[#0A0707] font-[450] text-[16px] transition-all flex items-center justify-center gap-2 shadow-2xl hover:scale-[1.02] whitespace-nowrap"
            >
              <span>Launch Live Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
