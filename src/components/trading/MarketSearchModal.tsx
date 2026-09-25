import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTrading } from '@/context/TradingContext';
import { MarketCategory } from '@/types/trading';
import { Search, TrendingUp, TrendingDown, X } from 'lucide-react';

interface MarketSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketSearchModal: React.FC<MarketSearchModalProps> = ({ isOpen, onClose }) => {
  const { markets, activeSymbol, setActiveSymbol } = useTrading();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | MarketCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filtered markets
  const filteredMarkets = useMemo(() => {
    let list = markets;
    if (selectedCategory !== 'all') {
      list = list.filter((m) => m.category === selectedCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.symbol.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [markets, selectedCategory, query]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredMarkets.length]);

  // Keyboard navigation (Up, Down, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredMarkets.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMarkets.length) % Math.max(1, filteredMarkets.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMarkets[selectedIndex]) {
          setActiveSymbol(filteredMarkets[selectedIndex].symbol);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredMarkets, selectedIndex, setActiveSymbol, onClose]);

  // Category counts
  const counts = useMemo(() => {
    return {
      all: markets.length,
      stock: markets.filter((m) => m.category === 'stock').length,
      crypto: markets.filter((m) => m.category === 'crypto').length,
      forex: markets.filter((m) => m.category === 'forex').length,
    };
  }, [markets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-2xl bg-[#0B0F24]/95 border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans backdrop-blur-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Box */}
        <div className="p-4 border-b border-white/[0.08] bg-black/40 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets, stocks, crypto (e.g. NVDA, Bitcoin, Apple)..."
            className="w-full bg-transparent text-[15px] font-[450] text-white placeholder-white/40 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/50 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Category Tabs Strip */}
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-black/20 flex items-center gap-2 overflow-x-auto">
          {(['all', 'stock', 'crypto', 'forex'] as const).map((cat) => {
            const isActive = selectedCategory === cat;
            const label = cat === 'all' ? 'All Markets' : cat === 'stock' ? 'Stocks' : cat === 'crypto' ? 'Crypto' : 'Forex';
            const count = counts[cat];

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-[450] transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                    : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white border border-white/[0.05]'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Markets Result List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredMarkets.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-white/40 space-y-2">
              <Search className="w-8 h-8 stroke-1 text-white/20" />
              <div className="text-[14px]">No markets found matching "{query}"</div>
              <div className="text-[12px] text-white/30">Try searching for NVDA, TSLA, BTC, or Apple</div>
            </div>
          ) : (
            filteredMarkets.map((m, index) => {
              const isActive = m.symbol === activeSymbol;
              const isHighlighted = index === selectedIndex;
              const isPositive = m.change24h >= 0;

              return (
                <div
                  key={m.symbol}
                  onClick={() => {
                    setActiveSymbol(m.symbol);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isHighlighted
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                      : isActive
                      ? 'bg-white/[0.06] border border-white/10 text-white'
                      : 'hover:bg-white/[0.04] border border-transparent text-white/80'
                  }`}
                >
                  {/* Left: Asset Details */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] border ${
                        m.category === 'stock'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : m.category === 'crypto'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {m.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-white tracking-tight">{m.symbol}</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium ${
                            m.category === 'stock'
                              ? 'bg-blue-500/20 text-blue-300'
                              : m.category === 'crypto'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {m.category}
                        </span>
                        {isActive && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-white/50">{m.name}</div>
                    </div>
                  </div>

                  {/* Right: Price & 24h Change */}
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-white/40 font-mono">24h Volume</div>
                      <div className="text-[12px] font-mono text-white/70">{m.volume24h}</div>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <div className="text-[14px] font-mono font-semibold text-white">
                        ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.precision })}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isPositive ? '+' : ''}{m.change24h}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] bg-black/30 flex items-center justify-between text-[11px] text-white/40">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="text-right font-mono">
            {filteredMarkets.length} of {markets.length} Markets
          </div>
        </div>
      </div>
    </div>
  );
};
