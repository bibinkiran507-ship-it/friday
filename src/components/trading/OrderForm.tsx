import React, { useState, useMemo, useEffect } from 'react';
import { useTrading } from '@/context/TradingContext';
import { Zap, ShieldCheck, Briefcase, Target, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

export const OrderForm: React.FC = () => {
  const {
    activeMarket,
    balance,
    availableMargin,
    marginUsed,
    marginRatioPercent,
    isMarginCall,
    holdings,
    placeOrder,
    orderPrefill,
  } = useTrading();

  const [tradeMode, setTradeMode] = useState<'spot' | 'margin'>('spot');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [leverage, setLeverage] = useState<number>(10);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('1');
  const [isPrefillFlash, setIsPrefillFlash] = useState<boolean>(false);

  // Bracket Orders (Take-Profit & Stop-Loss)
  const [tpEnabled, setTpEnabled] = useState<boolean>(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [slEnabled, setSlEnabled] = useState<boolean>(false);
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [showBracket, setShowBracket] = useState<boolean>(false);

  // Sync prefill from OrderBook click
  useEffect(() => {
    if (orderPrefill && orderPrefill.timestamp) {
      if (orderPrefill.type) setOrderType(orderPrefill.type);
      if (orderPrefill.side) setSide(orderPrefill.side);
      if (orderPrefill.price !== undefined) {
        setCustomPrice(orderPrefill.price.toFixed(activeMarket.precision));
      }
      if (orderPrefill.size !== undefined) {
        setAmount(orderPrefill.size.toFixed(3));
      }
      setIsPrefillFlash(true);
      const timer = setTimeout(() => setIsPrefillFlash(false), 1400);
      return () => clearTimeout(timer);
    }
  }, [orderPrefill, activeMarket.precision]);

  // Switch default tradeMode according to market category
  useEffect(() => {
    if (activeMarket.category === 'stock') {
      setTradeMode('spot');
      setAmount('10');
    } else {
      setAmount('0.25');
    }
  }, [activeMarket.symbol, activeMarket.category]);

  const leveragePresets = [1, 5, 10, 25, 50, 100];
  const percentShortcuts = [25, 50, 75, 100];

  const execPrice = useMemo(() => {
    if (orderType === 'market' || !customPrice) {
      return activeMarket.price;
    }
    const parsed = parseFloat(customPrice);
    return isNaN(parsed) || parsed <= 0 ? activeMarket.price : parsed;
  }, [orderType, customPrice, activeMarket.price]);

  // Current Stock Availability for active asset
  const currentHolding = holdings[activeMarket.symbol];
  const sharesOwned = currentHolding ? currentHolding.shares : 0;
  const stockValueOwned = Number((sharesOwned * activeMarket.price).toFixed(2));

  const parsedAmount = parseFloat(amount) || 0;
  const notionalValue = Number((parsedAmount * execPrice).toFixed(2));
  const effectiveLeverage = tradeMode === 'spot' ? 1 : leverage;
  const requiredMargin = Number((notionalValue / effectiveLeverage).toFixed(2));

  // Liquidation Price calculation (for margin mode)
  const estLiqPrice = useMemo(() => {
    if (tradeMode === 'spot' || !execPrice || effectiveLeverage <= 1) return 0;
    if (side === 'buy') {
      return Math.max(0, execPrice * (1 - 1 / effectiveLeverage + 0.005));
    } else {
      return execPrice * (1 + 1 / effectiveLeverage - 0.005);
    }
  }, [tradeMode, execPrice, effectiveLeverage, side]);

  // Bracket Presets
  const handleTpPreset = (pct: number) => {
    if (!execPrice || execPrice <= 0) return;
    setTpEnabled(true);
    let target = 0;
    if (side === 'buy') {
      target = execPrice * (1 + pct / 100);
    } else {
      target = Math.max(0.0001, execPrice * (1 - pct / 100));
    }
    setTakeProfitPrice(target.toFixed(activeMarket.precision));
  };

  const handleSlPreset = (pct: number) => {
    if (!execPrice || execPrice <= 0) return;
    setSlEnabled(true);
    let target = 0;
    if (side === 'buy') {
      target = Math.max(0.0001, execPrice * (1 - pct / 100));
    } else {
      target = execPrice * (1 + pct / 100);
    }
    setStopLossPrice(target.toFixed(activeMarket.precision));
  };

  // Risk : Reward ratio calculation
  const riskRewardInfo = useMemo(() => {
    const tp = tpEnabled && takeProfitPrice ? parseFloat(takeProfitPrice) : 0;
    const sl = slEnabled && stopLossPrice ? parseFloat(stopLossPrice) : 0;
    if (!tp || !sl || !execPrice) return null;

    let potentialGain = 0;
    let potentialRisk = 0;

    if (side === 'buy') {
      potentialGain = tp - execPrice;
      potentialRisk = execPrice - sl;
    } else {
      potentialGain = execPrice - tp;
      potentialRisk = sl - execPrice;
    }

    if (potentialGain <= 0 || potentialRisk <= 0) {
      return {
        isValid: false,
        message: side === 'buy' ? 'TP must be > Entry and SL must be < Entry' : 'TP must be < Entry and SL must be > Entry',
      };
    }

    const ratio = Number((potentialGain / potentialRisk).toFixed(2));
    const gainPercent = Number(((potentialGain / execPrice) * 100).toFixed(1));
    const riskPercent = Number(((potentialRisk / execPrice) * 100).toFixed(1));

    return {
      isValid: true,
      ratio,
      gainPercent,
      riskPercent,
    };
  }, [tpEnabled, takeProfitPrice, slEnabled, stopLossPrice, execPrice, side]);

  // Handle Percentage Quick Buttons
  const handlePercentClick = (pct: number) => {
    if (execPrice <= 0) return;

    if (tradeMode === 'spot') {
      if (side === 'buy') {
        if (balance <= 0) return;
        const cashToUse = (balance * pct) / 100;
        const computedShares = cashToUse / execPrice;
        const formatted = activeMarket.category === 'stock' ? Math.floor(computedShares) : Number(computedShares.toFixed(3));
        setAmount(String(Math.max(formatted, 0.01)));
      } else {
        if (sharesOwned <= 0) return;
        const sharesToSell = (sharesOwned * pct) / 100;
        const formatted = activeMarket.category === 'stock' ? Math.floor(sharesToSell) : Number(sharesToSell.toFixed(3));
        setAmount(String(Math.max(formatted, 0.01)));
      }
    } else {
      if (availableMargin <= 0) return;
      const maxMarginToUse = (availableMargin * pct) / 100;
      const maxNotional = maxMarginToUse * leverage;
      const computedSize = maxNotional / execPrice;
      setAmount(computedSize.toFixed(3));
    }
  };

  const isBracketInvalid = riskRewardInfo ? !riskRewardInfo.isValid : false;
  const isBuyDisabled = tradeMode === 'spot' ? notionalValue > balance || parsedAmount <= 0 : requiredMargin > availableMargin || parsedAmount <= 0 || isBracketInvalid;
  const isSellDisabled = tradeMode === 'spot' ? sharesOwned <= 0 || parsedAmount > sharesOwned || parsedAmount <= 0 : requiredMargin > availableMargin || parsedAmount <= 0 || isBracketInvalid;
  const isSubmitDisabled = side === 'buy' ? isBuyDisabled : isSellDisabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;

    const parsedTp = tpEnabled && takeProfitPrice ? parseFloat(takeProfitPrice) : undefined;
    const parsedSl = slEnabled && stopLossPrice ? parseFloat(stopLossPrice) : undefined;

    await placeOrder({
      side,
      type: orderType,
      tradeMode,
      price: orderType !== 'market' ? parseFloat(customPrice) : undefined,
      size: parsedAmount,
      leverage: tradeMode === 'spot' ? 1 : leverage,
      takeProfit: parsedTp && !isNaN(parsedTp) ? parsedTp : undefined,
      stopLoss: parsedSl && !isNaN(parsedSl) ? parsedSl : undefined,
    });
  };

  return (
    <div className="w-[310px] lg:w-[320px] bg-black/40 border-l border-white/[0.10] flex flex-col p-3 select-none overflow-y-auto text-[12px] gap-2.5 h-full">
      {/* 1. Clean Trading Mode Switcher */}
      <div className="flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5">
        <button
          type="button"
          onClick={() => setTradeMode('spot')}
          className={`flex-1 py-1 rounded-md font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all ${
            tradeMode === 'spot'
              ? 'bg-blue-600 text-white shadow-sm font-semibold'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Spot / Stock</span>
        </button>

        <button
          type="button"
          onClick={() => setTradeMode('margin')}
          className={`flex-1 py-1 rounded-md font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all ${
            tradeMode === 'margin'
              ? 'bg-purple-600 text-white shadow-sm font-semibold'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Futures / Margin</span>
        </button>
      </div>

      {/* 2. Stock Availability Info Card */}
      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono tabular-nums">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Briefcase className="w-3 h-3" />
          </div>
          <div>
            <div className="text-white/70 text-[9px]">Available Position</div>
            <div className="text-white font-semibold text-[11px]">
              {sharesOwned > 0 ? (
                <span className="text-emerald-400">
                  {sharesOwned} {activeMarket.symbol.split('/')[0]} (${stockValueOwned.toLocaleString()})
                </span>
              ) : (
                <span className="text-white/50">0 {activeMarket.symbol.split('/')[0]}</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-white/70 text-[9px]">Buying Power</div>
          <div className="text-emerald-400 font-semibold text-[11px]">
            ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* 3. Directional Tabs: Buy vs Sell */}
      <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={`py-1.5 rounded-lg font-semibold text-[12px] transition-all ${
            side === 'buy'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-white/50 hover:text-white'
          }`}
        >
          {tradeMode === 'spot' ? 'Buy Stock' : 'Buy / Long'}
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={`py-1.5 rounded-lg font-semibold text-[12px] transition-all ${
            side === 'sell'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
              : 'text-white/50 hover:text-white'
          }`}
        >
          {tradeMode === 'spot' ? 'Sell Stock' : 'Sell / Short'}
        </button>
      </div>

      {/* 4. Order Type Selector: Market / Limit / Stop */}
      <div className="flex items-center justify-between gap-1 bg-white/[0.02] p-0.5 rounded-lg border border-white/[0.06]">
        {(['market', 'limit', 'stop'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md capitalize transition-all ${
              orderType === type
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* 5. Leverage Controls (Margin Mode) */}
      {tradeMode === 'margin' && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/80">Cross Leverage</span>
            <span className="font-mono font-bold text-blue-400">{leverage}x</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {leveragePresets.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLeverage(lvl)}
                className={`py-1 text-[10px] font-mono rounded-md border transition-all ${
                  leverage === lvl
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold'
                    : 'border-white/[0.06] text-white/70 hover:text-white'
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Order Price (Limit/Stop) */}
      {orderType !== 'market' && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] text-white/80">
              Order Price ({activeMarket.symbol.split('/')[1] || 'USD'})
            </label>
            {isPrefillFlash && (
              <span className="text-[9px] font-mono text-cyan-300 font-semibold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Book Sync
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder={activeMarket.price.toString()}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className={`w-full bg-white/[0.04] border rounded-xl px-3 py-2 text-white font-mono text-[13px] focus:outline-none transition-all ${
                isPrefillFlash
                  ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400'
                  : 'border-white/10 focus:border-blue-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setCustomPrice(activeMarket.price.toString())}
              className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-[10px] text-blue-300 font-mono hover:bg-blue-500/30"
            >
              LAST
            </button>
          </div>
        </div>
      )}

      {/* 7. Quantity / Size Input */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-[10px] text-white/80 uppercase tracking-wider font-mono">
            {tradeMode === 'spot' ? 'Quantity' : 'Size'} ({activeMarket.symbol.split('/')[0]})
          </label>
          <span className="text-[10px] text-white/70 font-mono tabular-nums">
            ≈ ${notionalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
          </span>
        </div>
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-full bg-white/[0.03] border rounded-lg px-2.5 py-1.5 text-white font-mono tabular-nums text-[12px] focus:outline-none transition-all ${
            isPrefillFlash
              ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/80'
              : 'border-white/10 focus:border-cyan-500'
          }`}
        />
      </div>

      {/* 8. Percentage Quick Shortcuts */}
      <div className="grid grid-cols-4 gap-1">
        {percentShortcuts.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => handlePercentClick(pct)}
            className="py-1 text-[10px] font-mono tabular-nums rounded-md bg-white/[0.05] hover:bg-white/[0.10] text-white/80 hover:text-white border border-white/[0.10] transition-colors"
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* 8b. Bracket Orders: Take-Profit & Stop-Loss (OCO) */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setShowBracket(!showBracket)}
          className="w-full px-2.5 py-2 flex items-center justify-between text-[11px] font-medium text-white/90 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span>Bracket Orders (TP / SL)</span>
            {(tpEnabled || slEnabled) && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-semibold border border-emerald-500/30">
                ON
              </span>
            )}
          </div>
          {showBracket ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
        </button>

        {showBracket && (
          <div className="p-2.5 space-y-2.5 border-t border-white/[0.06] bg-black/20 text-[11px]">
            {/* Take-Profit Row */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 font-medium text-[10px]">
                  <input
                    type="checkbox"
                    checked={tpEnabled}
                    onChange={(e) => setTpEnabled(e.target.checked)}
                    className="rounded accent-emerald-500 cursor-pointer"
                  />
                  <span>Take Profit</span>
                </label>
                <div className="flex items-center gap-1">
                  {[5, 10, 25, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleTpPreset(pct)}
                      className="px-1.5 py-0.2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[9px] font-mono border border-emerald-500/20"
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {tpEnabled && (
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder={`Target Price (${activeMarket.symbol.split('/')[1] || 'USD'})`}
                    value={takeProfitPrice}
                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                    className="w-full bg-white/[0.03] border border-emerald-500/30 rounded-lg px-2.5 py-1 text-white font-mono tabular-nums text-[11px] focus:outline-none focus:border-emerald-400"
                  />
                  <span className="absolute right-2 top-1 text-[9px] text-emerald-400 font-mono font-bold">TP</span>
                </div>
              )}
            </div>

            {/* Stop-Loss Row */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-rose-400 font-medium text-[10px]">
                  <input
                    type="checkbox"
                    checked={slEnabled}
                    onChange={(e) => setSlEnabled(e.target.checked)}
                    className="rounded accent-rose-500 cursor-pointer"
                  />
                  <span>Stop Loss</span>
                </label>
                <div className="flex items-center gap-1">
                  {[2, 5, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSlPreset(pct)}
                      className="px-1.5 py-0.2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[9px] font-mono border border-rose-500/20"
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {slEnabled && (
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder={`Protective Stop (${activeMarket.symbol.split('/')[1] || 'USD'})`}
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    className="w-full bg-white/[0.03] border border-rose-500/30 rounded-lg px-2.5 py-1 text-white font-mono tabular-nums text-[11px] focus:outline-none focus:border-rose-400"
                  />
                  <span className="absolute right-2 top-1 text-[9px] text-rose-400 font-mono font-bold">SL</span>
                </div>
              )}
            </div>

            {/* Risk : Reward Ratio Indicator */}
            {riskRewardInfo && (
              <div
                className={`p-2 rounded-lg border text-[10px] font-mono tabular-nums flex items-center justify-between ${
                  riskRewardInfo.isValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {riskRewardInfo.isValid ? (
                  <>
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-emerald-400" />
                      <span>R:R Ratio</span>
                    </span>
                    <span className="font-bold text-[11px] text-emerald-400">
                      1 : {riskRewardInfo.ratio}
                    </span>
                    <span className="text-white/40">
                      +{riskRewardInfo.gainPercent}% / -{riskRewardInfo.riskPercent}%
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] leading-tight text-rose-300">
                    {riskRewardInfo.message}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 9. Order Cost Summary Card */}
      {(() => {
        const estFeeRate = orderType === 'market' ? 0.0004 : 0.0002;
        const estFee = Number((notionalValue * estFeeRate).toFixed(2));
        const projectedMarginUsed = Number((marginUsed + requiredMargin).toFixed(2));
        const projectedMarginRatio = balance > 0 ? Number(((projectedMarginUsed / balance) * 100).toFixed(1)) : 100;
        const willTriggerMarginCall = tradeMode === 'margin' && (projectedMarginRatio >= 80 || isMarginCall);

        return (
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-[11px] font-mono tabular-nums">
            <div className="flex justify-between text-white/80">
              <span>{tradeMode === 'spot' ? 'Total Cost' : 'Req. Margin'}</span>
              <span className="text-white font-semibold">${requiredMargin.toLocaleString()} USD</span>
            </div>

            {/* Trading Fee line */}
            <div className="flex justify-between text-white/80">
              <span>Est. Fee ({orderType === 'market' ? '0.04% Taker' : '0.02% Maker'})</span>
              <span className="text-white/90">${estFee.toFixed(2)} USD</span>
            </div>

            {tradeMode === 'margin' && (
              <>
                <div className="flex justify-between text-white/80">
                  <span>Est. Liq. Price</span>
                  <span className="text-amber-400 font-semibold">
                    {estLiqPrice > 0 ? `$${estLiqPrice.toFixed(activeMarket.precision)}` : 'Safe'}
                  </span>
                </div>

                <div className="flex justify-between text-white/80">
                  <span>Margin Utilization</span>
                  <span className={willTriggerMarginCall ? 'text-rose-400 font-bold' : 'text-white/95'}>
                    {marginRatioPercent}% → {projectedMarginRatio}%
                  </span>
                </div>

                {willTriggerMarginCall && (
                  <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] flex items-center gap-1.5 font-sans leading-tight">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>Warning: Margin utilization over 80%!</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between text-white/80 pt-0.5 border-t border-white/[0.08]">
              <span>{side === 'buy' ? 'Available Cash' : 'Available Shares'}</span>
              <span className={side === 'buy' ? 'text-emerald-400 font-semibold' : 'text-blue-400 font-semibold'}>
                {side === 'buy'
                  ? `$${balance.toLocaleString()} USD`
                  : `${sharesOwned} ${activeMarket.symbol.split('/')[0]}`}
              </span>
            </div>
          </div>
        );
      })()}

      {/* 10. Primary Submit Action Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`w-full py-2.5 rounded-xl font-bold text-[12px] tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
          side === 'buy'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25'
            : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-lg shadow-rose-500/25'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>
          {tradeMode === 'spot'
            ? `${side === 'buy' ? 'Buy' : 'Sell'} ${activeMarket.symbol.split('/')[0]} Stock`
            : `${side === 'buy' ? 'Open Long' : 'Open Short'} ${activeMarket.symbol}`}
        </span>
      </button>
    </div>
  );
};
