import React, { useState } from 'react';
import { useTrading } from '@/context/TradingContext';
import {
  Zap,
  Shield,
  Cpu,
  Layers,
  ArrowLeft,
  ArrowRight,
  Activity,
  Server,
  Network,
  Lock,
  CheckCircle2,
  Terminal,
  HardDrive,
  Clock,
  ChevronRight,
  Database,
  Flame,
  AlertTriangle,
  Play,
} from 'lucide-react';

interface ArchitecturePillar {
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  color: string;
  accentBorder: string;
  accentBg: string;
}

export const ArchitecturePage: React.FC = () => {
  const {
    activeArchitectureTab,
    setActiveArchitectureTab,
    setViewMode,
  } = useTrading();

  // Active tab can be 'overview' or one of the 4 pillars
  const currentTab = activeArchitectureTab || 'overview';

  // Interactive pipeline active node
  const [activePipelineStep, setActivePipelineStep] = useState<number>(2);

  const pillars: ArchitecturePillar[] = [
    {
      id: 'match-engine',
      badge: '5μs Benchmark',
      title: 'Ultra-Low Latency Match Engine',
      shortDesc: 'Sub-5μs deterministic tick processing via kernel-bypass DPDK and lock-free ring buffers.',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      color: 'text-amber-400',
      accentBorder: 'border-amber-500/40',
      accentBg: 'bg-amber-500/10',
    },
    {
      id: 'quant-lab',
      badge: 'Quant Engine',
      title: 'Quant Lab Strategy Backtester',
      shortDesc: 'Vectorized historical simulator modeling slippage, tick-level depth, and multi-regime alphas.',
      icon: <Cpu className="w-5 h-5 text-blue-400" />,
      color: 'text-blue-400',
      accentBorder: 'border-blue-500/40',
      accentBg: 'bg-blue-500/10',
    },
    {
      id: 'liquidity',
      badge: 'Deep Book',
      title: 'Aggregated Tier-1 Liquidity',
      shortDesc: 'Consolidated order book routing across NY4, LD4, TY3 with sub-millisecond synthetic BBO.',
      icon: <Layers className="w-5 h-5 text-purple-400" />,
      color: 'text-purple-400',
      accentBorder: 'border-purple-500/40',
      accentBg: 'bg-purple-500/10',
    },
    {
      id: 'cross-margin',
      badge: '100x Leverage',
      title: 'Multi-Asset Cross-Margin',
      shortDesc: 'Real-time delta-gamma risk offset across Spot, Perps, and synthetic equities with dynamic buffers.',
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      color: 'text-emerald-400',
      accentBorder: 'border-emerald-500/40',
      accentBg: 'bg-emerald-500/10',
    },
  ];

  const pipelineSteps = [
    {
      step: '01',
      title: 'Kernel-Bypass Ingress',
      tech: 'Solarflare EF_VI / DPDK',
      latency: '0.45μs',
      description: 'Incoming FIX/Binary packets bypass OS kernel stack directly into user space memory via hardware timestamped NIC queues.',
      details: [
        'Hardware nanosecond timestamping on packet arrival',
        'Direct DMA into pre-allocated L2-cached ring buffers',
        'Zero OS context switches & zero thread preemption',
      ],
    },
    {
      step: '02',
      title: 'Pre-Trade Risk Gate',
      tech: 'SIMD Vectorized Checks',
      latency: '0.78μs',
      description: 'Atomic margin requirement, credit limits, price banding, and max-drawdown validation checked concurrently before book entry.',
      details: [
        'Sub-microsecond margin ratio arithmetic via AVX-512',
        'Account state kept in hot L3 CPU cache',
        'Instant deterministic rejection of toxic or undercollateralized orders',
      ],
    },
    {
      step: '03',
      title: 'LMAX Disruptor Sequencer',
      tech: 'Lock-Free Ring Buffer',
      latency: '0.35μs',
      description: 'Deterministic sequential ordering with single-writer memory barriers. Prevents multi-threaded lock contention entirely.',
      details: [
        'Cache-line aligned memory slots (64 bytes) to eliminate false sharing',
        'Strict monotonic sequence assignment across all concurrent symbols',
        'Zero garbage collection and zero dynamic heap allocation',
      ],
    },
    {
      step: '04',
      title: 'Matching Core Engine',
      tech: 'Continuous Price-Time Book',
      latency: '1.42μs',
      description: 'Optimized radix price level tree and circular order FIFO queues deliver deterministic order execution under heavy market surges.',
      details: [
        'O(1) best bid/ask lookup and deterministic cancel processing',
        'Deterministic execution matching: Fill-or-Kill, IOC, Post-Only, Iceberg',
        'Continuous orderbook depth generation with zero copy broadcasts',
      ],
    },
    {
      step: '05',
      title: 'Ledger & Clearing',
      tech: 'Double-Entry Append Log',
      latency: '0.90μs',
      description: 'Cryptographically anchored, double-entry audit trail commits position updates, trade fees, and collateral movements.',
      details: [
        'Memory-mapped append-only binary journal on ultra-fast NVMe arrays',
        'Snapshot checkpoints with zero engine pause or write locks',
        'Sub-second deterministic crash-recovery replay capability',
      ],
    },
    {
      step: '06',
      title: 'Multicast Gateway',
      tech: 'Zero-Copy WebSocket / FIX',
      latency: '0.65μs',
      description: 'Execution reports, market depth differentials (L2/L3), and portfolio updates broadcast to institutional endpoints in parallel.',
      details: [
        'Binary SBE (Simple Binary Encoding) & raw WebSocket pipelines',
        'Differential depth updates broadcast at 50ms aggregation windows',
        'Dedicated isolated egress bandwidth to institutional co-locations',
      ],
    },
  ];

  return (
    <div className="w-full min-h-screen text-white relative bg-[#080A19] overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-[24px] bg-[#080A19]/80 border-b border-white/[0.08] transition-all">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-8 md:px-[82px] py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[13px] font-[450] text-white/80 hover:text-white transition-all group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Return to Home</span>
            </button>

            <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] font-mono text-emerald-400 font-semibold tracking-wide uppercase">
                Architecture Specification v4.8
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setViewMode('quant-lab')}
              className="px-4 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-[450] text-[13px] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>Quant Lab Simulator</span>
            </button>

            <button
              onClick={() => setViewMode('terminal')}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-[450] text-[13px] transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <span>Live Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-8 md:px-[82px] py-10 relative z-10">
        {/* Breadcrumb & Hero Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-[12px] font-mono text-white/50 mb-3">
            <span>Apogee Core</span>
            <span>/</span>
            <span>Infrastructure Deep-Dive</span>
            <span>/</span>
            <span className="text-blue-400 font-medium capitalize">
              {currentTab === 'overview' ? 'Full Topology & Pipeline' : currentTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
            <div className="max-w-[840px]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[12px] font-mono mb-3">
                <Server className="w-3.5 h-3.5" />
                <span>Equinix NY4 / LD4 Co-Located Hardware Spec</span>
              </div>
              <h1 className="text-[32px] sm:text-[46px] font-normal tracking-tight text-white leading-tight mb-3">
                High-Performance Quantitative System Architecture
              </h1>
              <p className="text-white/70 text-[16px] sm:text-[18px] leading-relaxed">
                Explore the technical specifications, deterministic tick pipelining, vectorized multi-regime backtester, and real-time cross-margin risk equations powering the Apogee terminal.
              </p>
            </div>

            {/* Quick Live Spec Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[rgba(10,13,30,0.5)] border border-white/[0.08] p-4 rounded-2xl backdrop-blur-md">
              <div>
                <div className="text-[11px] text-white/50 uppercase font-mono">Benchmark SLA</div>
                <div className="text-[20px] font-bold text-white font-mono">99.999%</div>
                <div className="text-[11px] text-emerald-400 font-mono">Active Nodes: 12</div>
              </div>
              <div>
                <div className="text-[11px] text-white/50 uppercase font-mono">Tick-To-Trade</div>
                <div className="text-[20px] font-bold text-amber-400 font-mono">&lt; 4.8μs</div>
                <div className="text-[11px] text-white/40 font-mono">p99 latency</div>
              </div>
              <div>
                <div className="text-[11px] text-white/50 uppercase font-mono">Peak Capacity</div>
                <div className="text-[20px] font-bold text-blue-400 font-mono">2.4M</div>
                <div className="text-[11px] text-white/40 font-mono">orders / sec</div>
              </div>
              <div>
                <div className="text-[11px] text-white/50 uppercase font-mono">Memory Model</div>
                <div className="text-[20px] font-bold text-purple-400 font-mono">Zero-Alloc</div>
                <div className="text-[11px] text-white/40 font-mono">LMAX Ring Buffer</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 pb-4 mb-10 border-b border-white/[0.06]">
          <button
            onClick={() => setActiveArchitectureTab('overview')}
            className={`w-full px-3.5 sm:px-4 py-3 rounded-2xl font-[450] text-[13px] sm:text-[14px] transition-all flex items-center justify-between gap-2 cursor-pointer ${
              currentTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 flex-shrink-0 text-blue-300" />
              <span className="truncate">Full System Topology</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 flex-shrink-0">
              Pipeline
            </span>
          </button>

          {pillars.map((p) => {
            const isActive = currentTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveArchitectureTab(p.id)}
                className={`w-full px-3.5 sm:px-4 py-3 rounded-2xl font-[450] text-[13px] sm:text-[14px] transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.14] text-white border border-white/30 shadow-lg'
                    : 'bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0">{p.icon}</span>
                  <span className="truncate">{p.title}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex-shrink-0 ${p.accentBg} ${p.color}`}>
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FULL SYSTEM TOPOLOGY & EXECUTION PIPELINE */}
        {/* ========================================================================= */}
        {currentTab === 'overview' && (
          <div className="space-y-12">
            {/* End-to-End Pipeline Interactive Visualizer */}
            <div className="rounded-[28px] bg-[rgba(10,13,30,0.35)] backdrop-blur-[20px] border border-white/[0.1] p-6 sm:p-10 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 text-blue-400 font-mono text-[12px] uppercase mb-1">
                    <Network className="w-4 h-4" />
                    <span>Deterministic Order Execution Pipeline</span>
                  </div>
                  <h2 className="text-white text-[24px] sm:text-[30px] font-[450]">
                    Sub-Microsecond Ingress to Clearing
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-mono text-white/50">Total E2E Tick-To-Trade Budget:</span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[14px]">
                    ~4.55 μs Cumulative
                  </span>
                </div>
              </div>

              {/* Pipeline Nodes Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
                {pipelineSteps.map((s, idx) => {
                  const isSelected = activePipelineStep === idx;
                  return (
                    <div
                      key={s.step}
                      onClick={() => setActivePipelineStep(idx)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 relative border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono font-bold text-white/40">{s.step}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            {s.latency}
                          </span>
                        </div>
                        <h4 className="text-[14px] font-semibold text-white mb-1 leading-snug">{s.title}</h4>
                        <div className="text-[11px] font-mono text-white/50">{s.tech}</div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                        <span className={isSelected ? 'text-blue-300 font-semibold' : 'text-white/40'}>
                          {isSelected ? 'Viewing Specs' : 'Click to Inspect'}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-white/30'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Step Deep Inspector */}
              <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono font-bold flex items-center justify-center text-[13px]">
                      {pipelineSteps[activePipelineStep].step}
                    </span>
                    <div>
                      <h3 className="text-white text-[18px] font-semibold">
                        {pipelineSteps[activePipelineStep].title}
                      </h3>
                      <p className="text-[12px] font-mono text-white/60">
                        Implementation Core: <span className="text-blue-300">{pipelineSteps[activePipelineStep].tech}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-[12px] font-mono">Engine Latency Contribution:</span>
                    <span className="text-emerald-400 font-mono font-bold text-[16px] px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {pipelineSteps[activePipelineStep].latency}
                    </span>
                  </div>
                </div>

                <p className="text-white/80 text-[14px] leading-relaxed mb-4">
                  {pipelineSteps[activePipelineStep].description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {pipelineSteps[activePipelineStep].details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[13px] text-white/70">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Pillars Overview Cards Grid */}
            <div>
              <div className="mb-6">
                <h3 className="text-white text-[22px] font-[450] mb-1">Architectural Pillars</h3>
                <p className="text-white/60 text-[14px]">
                  Select any pillar below to inspect benchmark tests, hardware specs, and algorithmic equations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pillars.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveArchitectureTab(p.id);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="p-6 sm:p-7 rounded-[24px] bg-[rgba(10,13,30,0.25)] border border-white/[0.1] hover:border-blue-400/50 hover:bg-[rgba(10,13,30,0.4)] transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className={`p-3 rounded-2xl ${p.accentBg} border ${p.accentBorder}`}>
                          {p.icon}
                        </div>
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/[0.06] text-white/75 border border-white/[0.04]">
                          {p.badge}
                        </span>
                      </div>

                      <h4 className="text-white text-[18px] font-semibold mb-2 group-hover:text-blue-300 transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-white/70 text-[13px] leading-relaxed mb-6">
                        {p.shortDesc}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-blue-400 font-medium">
                      <span>View Specifications</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware & Colocation Specifications Matrix */}
            <div className="rounded-[28px] bg-[rgba(10,13,30,0.3)] backdrop-blur-[16px] border border-white/[0.1] p-6 sm:p-8">
              <h3 className="text-white text-[20px] font-[450] mb-6 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span>Production Hardware &amp; Co-location Infrastructure</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[13px]">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>Compute Nodes</span>
                  </div>
                  <ul className="space-y-2 text-white/70">
                    <li><strong className="text-white">Processors:</strong> Dual AMD EPYC 9654 (192 Cores @ 3.7GHz)</li>
                    <li><strong className="text-white">Memory:</strong> 1.5TB DDR5-4800 Registered ECC (Sub-50ns DRAM)</li>
                    <li><strong className="text-white">L3 Cache:</strong> 768MB 3D V-Cache (Pinned hot state)</li>
                    <li><strong className="text-white">Kernel:</strong> Real-time Linux 6.6 with PREEMPT_RT patch</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span>Network &amp; NICs</span>
                  </div>
                  <ul className="space-y-2 text-white/70">
                    <li><strong className="text-white">Hardware:</strong> Solarflare XtremeScale X2522 Dual-Port 25GbE</li>
                    <li><strong className="text-white">Switches:</strong> Arista 7130 Layer 1 FPGA cross-connect (&lt;4ns)</li>
                    <li><strong className="text-white">Protocol:</strong> OpenOnload user-space kernel bypass &amp; EF_VI</li>
                    <li><strong className="text-white">Fiber:</strong> Dark fiber cross-connect to CME, ICE, OTC desks</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Reliability &amp; SLA</span>
                  </div>
                  <ul className="space-y-2 text-white/70">
                    <li><strong className="text-white">High Availability:</strong> Active-Active dual sequencer parity</li>
                    <li><strong className="text-white">State Replay:</strong> Deterministic zero-loss WAL on NVMe arrays</li>
                    <li><strong className="text-white">Audit Trail:</strong> Cryptographic SHA-256 trade commitment</li>
                    <li><strong className="text-white">Uptime SLA:</strong> 99.999% continuous production target</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ULTRA-LOW LATENCY MATCH ENGINE */}
        {/* ========================================================================= */}
        {currentTab === 'match-engine' && (
          <div className="space-y-10">
            {/* Header & Overview */}
            <div className="p-8 rounded-[28px] bg-gradient-to-br from-amber-500/10 via-[rgba(10,13,30,0.3)] to-[rgba(10,13,30,0.5)] border border-amber-500/30 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[12px] font-mono mb-3">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Deterministic Sub-5μs Matching</span>
                  </div>
                  <h2 className="text-white text-[28px] sm:text-[36px] font-[450] mb-2">
                    Ultra-Low Latency Match Engine Core
                  </h2>
                  <p className="text-white/80 text-[15px] max-w-[800px] leading-relaxed">
                    Designed for ultra-high-frequency automated market making and statistical arbitrage. Eliminates CPU context switches, heap allocations, and lock contention using the LMAX Disruptor memory model.
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-[12px] font-mono text-white/50 mb-1">Deterministic Latency Benchmark</div>
                  <div className="text-[42px] font-bold text-amber-400 font-mono leading-none">3.80 μs</div>
                  <div className="text-[12px] font-mono text-emerald-400 mt-1">p99.9 &lt; 5.00 μs at 1M TPS</div>
                </div>
              </div>
            </div>

            {/* Production Throughput & Deterministic Latency Profile */}
            <div className="rounded-[28px] bg-[rgba(10,13,30,0.35)] backdrop-blur-[20px] border border-white/[0.1] p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-amber-400 font-mono text-[12px] uppercase mb-1">
                    <Activity className="w-4 h-4" />
                    <span>Deterministic Execution Specifications</span>
                  </div>
                  <h3 className="text-white text-[22px] font-[450]">
                    Throughput Capacity &amp; Latency Profile
                  </h3>
                  <p className="text-white/60 text-[13px] mt-0.5">
                    Physical hardware performance metrics under continuous sustained execution across Equinix NY4 compute partitions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[12px] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Deterministic Sub-5μs Ceiling</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-[12px] text-white/70">
                    Zero Packet Loss
                  </div>
                </div>
              </div>

              {/* 3 Regime Load Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Regime 1 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                      <span className="text-white text-[15px] font-semibold">Baseline Operational Load</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        100,000 TPS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[12px] mb-4">
                      <div>
                        <div className="text-white/40">p50 Latency</div>
                        <div className="text-[18px] font-bold text-white">0.85 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">p99 Latency</div>
                        <div className="text-[18px] font-bold text-emerald-400">1.65 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">Jitter (σ)</div>
                        <div className="text-white font-semibold">±0.12 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">CPU Core Load</div>
                        <div className="text-white font-semibold">8.2%</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] text-[12px] font-mono text-white/60 space-y-1">
                    <div>• Cache Line: <span className="text-emerald-300">100% L1 Hot Hit</span></div>
                    <div>• Queue Wait: <span className="text-white/80">0 ns (Immediate Drain)</span></div>
                  </div>
                </div>

                {/* Regime 2 */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-amber-500/30 bg-amber-500/[0.02] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                      <span className="text-white text-[15px] font-semibold">High Volatility Surge</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        1,000,000 TPS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[12px] mb-4">
                      <div>
                        <div className="text-white/40">p50 Latency</div>
                        <div className="text-[18px] font-bold text-white">1.15 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">p99 Latency</div>
                        <div className="text-[18px] font-bold text-amber-400">2.85 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">Jitter (σ)</div>
                        <div className="text-white font-semibold">±0.28 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">CPU Core Load</div>
                        <div className="text-white font-semibold">42.5%</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] text-[12px] font-mono text-white/60 space-y-1">
                    <div>• Cache Line: <span className="text-amber-300">L1/L2 Prefetched Vector</span></div>
                    <div>• Queue Wait: <span className="text-white/80">&lt; 12 items (Sub-μs Drain)</span></div>
                  </div>
                </div>

                {/* Regime 3 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                      <span className="text-white text-[15px] font-semibold">Sustained Stress Peak</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
                        2,400,000 TPS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[12px] mb-4">
                      <div>
                        <div className="text-white/40">p50 Latency</div>
                        <div className="text-[18px] font-bold text-white">1.45 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">p99 Latency</div>
                        <div className="text-[18px] font-bold text-amber-400">4.20 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">Jitter (σ)</div>
                        <div className="text-white font-semibold">±0.45 μs</div>
                      </div>
                      <div>
                        <div className="text-white/40">CPU Core Load</div>
                        <div className="text-white font-semibold">78.1%</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] text-[12px] font-mono text-white/60 space-y-1">
                    <div>• Cache Line: <span className="text-purple-300">NUMA Core-Pinned L3</span></div>
                    <div>• Queue Wait: <span className="text-white/80">&lt; 45 items (Zero Loss Ceiling)</span></div>
                  </div>
                </div>
              </div>

              {/* Detailed Performance Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[12px]">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">Median Match Time</div>
                  <div className="text-[20px] font-bold text-white">1.15 μs</div>
                  <div className="text-[11px] text-emerald-400">Under Normal &amp; Volatile Load</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">Deterministic p99 SLA</div>
                  <div className="text-[20px] font-bold text-amber-400">&lt; 4.80 μs</div>
                  <div className="text-[11px] text-amber-300">Guaranteed Max Ceiling</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">Single-Core Throughput</div>
                  <div className="text-[20px] font-bold text-blue-400">2.4M TPS</div>
                  <div className="text-[11px] text-blue-300">Non-blocking Ring Buffer</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">Memory Model</div>
                  <div className="text-[20px] font-bold text-purple-400">Zero-Alloc</div>
                  <div className="text-[11px] text-purple-300">64-Byte Cache Line Padded</div>
                </div>
              </div>
            </div>

            {/* Architecture Features Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.3)] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-white text-[17px] font-semibold mb-2">Zero-Allocation Memory Pool</h4>
                <p className="text-white/70 text-[13px] leading-relaxed">
                  All order objects, book price levels, and execution events are pre-allocated at startup into contiguous blocks. The engine produces zero heap fragmentation and never triggers garbage collector pauses.
                </p>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.3)] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                  <Server className="w-5 h-5" />
                </div>
                <h4 className="text-white text-[17px] font-semibold mb-2">CPU Core Pinning &amp; NUMA Binding</h4>
                <p className="text-white/70 text-[13px] leading-relaxed">
                  Each trading pair matching thread is pinned to dedicated physical CPU cores with isolated NUMA memory nodes. Hyperthreading and OS scheduler migration are disabled via Linux isolcpus.
                </p>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.3)] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-white text-[17px] font-semibold mb-2">Deterministic Order Priority</h4>
                <p className="text-white/70 text-[13px] leading-relaxed">
                  Strict Price-Time priority matching guarantees microsecond-level fairness. Every order receives a monotonic 64-bit sequence counter stamped directly in the NIC hardware ingress queue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUANT LAB STRATEGY BACKTESTER */}
        {/* ========================================================================= */}
        {currentTab === 'quant-lab' && (
          <div className="space-y-10">
            {/* Header & Overview */}
            <div className="p-8 rounded-[28px] bg-gradient-to-br from-blue-500/10 via-[rgba(10,13,30,0.3)] to-[rgba(10,13,30,0.5)] border border-blue-500/30 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[12px] font-mono mb-3">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Algorithmic Modeling Engine</span>
                  </div>
                  <h2 className="text-white text-[28px] sm:text-[36px] font-[450] mb-2">
                    Quant Lab Strategy Backtester
                  </h2>
                  <p className="text-white/80 text-[15px] max-w-[800px] leading-relaxed">
                    Vectorized quantitative engine simulating multi-regime statistical alphas (EMA Golden Cross, RSI Mean Reversion, MACD Momentum) with realistic slippage, liquidity decay, and transaction cost modeling.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode('quant-lab')}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-[450] text-[14px] transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Launch Live Quant Simulator</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Strategy Pipeline Diagram */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.35)] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="text-[12px] font-mono text-blue-400 mb-2">COMPONENT 01</div>
                  <h3 className="text-white text-[18px] font-semibold mb-3">Vectorized Replay Engine</h3>
                  <p className="text-white/70 text-[14px] leading-relaxed mb-4">
                    Processes millions of historical candle bars and tick quotes in parallel using SIMD array vectorization. Eliminates iterative Python bottlenecks with native zero-allocation math routines.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[12px] text-white/60">
                  ⚡ 180 Days Backtest in &lt; 40ms<br />
                  📊 Tick-Level Execution Realism<br />
                  🔄 Dynamic Slippage Modeling
                </div>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.35)] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="text-[12px] font-mono text-blue-400 mb-2">COMPONENT 02</div>
                  <h3 className="text-white text-[18px] font-semibold mb-3">Institutional Risk Metrics</h3>
                  <p className="text-white/70 text-[14px] leading-relaxed mb-4">
                    Real-time computation of Sharpe Ratio, Sortino downside deviation, Profit Factor, Maximum Drawdown duration, and Value at Risk (VaR 95% / 99%) across bull, bear, and chop regimes.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[12px] text-white/60">
                  📈 Sharpe Ratio: μ / σ_returns<br />
                  📉 Max Drawdown: Peak-to-Trough<br />
                  🎯 Calmar Ratio: CAGR / MaxDD
                </div>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.35)] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="text-[12px] font-mono text-blue-400 mb-2">COMPONENT 03</div>
                  <h3 className="text-white text-[18px] font-semibold mb-3">Viva Trading Logic Rationale</h3>
                  <p className="text-white/70 text-[14px] leading-relaxed mb-4">
                    Interactive technical rationale modal explains why specific indicators succeeded or failed during high volatility, trend shifts, or false breakout regimes.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[12px] text-white/60">
                  🧠 AI Explanations for Trades<br />
                  📚 Regime Shift Analysis<br />
                  🛡️ Risk-Adjusted Trade Sizing
                </div>
              </div>
            </div>

            {/* Backtester Strategy Quick Cards */}
            <div className="p-8 rounded-[28px] bg-[rgba(10,13,30,0.3)] border border-white/[0.1]">
              <h3 className="text-white text-[20px] font-[450] mb-6">Standard Quantitative Alpha Models</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-amber-400 font-semibold text-[15px]">EMA Golden Cross</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">Trend Following</span>
                  </div>
                  <p className="text-white/70 text-[13px] leading-relaxed mb-3">
                    Detects medium-to-long term momentum inflections when Fast EMA (12) crosses Slow EMA (26). Best suited for trending markets with minimal whipsaw.
                  </p>
                  <div className="text-[12px] font-mono text-white/50">Benchmark Win Rate: ~58-64%</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-blue-400 font-semibold text-[15px]">RSI Mean Reversion</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">Oscillator</span>
                  </div>
                  <p className="text-white/70 text-[13px] leading-relaxed mb-3">
                    Exploits temporary oversold (&lt;30) and overbought (&gt;70) exhaustion extremes with dynamic stop-loss protections. Excellent in sideways consolidation.
                  </p>
                  <div className="text-[12px] font-mono text-white/50">Benchmark Win Rate: ~66-72%</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-purple-400 font-semibold text-[15px]">MACD Momentum</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">Multi-Indicator</span>
                  </div>
                  <p className="text-white/70 text-[13px] leading-relaxed mb-3">
                    Combines histogram divergence with signal line crossovers to capture explosive volatility expansions before major trend accelerations.
                  </p>
                  <div className="text-[12px] font-mono text-white/50">Benchmark Win Rate: ~55-61%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AGGREGATED TIER-1 LIQUIDITY */}
        {/* ========================================================================= */}
        {currentTab === 'liquidity' && (
          <div className="space-y-10">
            {/* Header & Overview */}
            <div className="p-8 rounded-[28px] bg-gradient-to-br from-purple-500/10 via-[rgba(10,13,30,0.3)] to-[rgba(10,13,30,0.5)] border border-purple-500/30 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[12px] font-mono mb-3">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Smart Order Routing (SOR)</span>
                  </div>
                  <h2 className="text-white text-[28px] sm:text-[36px] font-[450] mb-2">
                    Aggregated Tier-1 Liquidity Matrix
                  </h2>
                  <p className="text-white/80 text-[15px] max-w-[800px] leading-relaxed">
                    Consolidated deep order book routing across major institutional OTC market makers and global cryptocurrency &amp; equity exchanges. Delivers optimal price discovery with near-zero slippage.
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-[12px] font-mono text-white/50 mb-1">Combined Top-of-Book Depth</div>
                  <div className="text-[42px] font-bold text-purple-400 font-mono leading-none">$140M+</div>
                  <div className="text-[12px] font-mono text-emerald-400 mt-1">Spread Compression: 0.1 bps</div>
                </div>
              </div>
            </div>

            {/* Smart Routing Diagram & Venues */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.35)] border border-white/[0.08]">
                <div className="text-[12px] font-mono text-purple-400 mb-2">VENUE REGION 01</div>
                <h4 className="text-white text-[18px] font-semibold mb-2">Equinix NY4 (Secaucus, NJ)</h4>
                <p className="text-white/70 text-[13px] leading-relaxed mb-4">
                  Primary cross-connect to US equities, synthetic derivatives, and institutional spot OTC trading desks.
                </p>
                <div className="space-y-1.5 font-mono text-[12px]">
                  <div className="flex justify-between text-white/60">
                    <span>Direct Cross-Connect:</span>
                    <span className="text-emerald-400">0.2ms latency</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Protocols:</span>
                    <span className="text-white">FIX 4.4 / ITCH 5.0</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.35)] border border-white/[0.08]">
                <div className="text-[12px] font-mono text-purple-400 mb-2">VENUE REGION 02</div>
                <h4 className="text-white text-[18px] font-semibold mb-2">Equinix LD4 (Slough, UK)</h4>
                <p className="text-white/70 text-[13px] leading-relaxed mb-4">
                  European liquidity bridge aggregating global FX pairs, London metal exchanges, and continental OTC pools.
                </p>
                <div className="space-y-1.5 font-mono text-[12px]">
                  <div className="flex justify-between text-white/60">
                    <span>Direct Cross-Connect:</span>
                    <span className="text-emerald-400">0.3ms latency</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Protocols:</span>
                    <span className="text-white">Binary OUCH / FAST</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.35)] border border-white/[0.08]">
                <div className="text-[12px] font-mono text-purple-400 mb-2">VENUE REGION 03</div>
                <h4 className="text-white text-[18px] font-semibold mb-2">Equinix TY3 (Tokyo, JP)</h4>
                <p className="text-white/70 text-[13px] leading-relaxed mb-4">
                  Asia-Pacific gateway connecting Tokyo, Singapore, and Hong Kong crypto perpetual venues.
                </p>
                <div className="space-y-1.5 font-mono text-[12px]">
                  <div className="flex justify-between text-white/60">
                    <span>Direct Cross-Connect:</span>
                    <span className="text-emerald-400">0.4ms latency</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Protocols:</span>
                    <span className="text-white">Direct WebSocket SBE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Algorithmic Execution Waterfall */}
            <div className="p-8 rounded-[28px] bg-[rgba(10,13,30,0.3)] border border-white/[0.1]">
              <h3 className="text-white text-[20px] font-[450] mb-6">Institutional Execution Algorithms</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-purple-400 font-semibold mb-2">Synthetic BBO</h4>
                  <p className="text-white/70 text-[13px] leading-relaxed">
                    Combines best bids and asks from multiple independent venues to manufacture a synthetic inside market narrower than any single book.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-blue-400 font-semibold mb-2">TWAP / VWAP</h4>
                  <p className="text-white/70 text-[13px] leading-relaxed">
                    Time-Weighted and Volume-Weighted Average Price slicing algorithms that quietly carve large block orders to minimize market signaling.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-emerald-400 font-semibold mb-2">Iceberg Orders</h4>
                  <p className="text-white/70 text-[13px] leading-relaxed">
                    Hides true order quantity, displaying only small tranches on the public order book while executing continuously against incoming flow.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-amber-400 font-semibold mb-2">Post-Only Maker</h4>
                  <p className="text-white/70 text-[13px] leading-relaxed">
                    Guarantees liquidity rebate fees by rejecting any order that would execute as a taker, ensuring optimal fee economics for quants.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MULTI-ASSET CROSS-MARGIN */}
        {/* ========================================================================= */}
        {currentTab === 'cross-margin' && (
          <div className="space-y-10">
            {/* Header & Overview */}
            <div className="p-8 rounded-[28px] bg-gradient-to-br from-emerald-500/10 via-[rgba(10,13,30,0.3)] to-[rgba(10,13,30,0.5)] border border-emerald-500/30 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[12px] font-mono mb-3">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Cross-Collateral Risk Engine</span>
                  </div>
                  <h2 className="text-white text-[28px] sm:text-[36px] font-[450] mb-2">
                    Multi-Asset Cross-Margin Engine
                  </h2>
                  <p className="text-white/80 text-[15px] max-w-[800px] leading-relaxed">
                    Unified margin collateral across spot balances, perpetual futures, synthetic equities, and foreign exchange. Utilizes real-time delta-gamma offset algorithms to maximize capital efficiency while shielding accounts with intelligent liquidation buffers.
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-[12px] font-mono text-white/50 mb-1">Max Dynamic Leverage</div>
                  <div className="text-[42px] font-bold text-emerald-400 font-mono leading-none">100x</div>
                  <div className="text-[12px] font-mono text-emerald-400 mt-1">Multi-Collateral Haircut: 95-98%</div>
                </div>
              </div>
            </div>

            {/* Cross-Collateral Risk Architecture & Margin Tier Specifications */}
            <div className="rounded-[28px] bg-[rgba(10,13,30,0.35)] backdrop-blur-[20px] border border-white/[0.1] p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-emerald-400 font-mono text-[12px] uppercase mb-1">
                    <Shield className="w-4 h-4" />
                    <span>Dynamic Margin Tier Specifications</span>
                  </div>
                  <h3 className="text-white text-[22px] font-[450]">
                    Cross-Collateral Margin Schedules &amp; Risk Buffers
                  </h3>
                  <p className="text-white/60 text-[13px] mt-0.5">
                    Portfolio-level initial margin, maintenance floor, and automated liquidation buffer parameters across institutional asset classes.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-[12px] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Continuous Delta-Gamma Offset</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-[12px] text-white/70">
                    Zero Clawback Guarantee
                  </div>
                </div>
              </div>

              {/* 3 Tier Schedules */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Tier 1 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                      <span className="text-white text-[15px] font-semibold">Tier 1: High-Leverage Quant</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        50x - 100x
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[12px] mb-4">
                      <div>
                        <div className="text-white/40">Initial Margin</div>
                        <div className="text-[18px] font-bold text-white">1.0% - 2.0%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Maintenance</div>
                        <div className="text-[18px] font-bold text-emerald-400">0.45% - 0.90%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Liquidation Buffer</div>
                        <div className="text-white font-semibold">0.55% - 1.10%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Max Notional</div>
                        <div className="text-white font-semibold">$250,000</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] text-[12px] font-mono text-white/60 space-y-1">
                    <div>• ADL Priority: <span className="text-emerald-300">Level 1 (Sub-Second Step-Down)</span></div>
                    <div>• Collateral Base: <span className="text-white/80">Cash USD &amp; Spot BTC/ETH</span></div>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-blue-500/30 bg-blue-500/[0.02] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                      <span className="text-white text-[15px] font-semibold">Tier 2: Standard Algorithmic</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        20x - 50x
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[12px] mb-4">
                      <div>
                        <div className="text-white/40">Initial Margin</div>
                        <div className="text-[18px] font-bold text-white">2.0% - 5.0%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Maintenance</div>
                        <div className="text-[18px] font-bold text-blue-400">0.90% - 2.25%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Liquidation Buffer</div>
                        <div className="text-white font-semibold">1.10% - 2.75%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Max Notional</div>
                        <div className="text-white font-semibold">$2,500,000</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] text-[12px] font-mono text-white/60 space-y-1">
                    <div>• ADL Priority: <span className="text-blue-300">Level 2 (Partial Order Absorption)</span></div>
                    <div>• Collateral Base: <span className="text-white/80">Multi-Asset Basket (90-95%)</span></div>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                      <span className="text-white text-[15px] font-semibold">Tier 3: Prime Institutional</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
                        1x - 20x
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[12px] mb-4">
                      <div>
                        <div className="text-white/40">Initial Margin</div>
                        <div className="text-[18px] font-bold text-white">5.0% - 20.0%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Maintenance</div>
                        <div className="text-[18px] font-bold text-purple-400">2.25% - 9.00%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Liquidation Buffer</div>
                        <div className="text-white font-semibold">2.75% - 11.00%</div>
                      </div>
                      <div>
                        <div className="text-white/40">Max Notional</div>
                        <div className="text-white font-semibold">$25,000,000+</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] text-[12px] font-mono text-white/60 space-y-1">
                    <div>• ADL Priority: <span className="text-purple-300">Level 3 (Insurance Fund Backstop)</span></div>
                    <div>• Collateral Base: <span className="text-white/80">Full Cross-Collateral Engine</span></div>
                  </div>
                </div>
              </div>

              {/* Collateral Haircut Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[12px]">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">Cash / USD</div>
                  <div className="text-[20px] font-bold text-white">100% Value</div>
                  <div className="text-[11px] text-emerald-400">0% Haircut Factor</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">BTC &amp; ETH Spot</div>
                  <div className="text-[20px] font-bold text-white">95% Value</div>
                  <div className="text-[11px] text-emerald-400">5% Haircut Factor</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">US Equities (NVDA/AAPL)</div>
                  <div className="text-[20px] font-bold text-white">90% Value</div>
                  <div className="text-[11px] text-blue-400">10% Haircut Factor</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-white/40 mb-1">Synthetic Commodities</div>
                  <div className="text-[20px] font-bold text-white">85% Value</div>
                  <div className="text-[11px] text-purple-400">15% Haircut Factor</div>
                </div>
              </div>
            </div>

            {/* Risk Mitigation Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.3)] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="text-white text-[17px] font-semibold mb-2">Cross-Asset Portfolio Offsets</h4>
                <p className="text-white/70 text-[13px] leading-relaxed">
                  Correlated hedges (e.g. Long Spot BTC against Short Perp Futures, or Long Tech ETF against Short NVDA) receive automated margin discounts, liberating trading capital.
                </p>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.3)] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="text-white text-[17px] font-semibold mb-2">Cascade Prevention &amp; ADL</h4>
                <p className="text-white/70 text-[13px] leading-relaxed">
                  Intelligent liquidation engine executes partial step-down de-leveraging rather than total position dumps, preventing market slippage death spirals and protecting account equity.
                </p>
              </div>

              <div className="p-6 rounded-[24px] bg-[rgba(10,13,30,0.3)] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="text-white text-[17px] font-semibold mb-2">Backstop Insurance Fund</h4>
                <p className="text-white/70 text-[13px] leading-relaxed">
                  Institutional insurance reserve absorbs bankruptcy deficits during black swan gap openings, guaranteeing that winning positions are paid in full without clawbacks.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Bottom Call to Action Card */}
        <div className="mt-16 rounded-[30px] bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/10 border border-blue-500/30 p-8 sm:p-12 text-center backdrop-blur-xl">
          <h3 className="text-white text-[26px] sm:text-[34px] font-normal mb-4">
            Experience Sub-Millisecond Quantitative Execution
          </h3>
          <p className="text-white/75 text-[16px] max-w-[650px] mx-auto mb-8">
            Deploy your strategies on our co-located high-frequency matching engine or run realistic backtests in the Quant Lab.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setViewMode('terminal')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-[450] text-[15px] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/40 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>Launch Live Trading Terminal</span>
            </button>

            <button
              onClick={() => setViewMode('quant-lab')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-white font-[450] text-[15px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>Open Quant Lab Simulator</span>
            </button>

            <button
              onClick={() => {
                setViewMode('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-white/60 hover:text-white text-[14px] transition-colors cursor-pointer"
            >
              <span>Return to Overview</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#050711]/95 border-t border-white/[0.08] py-8 px-5 sm:px-8 md:px-[82px] text-white/40 text-[13px] flex flex-col sm:flex-row items-center justify-between gap-4 mt-20 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-white font-[450]">Apogee Architecture Framework</span>
          <span>© 2026 Apogee Systems Inc. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Co-Location Active: Equinix NY4
          </span>
          <span
            onClick={() => {
              setViewMode('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-white cursor-pointer transition-colors"
          >
            Home
          </span>
          <span
            onClick={() => setViewMode('terminal')}
            className="hover:text-white cursor-pointer transition-colors"
          >
            Terminal
          </span>
        </div>
      </footer>
    </div>
  );
};
