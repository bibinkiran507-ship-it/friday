import React, { useState, useMemo } from 'react';
import { useTrading } from '@/context/TradingContext';
import { Position } from '@/types/trading';
import {
  Layers,
  Clock,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  Target,
  Edit2,
  ShieldAlert,
  Download,
} from 'lucide-react';

export const PositionsTable: React.FC = () => {
  const {
    positions,
    openOrders,
    tradeHistory,
    holdingsList,
    stockAssetValue,
    totalPortfolioValue,
    activeSymbol,
    setActiveSymbol,
    placeOrder,
    closePosition,
    closeAllPositions,
    exportTradeHistoryCsv,
    cancelOrder,
    updatePositionBracket,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'holdings' | 'positions' | 'orders' | 'history'>('holdings');
  const [filterQuery, setFilterQuery] = useState('');
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [showCloseAllModal, setShowCloseAllModal] = useState<boolean>(false);
  const [editTp, setEditTp] = useState<string>('');
  const [editSl, setEditSl] = useState<string>('');

  const handleOpenEditBracket = (pos: Position) => {
    setEditingPosition(pos);
    setEditTp(pos.takeProfit ? String(pos.takeProfit) : '');
    setEditSl(pos.stopLoss ? String(pos.stopLoss) : '');
  };

  const handleSaveBracket = async () => {
    if (!editingPosition) return;
    const tp = editTp.trim() ? parseFloat(editTp) : null;
    const sl = editSl.trim() ? parseFloat(editSl) : null;
    await updatePositionBracket(editingPosition.id, tp, sl);
    setEditingPosition(null);
  };

  const handleQuickSell = async (symbol: string, shares: number) => {
    setActiveSymbol(symbol);
    await placeOrder({
      symbol,
      side: 'sell',
      type: 'market',
      tradeMode: 'spot',
      size: shares,
      leverage: 1,
    });
  };

  // Filter items based on filterQuery
  const filteredHoldings = useMemo(() => {
    if (!filterQuery.trim()) return holdingsList;
    const q = filterQuery.toLowerCase().trim();
    return holdingsList.filter((h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q));
  }, [holdingsList, filterQuery]);

  const filteredPositions = useMemo(() => {
    if (!filterQuery.trim()) return positions;
    const q = filterQuery.toLowerCase().trim();
    return positions.filter((p) => p.symbol.toLowerCase().includes(q));
  }, [positions, filterQuery]);

  const filteredOrders = useMemo(() => {
    if (!filterQuery.trim()) return openOrders;
    const q = filterQuery.toLowerCase().trim();
    return openOrders.filter((o) => o.symbol.toLowerCase().includes(q) || o.side.toLowerCase().includes(q));
  }, [openOrders, filterQuery]);

  const filteredHistory = useMemo(() => {
    if (!filterQuery.trim()) return tradeHistory;
    const q = filterQuery.toLowerCase().trim();
    return tradeHistory.filter((t) => t.symbol.toLowerCase().includes(q) || t.side.toLowerCase().includes(q));
  }, [tradeHistory, filterQuery]);

  return (
    <div className="h-[220px] bg-transparent border-t border-white/[0.08] flex flex-col select-none text-[12px]">
      {/* ─── Clean Panel Tabs Header ────────────────────────────────────────── */}
      <div className="h-[38px] border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between bg-transparent shrink-0">
        <div className="flex items-center gap-2">
          {/* Segmented Pill Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] gap-0.5">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTab === 'holdings'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              <span>Holdings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white/90 text-[9px] font-mono tabular-nums">
                {holdingsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('positions')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTab === 'positions'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Margin</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white/90 text-[9px] font-mono tabular-nums">
                {positions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Orders</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white/90 text-[9px] font-mono tabular-nums">
                {openOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white/90 text-[9px] font-mono tabular-nums">
                {tradeHistory.length}
              </span>
            </button>
          </div>
        </div>

        {/* Right Info Metric & Quick Search */}
        <div className="flex items-center gap-3">
          {/* Quick Filter Input */}
          <div className="relative hidden md:block">
            <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter tab..."
              className="bg-black/30 border border-white/10 focus:border-cyan-500/50 rounded-lg pl-7 pr-6 py-1 text-[11px] font-mono text-white placeholder-white/30 focus:outline-none w-40 transition-all"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1.5 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {activeTab === 'holdings' && (
            <div className="text-[11px] font-mono tabular-nums text-white/60 flex items-center gap-1.5">
              <span className="text-white/40">Holdings:</span>
              <span className="text-emerald-400 font-semibold">${stockAssetValue.toLocaleString()} USD</span>
            </div>
          )}

          {activeTab === 'positions' && positions.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="text-[11px] font-mono tabular-nums text-white/60 hidden sm:flex items-center gap-1.5">
                <span className="text-white/40">Margin:</span>
                <span className="text-amber-400 font-semibold">
                  ${positions.reduce((a, b) => a + b.margin, 0).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseAllModal(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold font-mono transition-all shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                title="Emergency: Close all open margin positions"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Close All ({positions.length})</span>
              </button>
            </div>
          )}

          {activeTab === 'history' && tradeHistory.length > 0 && (
            <button
              type="button"
              onClick={exportTradeHistoryCsv}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.12] text-cyan-300 hover:text-white border border-cyan-500/30 text-[10px] font-mono font-medium transition-all"
              title="Download full trade history as CSV"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Table Body Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-2">
        {/* TAB 1: HOLDINGS */}
        {activeTab === 'holdings' &&
          (filteredHoldings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-1">
              <Briefcase className="w-6 h-6 stroke-1 text-white/20" />
              <div className="text-[12px]">
                {filterQuery ? `No holdings match "${filterQuery}"` : 'No spot assets in portfolio.'}
              </div>
              <div className="text-[11px] text-white/40">
                Purchase shares using "Spot / Stock" in the order entry panel.
              </div>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="text-white/40 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
                  <th className="py-1 px-2 font-normal text-left">Asset</th>
                  <th className="py-1 px-2 font-normal text-right">Shares</th>
                  <th className="py-1 px-2 font-normal text-right">Avg Cost</th>
                  <th className="py-1 px-2 font-normal text-right">Current Price</th>
                  <th className="py-1 px-2 font-normal text-right">Total Value</th>
                  <th className="py-1 px-2 font-normal text-right">Unrealized P&L</th>
                  <th className="py-1 px-2 font-normal text-right">Weight</th>
                  <th className="py-1 px-2 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredHoldings.map((h) => {
                  const isProfit = (h.unrealizedPnl || 0) >= 0;
                  const portPct =
                    totalPortfolioValue > 0 ? (((h.marketValue || 0) / totalPortfolioValue) * 100).toFixed(1) : '0.0';

                  return (
                    <tr
                      key={h.symbol}
                      className={`hover:bg-white/[0.06] cursor-pointer transition-colors ${
                        h.symbol === activeSymbol ? 'bg-cyan-500/[0.07] border-l-2 border-cyan-400' : ''
                      }`}
                      onClick={() => setActiveSymbol(h.symbol)}
                      title={`Click to load ${h.symbol} chart`}
                    >
                      <td className="py-2 px-2 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{h.symbol}</span>
                          {h.symbol === activeSymbol && (
                            <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono uppercase font-bold border border-cyan-500/40">
                              CHART
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40 font-sans">{h.name}</div>
                      </td>
                      <td className="py-2 px-2 text-right text-white font-medium">{h.shares}</td>
                      <td className="py-2 px-2 text-right text-white/80">${h.avgCost.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-white font-medium">${(h.currentPrice || h.avgCost).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-emerald-300 font-semibold">${(h.marketValue || 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`font-semibold inline-flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isProfit ? '+' : ''}${h.unrealizedPnl?.toLocaleString()} ({isProfit ? '+' : ''}{h.unrealizedPnlPercent}%)
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-white/70">{portPct}%</td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickSell(h.symbol, h.shares);
                          }}
                          className="px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-sans font-medium transition-all"
                        >
                          Sell All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

        {/* TAB 2: MARGIN POSITIONS */}
        {activeTab === 'positions' &&
          (filteredPositions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-1">
              <Layers className="w-6 h-6 stroke-1 text-white/20" />
              <div className="text-[12px]">
                {filterQuery ? `No positions match "${filterQuery}"` : 'No open margin positions.'}
              </div>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="text-white/40 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
                  <th className="py-1 px-2 font-normal text-left">Market</th>
                  <th className="py-1 px-2 font-normal text-left">Side</th>
                  <th className="py-1 px-2 font-normal text-right">Size</th>
                  <th className="py-1 px-2 font-normal text-right">Entry</th>
                  <th className="py-1 px-2 font-normal text-right">Mark</th>
                  <th className="py-1 px-2 font-normal text-right">Liq. Price</th>
                  <th className="py-1 px-2 font-normal text-right">Margin</th>
                  <th className="py-1 px-2 font-normal text-center">TP / SL</th>
                  <th className="py-1 px-2 font-normal text-right">Unrealized PnL</th>
                  <th className="py-1 px-2 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredPositions.map((pos) => {
                  const isProfit = pos.unrealizedPnl >= 0;
                  return (
                    <tr
                      key={pos.id}
                      onClick={() => setActiveSymbol(pos.symbol)}
                      title={`Click to load ${pos.symbol} chart`}
                      className={`hover:bg-white/[0.06] cursor-pointer transition-colors ${
                        pos.symbol === activeSymbol ? 'bg-cyan-500/[0.07] border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="py-2 px-2 text-left">
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          <span>{pos.symbol}</span>
                          {pos.symbol === activeSymbol && (
                            <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono uppercase font-bold border border-cyan-500/40">
                              CHART
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-left">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            pos.side === 'long'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.side} {pos.leverage}x
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-white">{pos.size}</td>
                      <td className="py-2 px-2 text-right text-white/80">${pos.entryPrice.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-white font-medium">${pos.markPrice.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-amber-400">
                        {pos.liqPrice > 0 ? `$${pos.liqPrice.toLocaleString()}` : 'None'}
                      </td>
                      <td className="py-2 px-2 text-right text-white/80">${pos.margin.toLocaleString()}</td>
                      <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {pos.takeProfit || pos.stopLoss ? (
                            <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                              {pos.takeProfit ? (
                                <span className="text-emerald-400 font-medium">TP: ${pos.takeProfit.toLocaleString()}</span>
                              ) : null}
                              {pos.stopLoss ? (
                                <span className="text-rose-400 font-medium">SL: ${pos.stopLoss.toLocaleString()}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-white/30 text-[10px]">--</span>
                          )}
                          <button
                            onClick={() => handleOpenEditBracket(pos)}
                            title="Edit Take Profit & Stop Loss"
                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={`font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${pos.unrealizedPnl} ({isProfit ? '+' : ''}{pos.unrealizedPnlPercent}%)
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center rounded-md bg-white/[0.04] border border-white/10 p-0.5 gap-0.5">
                            <button
                              type="button"
                              onClick={() => closePosition(pos.id, 0.25)}
                              title="Take partial profit: Close 25%"
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              25%
                            </button>
                            <button
                              type="button"
                              onClick={() => closePosition(pos.id, 0.50)}
                              title="Take partial profit: Close 50%"
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              onClick={() => closePosition(pos.id, 0.75)}
                              title="Take partial profit: Close 75%"
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              75%
                            </button>
                            <button
                              type="button"
                              onClick={() => closePosition(pos.id, 1.0)}
                              title="Close 100% (Market)"
                              className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-semibold transition-all shadow-sm"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

        {/* TAB 3: OPEN ORDERS */}
        {activeTab === 'orders' &&
          (filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-1">
              <Clock className="w-6 h-6 stroke-1 text-white/20" />
              <div className="text-[12px]">No open limit or stop orders.</div>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="text-white/40 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
                  <th className="py-1 px-2 font-normal text-left">Market</th>
                  <th className="py-1 px-2 font-normal text-left">Type</th>
                  <th className="py-1 px-2 font-normal text-left">Side</th>
                  <th className="py-1 px-2 font-normal text-right">Price</th>
                  <th className="py-1 px-2 font-normal text-right">Size</th>
                  <th className="py-1 px-2 font-normal text-right">Leverage</th>
                  <th className="py-1 px-2 font-normal text-right">Placed Time</th>
                  <th className="py-1 px-2 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-2 px-2 text-left font-semibold text-white">{ord.symbol}</td>
                    <td className="py-2 px-2 text-left uppercase text-white/70">{ord.type}</td>
                    <td className="py-2 px-2 text-left uppercase font-semibold">
                      <span className={ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                        {ord.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-white font-medium">${ord.price.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-white/90">{ord.size}</td>
                    <td className="py-2 px-2 text-right text-white/60">{ord.leverage}x</td>
                    <td className="py-2 px-2 text-right text-white/40">
                      {new Date(ord.timestamp).toTimeString().split(' ')[0]}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => cancelOrder(ord.id)}
                        className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-sans font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {/* TAB 4: TRADE HISTORY */}
        {activeTab === 'history' &&
          (filteredHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-1">
              <CheckCircle2 className="w-6 h-6 stroke-1 text-white/20" />
              <div className="text-[12px]">No closed trade history yet.</div>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="text-white/40 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
                  <th className="py-1 px-2 font-normal text-left">Market</th>
                  <th className="py-1 px-2 font-normal text-left">Direction</th>
                  <th className="py-1 px-2 font-normal text-right">Size</th>
                  <th className="py-1 px-2 font-normal text-right">Entry Price</th>
                  <th className="py-1 px-2 font-normal text-right">Close Price</th>
                  <th className="py-1 px-2 font-normal text-center">Trigger</th>
                  <th className="py-1 px-2 font-normal text-right">Net PnL</th>
                  <th className="py-1 px-2 font-normal text-right">Closed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredHistory.map((tr) => {
                  const isProfit = tr.pnl >= 0;
                  return (
                    <tr key={tr.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-2 px-2 text-left font-semibold text-white">{tr.symbol}</td>
                      <td className="py-2 px-2 text-left">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            tr.side === 'long' || tr.side === 'buy'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tr.side}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-white/80">{tr.size}</td>
                      <td className="py-2 px-2 text-right text-white/70">${tr.entryPrice.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-white font-medium">${tr.closePrice.toLocaleString()}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                            tr.exitReason === 'take_profit'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : tr.exitReason === 'stop_loss'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : tr.exitReason === 'liquidation'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-white/[0.06] text-white/60'
                          }`}
                        >
                          {tr.exitReason ? tr.exitReason.replace('_', ' ').toUpperCase() : 'MARKET'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${tr.pnl.toLocaleString()} ({isProfit ? '+' : ''}{tr.pnlPercent}%)
                          </span>
                          {tr.fee !== undefined && tr.fee > 0 && (
                            <span className="text-[9px] text-white/35 font-mono">Fee: -${tr.fee.toFixed(2)}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-white/40">
                        {new Date(tr.closedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
      </div>

      {/* ─── Inline Edit Bracket Modal ────────────────────────────────────── */}
      {editingPosition && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0e1227]/85 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4 backdrop-blur-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white text-[14px]">Edit Bracket ({editingPosition.symbol})</h3>
              </div>
              <button
                onClick={() => setEditingPosition(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-[12px]">
              <div className="flex justify-between text-white/50 text-[11px]">
                <span>Entry: ${editingPosition.entryPrice.toLocaleString()}</span>
                <span>Mark: ${editingPosition.markPrice.toLocaleString()}</span>
              </div>

              {/* TP input */}
              <div className="space-y-1">
                <div className="text-[11px] text-emerald-400 font-sans font-medium flex items-center justify-between">
                  <span>Take-Profit Target ($)</span>
                  {editTp && (
                    <button
                      type="button"
                      onClick={() => setEditTp('')}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="No Take Profit"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  className="w-full bg-white/[0.04] border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono text-[12px] focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* SL input */}
              <div className="space-y-1">
                <div className="text-[11px] text-rose-400 font-sans font-medium flex items-center justify-between">
                  <span>Stop-Loss Level ($)</span>
                  {editSl && (
                    <button
                      type="button"
                      onClick={() => setEditSl('')}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="No Stop Loss"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  className="w-full bg-white/[0.04] border border-rose-500/30 rounded-xl px-3 py-2 text-white font-mono text-[12px] focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPosition(null)}
                className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white text-[12px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBracket}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-[12px] shadow-lg shadow-blue-500/25 transition-all"
              >
                Save Bracket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal: Emergency Liquidate All Positions ─────────── */}
      {showCloseAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0D122B] border border-rose-500/40 rounded-2xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.3)] text-white select-none">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">Emergency Close All Positions</h3>
                <p className="text-[11px] text-white/50">Immediate market liquidation safeguard</p>
              </div>
            </div>

            <p className="text-[12px] text-white/80 leading-relaxed mb-4">
              Are you sure you want to close <strong className="text-rose-300 font-mono">{positions.length} open margin positions</strong>? All tied collateral will immediately return to your available cash balance.
            </p>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] mb-4 space-y-2 text-[11px] font-mono">
              <div className="flex justify-between text-white/70">
                <span>Total Positions to Liquidate:</span>
                <span className="font-bold text-white">{positions.length}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Collateral Released to Cash:</span>
                <span className="font-bold text-amber-300">
                  ${positions.reduce((acc, p) => acc + p.margin, 0).toLocaleString()} USD
                </span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Estimated Net Realized PnL:</span>
                {(() => {
                  const net = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
                  return (
                    <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {net >= 0 ? '+' : ''}${net.toFixed(2)} USD
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCloseAllModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-[12px] font-medium text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowCloseAllModal(false);
                  await closeAllPositions();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[12px] shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Liquidate All Positions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
