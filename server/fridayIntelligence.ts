import 'dotenv/config';
import { MarketTicker, AccountSummary, Position } from './types.js';
import { marketEngine } from './marketEngine.js';
import { processWithGemini, isGeminiAvailable } from './geminiEngine.js';

export interface CopilotChatResponse {
  reply: string;
  actionCard?: any;
  timestamp: number;
  poweredBy?: 'gemini' | 'heuristic';
}

// ─────────────────────────────────────────────────────────────────────────────
// ASYNC ENTRY POINT — routes through Gemini if available, falls back to heuristic
// Called by routes.ts for POST /api/copilot/chat
// ─────────────────────────────────────────────────────────────────────────────

export async function processCopilotMessageAsync(
  message: string,
  activeSymbol: string = 'BTC/USDT',
  userName?: string,
  markets: MarketTicker[] = [],
  summary?: AccountSummary
): Promise<CopilotChatResponse> {
  // Try Gemini first
  if (isGeminiAvailable()) {
    try {
      const geminiResult = await processWithGemini(
        message,
        activeSymbol,
        userName || 'Boss',
        markets,
        summary || buildDefaultSummary()
      );
      return { ...geminiResult, poweredBy: 'gemini' };
    } catch (err: any) {
      console.warn('[F.R.I.D.A.Y.] Gemini call failed, falling back to heuristic:', err?.message);
    }
  }

  // Fallback to existing heuristic engine (sync)
  const heuristicResult = processCopilotMessage(message, activeSymbol, userName, markets, summary);
  return { ...heuristicResult, poweredBy: 'heuristic' };
}

function buildDefaultSummary(): AccountSummary {
  return {
    balance: 100000,
    cash: 100000,
    stockAssetValue: 0,
    totalPortfolioValue: 100000,
    equity: 100000,
    marginUsed: 0,
    availableMargin: 100000,
    marginRatioPercent: 0,
    isMarginCall: false,
    totalUnrealizedPnl: 0,
    holdings: {},
    holdingsList: [],
    positions: [],
    openOrders: [],
    tradeHistory: [],
  };
}

function resolveSymbol(raw: string, allMarkets: MarketTicker[], defaultSymbol: string): string {
  if (!raw) return defaultSymbol;
  const clean = raw.trim().toUpperCase().replace('/', '');
  const match = allMarkets.find(
    (m) =>
      m.symbol.toUpperCase().replace('/', '') === clean ||
      m.symbol.toUpperCase().startsWith(clean) ||
      m.name.toUpperCase().includes(clean)
  );
  return match ? match.symbol : defaultSymbol;
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function processCopilotMessage(
  message: string,
  activeSymbol: string = 'BTC/USDT',
  userName?: string,
  markets: MarketTicker[] = [],
  summary?: AccountSummary
): CopilotChatResponse {
  const lower = message.toLowerCase().trim();
  const currentSymbol = activeSymbol || 'BTC/USDT';
  const activeMarket = markets.find((m) => m.symbol === currentSymbol) || markets[0] || {
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    price: 78500,
    change24h: 0.5,
    high24h: 79000,
    low24h: 77500,
    precision: 2,
  };

  const currentSummary: AccountSummary = summary || buildDefaultSummary();

  // Determine user title
  const cleanName = userName && userName.trim() ? userName.trim().split(' ')[0] : '';
  const bossTitle = cleanName ? `Boss ${cleanName}` : 'Boss';
  const timeGreeting = getTimeOfDayGreeting();

  // ───────────────────────────────────────────────────────────────────────────
  // 1. INTERACTIVE GREETINGS & PERSONALIZED CONVERSATIONS
  // ───────────────────────────────────────────────────────────────────────────
  const isGreeting = /^(hi|hello|hey|greetings|morning|afternoon|evening|yo|sup|hiya|howdy|friday|wake up|start)(\s+.*)?$/i.test(lower) ||
    lower === 'hi friday' || lower === 'hello friday' || lower === 'hey friday';

  if (isGreeting) {
    const isUp = activeMarket.change24h >= 0;
    const activePositionsCount = currentSummary.positions.length;
    const marginUsage = currentSummary.marginRatioPercent;

    return {
      reply: `${timeGreeting}, ${bossTitle}! ⚡\n\nF.R.I.D.A.Y. tactical neural core is online and scanning markets in real-time. Here is your operational telemetry:\n\n• **Active Focus**: ${activeMarket.name} (${activeMarket.symbol}) at **$${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}** (${isUp ? '+' : ''}${activeMarket.change24h}% today)\n• **Collateral**: **$${currentSummary.balance.toLocaleString()}** cash (${activePositionsCount} active margin position${activePositionsCount === 1 ? '' : 's'}, ${marginUsage}% margin utilization)\n• **Neural Status**: Live matching engine synchronized with zero execution latency.\n\nHow would you like to proceed today, ${bossTitle}? You can ask me to analyze any chart, audit margin risk, calculate safe position sizes, or execute orders directly!`,
      timestamp: Date.now(),
    };
  }

  // Identity / "Who are you" / Capabilities
  if (/\b(who are you|what can you do|your role|help me|capabilities|what are you)\b/i.test(lower)) {
    return {
      reply: `I am **F.R.I.D.A.Y.** (Female Replacement Intelligent Digital Assistant Youth), your institutional-grade trading copilot and risk manager, ${bossTitle}.\n\nHere is how I assist your trading operations:\n\n1. **Natural Language Execution**: Say *"Buy 0.5 BTC with 10x leverage, TP 82000, SL 76000"* to stage ready-to-execute bracket orders.\n2. **Deep Technical Intelligence**: Ask me to evaluate **RSI, EMA 20/50 crosses, Bollinger Band squeezes, Fair Value Gaps (FVG)**, or Support & Resistance for any ticker.\n3. **Institutional Risk Management**: Command *"Audit risk"* or ask *"How do I size my position?"* to calculate exact position sizing based on the 1-2% risk rule.\n4. **Market Scanner**: Ask *"What looks good to trade?"* or *"Scan opportunities"* and I'll rank the best technical setups across crypto and equities.\n5. **Instant Liquidation Shield**: Say *"Close all positions"* or *"Close ETH"* for one-click emergency execution.`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ORDER EXECUTION INTENT (e.g. "buy 0.5 btc with 10x leverage tp 72000 sl 67000")
  // ───────────────────────────────────────────────────────────────────────────
  const isBuy = /\b(buy|long|purchase)\b/i.test(lower);
  const isSell = /\b(sell|short)\b/i.test(lower);

  if ((isBuy || isSell) && !/\b(how to buy|why buy|should i buy|when to buy|what to buy|explain buy)\b/i.test(lower)) {
    const sizeMatch = lower.match(/\b(?:buy|long|sell|short)\s+([0-9.]+)/i);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 1;

    const symbolMatch = lower.match(/\b(?:buy|long|sell|short)\s+[0-9.]+\s*([a-zA-Z0-9/]+)/i);
    const targetSymbol = resolveSymbol(symbolMatch ? symbolMatch[1] : '', markets, currentSymbol);
    const market = markets.find((m) => m.symbol === targetSymbol) || activeMarket;

    const levMatch = lower.match(/(?:leverage|lev|at|with)\s*(\d+)x?/i);
    const leverage = levMatch ? parseInt(levMatch[1], 10) : 1;

    const tpMatch = lower.match(/(?:tp|take profit|target)\s*(?:at)?\s*\$?([0-9.]+)/i);
    const takeProfit = tpMatch ? parseFloat(tpMatch[1]) : undefined;

    const slMatch = lower.match(/(?:sl|stop loss|stop)\s*(?:at)?\s*\$?([0-9.]+)/i);
    const stopLoss = slMatch ? parseFloat(slMatch[1]) : undefined;

    const notional = size * market.price;
    const reqMargin = Number((notional / leverage).toFixed(2));
    const estFee = Number((notional * 0.0004).toFixed(2));

    const side = isBuy ? 'buy' : 'sell';
    const tradeMode = leverage > 1 ? 'margin' : 'spot';

    let rRatioText = '';
    if (takeProfit && stopLoss) {
      const risk = Math.abs(market.price - stopLoss);
      const reward = Math.abs(takeProfit - market.price);
      if (risk > 0) {
        const rr = (reward / risk).toFixed(2);
        rRatioText = `\n• **Risk/Reward**: **1:${rr}** ${Number(rr) >= 2 ? '✅ (Favorable institutional ratio)' : '⚠️ (Less than recommended 1:2 R/R)'}`;
      }
    }

    return {
      reply: `Affirmative, ${bossTitle}. I have staged the **${isBuy ? 'LONG (BUY)' : 'SHORT (SELL)'}** order for **${size} ${market.symbol}** at mark price $${market.price.toLocaleString()} using **${leverage}x leverage**.\n\n• **Notional Capital**: $${notional.toLocaleString()}\n• **Required Margin**: $${reqMargin.toLocaleString()}\n• **Available Buffer**: $${currentSummary.availableMargin.toLocaleString()}${rRatioText}\n\nReview the parameters below and click **Authorize & Execute** to route to the order book.`,
      actionCard: {
        type: 'order_intent',
        symbol: market.symbol,
        side,
        tradeMode,
        size,
        leverage,
        price: market.price,
        takeProfit,
        stopLoss,
        reqMargin,
        estFee,
        availableMargin: currentSummary.availableMargin,
      },
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. POSITION CLOSURE & EMERGENCY LIQUIDATION INTENT
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(close|exit|liquidate)\b/i.test(lower)) {
    if (/\b(all|everything)\b/i.test(lower)) {
      return {
        reply: `⚠️ **Emergency Liquidation Directive**, ${bossTitle}! You have requested to close all **${currentSummary.positions.length} active positions**.\n\nConfirm below to liquidate all margin exposure at current mark price and return capital to cash collateral.`,
        actionCard: {
          type: 'close_intent',
          target: 'all',
          positions: currentSummary.positions,
        },
        timestamp: Date.now(),
      };
    }

    const closeTargetMatch = lower.match(/\b(?:close|exit)\s+([a-zA-Z0-9/]+)/i);
    const targetSymbol = resolveSymbol(closeTargetMatch ? closeTargetMatch[1] : '', markets, currentSymbol);
    const matching = currentSummary.positions.filter((p: Position) => p.symbol === targetSymbol);

    if (matching.length > 0) {
      const p = matching[0];
      return {
        reply: `Identified active position in **${targetSymbol}** (${p.side.toUpperCase()} ${p.size} units). Unrealized P&L is **${p.unrealizedPnl >= 0 ? '+' : ''}$${p.unrealizedPnl}** (${p.unrealizedPnlPercent >= 0 ? '+' : ''}${p.unrealizedPnlPercent}%).\n\nConfirm below to close this position at mark price.`,
        actionCard: {
          type: 'close_intent',
          target: targetSymbol,
          positions: matching,
        },
        timestamp: Date.now(),
      };
    } else {
      return {
        reply: `No active positions found for **${targetSymbol}**, ${bossTitle}. You currently hold **${currentSummary.positions.length} active positions**: ${currentSummary.positions.map((p: Position) => p.symbol).join(', ') || 'None'}.`,
        timestamp: Date.now(),
      };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PORTFOLIO RISK & MARGIN AUDIT
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(risk|margin|audit|liquidation|exposure|safety|health|portfolio status)\b/i.test(lower)) {
    const marginRatio = currentSummary.marginRatioPercent || 0;
    const isCritical = currentSummary.isMarginCall;
    const isElevated = marginRatio >= 50;

    let advice = 'Collateral reserves are optimal. Capital preservation metrics nominal.';
    if (isCritical) {
      advice = 'CRITICAL MARGIN ALERT: Utilization exceeds 80%. Immediate collateral deposit or position reduction advised to prevent automated liquidation.';
    } else if (isElevated) {
      advice = 'ELEVATED RISK: Over 50% of available collateral capacity is deployed. Consider tightening trailing stop-losses on volatile assets.';
    }

    return {
      reply: `Risk audit completed for your account, ${bossTitle}.\n\n• **Cash Collateral**: **$${currentSummary.balance.toLocaleString()}**\n• **Margin Deployed**: **$${currentSummary.marginUsed.toLocaleString()}** (${marginRatio}% of capacity)\n• **Available Margin Buffer**: **$${currentSummary.availableMargin.toLocaleString()}**\n• **Total Portfolio Equity**: **$${currentSummary.totalPortfolioValue.toLocaleString()}**\n• **Active Positions**: **${currentSummary.positions.length}**\n\n**Verdict**: ${advice}`,
      actionCard: {
        type: 'risk_audit',
        marginRatioPercent: marginRatio,
        marginUsed: currentSummary.marginUsed,
        availableMargin: currentSummary.availableMargin,
        cash: currentSummary.balance,
        totalPortfolioValue: currentSummary.totalPortfolioValue,
        positionsCount: currentSummary.positions.length,
        status: isCritical ? 'CRITICAL' : isElevated ? 'ELEVATED' : 'NOMINAL',
        advice,
      },
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. DEPOSIT / CAPITAL INJECTION INTENT
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(deposit|add funds|add cash|deposit funds)\b/i.test(lower)) {
    const depMatch = lower.match(/\b(?:deposit|add|fund)\s+\$?([0-9,]+)/i);
    const amount = depMatch ? parseFloat(depMatch[1].replace(/,/g, '')) : 10000;
    return {
      reply: `Collateral injection protocol initialized, ${bossTitle}. Click below to add **$${amount.toLocaleString()}** to cash balance immediately.`,
      actionCard: {
        type: 'deposit_intent',
        amount,
      },
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. DEEP TRADING EDUCATION: RSI (Relative Strength Index)
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(rsi|relative strength|overbought|oversold|divergence)\b/i.test(lower)) {
    return {
      reply: `Here is the institutional breakdown on **RSI (Relative Strength Index)**, ${bossTitle}:\n\n` +
        `### What is RSI?\n` +
        `RSI is a momentum oscillator measured on a scale from **0 to 100** that evaluates the speed and magnitude of recent price changes to identify overextended market conditions.\n\n` +
        `### Key Thresholds & Trading Rules:\n` +
        `• **Overbought (> 70)**: Buying momentum is stretched. In ranging markets, this signals exhaustion and a likely mean-reversion drop. *Note*: In strong parabolic bull runs, RSI can stay > 70 for extended periods—do not short blindly!\n` +
        `• **Oversold (< 30)**: Selling volume has climaxed. Signals a high probability for a relief bounce or bottoming structure.\n` +
        `• **The 50 Bull/Bear Line**: When RSI holds above 50, buyers dominate the order flow; below 50, sellers are in control.\n\n` +
        `### 💎 Institutional Edge: Divergences\n` +
        `• **Regular Bullish Divergence**: Price prints a *Lower Low*, but RSI prints a *Higher Low*. This indicates selling momentum is decaying even as price slips—often triggers explosive reversals!\n` +
        `• **Regular Bearish Divergence**: Price prints a *Higher High*, but RSI prints a *Lower High*. Smart money is taking profit while retail chases the breakout.\n\n` +
        `Would you like me to evaluate the current RSI on **${activeMarket.symbol}**?`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. DEEP TRADING EDUCATION: EMA, MOVING AVERAGES & CROSSES
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(ema|moving average|golden cross|death cross|sma)\b/i.test(lower)) {
    return {
      reply: `Here is how elite quant traders utilize **Exponential Moving Averages (EMAs)**, ${bossTitle}:\n\n` +
        `### EMA vs SMA:\n` +
        `Unlike a Simple Moving Average (SMA) which gives equal weight to all days, the **EMA applies higher mathematical weighting to recent price bars**. This dramatically reduces lag and gives faster signals on trend shifts.\n\n` +
        `### The Core EMAs on our Chart:\n` +
        `• **20 EMA (Yellow Line)**: Represents short-term trend momentum. In a healthy uptrend, price uses the 20 EMA as dynamic support.\n` +
        `• **50 EMA (Cyan Line)**: Intermediate trend baseline. When 20 EMA is above 50 EMA, trend structure is strictly bullish.\n` +
        `• **200 EMA (Macro Baseline)**: The benchmark institutional dividing line between macro bull and bear markets.\n\n` +
        `### High-Probability Strategy: The Pullback Setup\n` +
        `Never chase green candles extending far above the 20 EMA. Wait for price to pull back to retest the **20 EMA / 50 EMA confluence zone**, look for a bullish hammer or engulfing candle, and enter with a tight stop below the 50 EMA for a high Risk/Reward entry!`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. DEEP TRADING EDUCATION: BOLLINGER BANDS & VOLATILITY SQUEEZE
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(bollinger|bands|squeeze|volatility expansion)\b/i.test(lower)) {
    return {
      reply: `Here is the master guide on **Bollinger Bands & Volatility Squeezes**, ${bossTitle}:\n\n` +
        `### How Bollinger Bands Work:\n` +
        `Bollinger Bands consist of three lines:\n` +
        `1. **Middle Band**: 20-period Simple Moving Average (mean baseline)\n` +
        `2. **Upper Band**: Baseline + (2 × Standard Deviation)\n` +
        `3. **Lower Band**: Baseline - (2 × Standard Deviation)\n` +
        `Statistically, ~95% of all price action remains contained within these bands.\n\n` +
        `### 🚀 The "Bollinger Squeeze" Play:\n` +
        `Volatility is cyclical—periods of low volatility are inevitably followed by explosive expansion. When the bands contract tightly together, smart money is accumulating. The first candle that closes outside the bands accompanied by volume surge indicates the direction of the explosive breakout!`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. DEEP TRADING EDUCATION: POSITION SIZING, RISK/REWARD & 1% RULE
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(position size|sizing|how much to risk|risk reward|r:r|1% rule|2% rule|risk management|money management)\b/i.test(lower)) {
    const cash = currentSummary.balance;
    const onePctRisk = (cash * 0.01).toFixed(2);
    const twoPctRisk = (cash * 0.02).toFixed(2);

    return {
      reply: `Risk management is the single difference between amateur gamblers and profitable institutional traders, ${bossTitle}. Here is the formula:\n\n` +
        `### The Golden 1-2% Rule:\n` +
        `Never risk losing more than **1% to 2%** of your total portfolio on any single trade.\n` +
        `• On your current balance of **$${cash.toLocaleString()}**:\n` +
        `  - **1% Max Risk**: **$${onePctRisk}**\n` +
        `  - **2% Max Risk**: **$${twoPctRisk}**\n\n` +
        `### The Exact Position Sizing Formula:\n` +
        `$$\\text{Position Size} = \\frac{\\text{Account Capital} \\times \\text{Risk \\%}}{|\\text{Entry Price} - \\text{Stop Loss Price}|}$$\n\n` +
        `### Concrete Example on ${activeMarket.symbol}:\n` +
        `• Entry: **$${activeMarket.price}**\n` +
        `• Stop Loss: **$${(activeMarket.price * 0.98).toFixed(2)}** ($${(activeMarket.price * 0.02).toFixed(2)} risk per unit)\n` +
        `• To risk exactly $${onePctRisk} (1%), you should buy **${(Number(onePctRisk) / (activeMarket.price * 0.02)).toFixed(3)} ${activeMarket.symbol.split('/')[0]}**!\n\n` +
        `### Why 1:3 Risk/Reward is King:\n` +
        `At a 1:3 R/R ratio, you can **lose 6 out of 10 trades** (40% win rate) and still make significant net profit:\n` +
        `• 4 Wins × +$300 = +$1,200\n` +
        `• 6 Losses × -$100 = -$600\n` +
        `• **Net Profit = +$600**!`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. DEEP TRADING EDUCATION: LEVERAGE & LIQUIDATION MATHEMATICS
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(what is leverage|explain leverage|how leverage works|liquidation price|leverage risk)\b/i.test(lower)) {
    return {
      reply: `Here is the mathematical reality of **Leverage and Liquidation**, ${bossTitle}:\n\n` +
        `### What Leverage Actually Does:\n` +
        `Leverage allows you to borrow capital against your cash collateral to open larger notional positions. For instance, with **$10,000 cash at 10x leverage**, you control a **$100,000 position**.\n\n` +
        `### The Double-Edged Sword:\n` +
        `• A +1% favorable price move yields **+10% return** on your margin ($1,000 profit).\n` +
        `• A -1% adverse price move causes **-10% loss** on your margin.\n\n` +
        `### Liquidation Distance by Leverage:\n` +
        `• **2x Leverage**: Price must move ~49% against you to liquidate.\n` +
        `• **5x Leverage**: Price must move ~19% against you to liquidate.\n` +
        `• **10x Leverage**: Price must move ~9.5% against you to liquidate.\n` +
        `• **50x Leverage**: Price only needs to move **~1.8%** against you to wipe out your margin!\n\n` +
        `**Institutional Guideline**: Professional quants keep leverage under 5x for swing setups, and only use 10x+ for scalps with strictly enforced stop-losses!`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 11. DEEP TRADING EDUCATION: SUPPORT & RESISTANCE & SMC (Smart Money Concepts)
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(support and resistance|support|resistance|smc|smart money|fair value gap|fvg|order block|liquidity sweep)\b/i.test(lower)) {
    return {
      reply: `Here is the institutional breakdown on **Support, Resistance & Market Structure**, ${bossTitle}:\n\n` +
        `### Support & Resistance Dynamics:\n` +
        `• **Support**: A price floor where aggregate institutional buy orders absorb selling pressure, preventing further decline.\n` +
        `• **Resistance**: A price ceiling where aggregate sell orders and profit-taking overwhelm buyers.\n` +
        `• **The Role Reversal Principle**: When resistance is broken with high volume, it flips into **new support** on the retest.\n\n` +
        `### 🏦 Smart Money Concepts (SMC):\n` +
        `1. **Liquidity Sweeps**: Market makers will intentionally run price slightly past obvious equal highs or lows to trigger retail stop-loss orders (providing the liquidity they need) before reversing aggressively.\n` +
        `2. **Fair Value Gaps (FVG)**: Large single-direction impulse candles leave imbalances in the order book. Algorithms frequently revisit these zones to fill open orders.\n` +
        `3. **Break of Structure (BOS)**: A confirmed candle body close above a previous swing high confirms that the prevailing trend is still intact!`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 12. TRADING PSYCHOLOGY & AVOIDING MISTAKES
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(psychology|discipline|revenge trade|fomo|losing streak|emotional|mistakes|profitable trader)\b/i.test(lower)) {
    return {
      reply: `The hardest part of trading is not chart patterns, ${bossTitle}—it is psychology and emotional regulation. Here are the 4 institutional laws:\n\n` +
        `1. **Never Revenge Trade**: After taking a stop-loss, your brain experiences a dopamine deficit and urges you to double size to "win it back". This is the #1 account killer. Walk away for at least 15 minutes.\n` +
        `2. **Eliminate FOMO (Fear Of Missing Out)**: If an asset has already pumped +15% and is hitting major resistance, you missed the entry. Chasing it means you are buying the exact liquidity that early buyers are dumping into.\n` +
        `3. **Trade What You See, Not What You Hope**: Accept what the chart is showing. If your invalidation level is hit, take the loss immediately without moving your stop.\n` +
        `4. **Consistency over Home Runs**: Consistent +2% and +3% gains compounded over 100 trades will outperform sporadic 50x gambles every single time.`,
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 13. MARKET SCANNER & "WHAT SHOULD I TRADE?"
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(scan|what should i trade|what looks good|recommend trade|best setups|best opportunity|what to buy|top trades|opportunities)\b/i.test(lower)) {
    const topGainer = [...markets].sort((a, b) => b.change24h - a.change24h)[0] || activeMarket;
    const topDip = [...markets].sort((a, b) => a.change24h - b.change24h)[0] || activeMarket;

    const gainerSignal = marketEngine.getAiSignal(topGainer.symbol);
    const dipSignal = marketEngine.getAiSignal(topDip.symbol);

    return {
      reply: `Market scan completed across all active crypto and equity feeds, ${bossTitle}!\n\n` +
        `Here are the top 2 institutional setups identified by our neural momentum models:\n\n` +
        `### 🚀 1. Trend Momentum Play: **${topGainer.name} (${topGainer.symbol})**\n` +
        `• **Current Price**: $${topGainer.price.toLocaleString()}\n` +
        `• **24h Momentum**: +${topGainer.change24h}% (High volume leader)\n` +
        `• **Neural Bias**: **${gainerSignal.bias}** (${gainerSignal.confidence}% confidence)\n` +
        `• **Target Setup**: Buy pullbacks near support **$${gainerSignal.supportLevel.toLocaleString()}**, with Take-Profit at **$${gainerSignal.resistanceLevel.toLocaleString()}**.\n\n` +
        `### 📉 2. Reversal / Dip-Buy Setup: **${topDip.name} (${topDip.symbol})**\n` +
        `• **Current Price**: $${topDip.price.toLocaleString()}\n` +
        `• **24h Delta**: ${topDip.change24h}% (Approaching oversold exhaustion zone)\n` +
        `• **Support Floor**: **$${dipSignal.supportLevel.toLocaleString()}** (Key institutional demand block)\n` +
        `• **Setup**: Look for bullish divergence or a hammer candle on the 15m/1h chart for a relief bounce!\n\n` +
        `Would you like me to stage a bracket order for either **${topGainer.symbol}** or **${topDip.symbol}**?`,
      actionCard: {
        type: 'market_scan',
        momentum: [
          {
            symbol: topGainer.symbol,
            name: topGainer.name,
            price: topGainer.price,
            change24h: topGainer.change24h,
            bias: gainerSignal.bias,
            confidence: gainerSignal.confidence,
            support: gainerSignal.supportLevel,
            resistance: gainerSignal.resistanceLevel,
          },
        ],
        reversal: [
          {
            symbol: topDip.symbol,
            name: topDip.name,
            price: topDip.price,
            change24h: topDip.change24h,
            bias: dipSignal.bias,
            confidence: dipSignal.confidence,
            support: dipSignal.supportLevel,
            resistance: dipSignal.resistanceLevel,
          },
        ],
        filter: 'all',
        scannedAt: Date.now(),
      },
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 14. ASSET SPECIFIC ANALYSIS & PREDICTION (e.g. "analyze BTC", "is NVDA a buy?")
  // ───────────────────────────────────────────────────────────────────────────
  if (/\b(analyze|analysis|outlook|forecast|levels|check|predict|should i buy|is .* bullish|is .* bearish)\b/i.test(lower)) {
    const symbolMatch = lower.match(/\b(?:analyze|analysis|for|on|check|about|is|predict)\s+([a-zA-Z0-9/]+)/i);
    const targetSymbol = resolveSymbol(symbolMatch ? symbolMatch[1] : '', markets, currentSymbol);
    const market = markets.find((m) => m.symbol === targetSymbol) || activeMarket;
    const signal = marketEngine.getAiSignal(market.symbol);

    const isBull = signal.bias.includes('BULLISH');
    const rrRatio = signal.supportLevel > 0 ? ((signal.resistanceLevel - market.price) / (market.price - signal.supportLevel)).toFixed(2) : '2.10';

    return {
      reply: `Telemetry analysis for **${market.name} (${market.symbol})**, ${bossTitle}:\n\n` +
        `• **Current Mark Price**: **$${market.price.toLocaleString(undefined, { minimumFractionDigits: market.precision })}**\n` +
        `• **24h Delta**: **${market.change24h >= 0 ? '+' : ''}${market.change24h}%** (24h Range: $${market.low24h.toLocaleString()} — $${market.high24h.toLocaleString()})\n` +
        `• **Neural Model Bias**: **${signal.bias}** (${signal.confidence}% confidence)\n` +
        `• **Key Demand Support**: **$${signal.supportLevel.toLocaleString()}**\n` +
        `• **Key Supply Resistance**: **$${signal.resistanceLevel.toLocaleString()}**\n` +
        `• **Projected R/R**: ~**1:${Math.max(1.2, parseFloat(rrRatio) || 2.0)}**\n\n` +
        `**Actionable Strategy**: ${
          isBull
            ? `The path of least resistance is up. Look for consolidation above $${signal.supportLevel.toLocaleString()} to enter Long targeting resistance at $${signal.resistanceLevel.toLocaleString()}.`
            : `Sellers are in control of order flow. A clean breakdown below $${signal.supportLevel.toLocaleString()} opens continuation lower, while a close above $${signal.resistanceLevel.toLocaleString()} would invalidate the bearish bias.`
        }`,
      actionCard: {
        type: 'market_analysis',
        symbol: market.symbol,
        name: market.name,
        price: market.price,
        change24h: market.change24h,
        high24h: market.high24h,
        low24h: market.low24h,
        signal,
      },
      timestamp: Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 15. DEFAULT RESPONSIVE STARK ASSISTANT PERSONA
  // ───────────────────────────────────────────────────────────────────────────
  const isUp = activeMarket.change24h >= 0;
  return {
    reply: `I copy, ${bossTitle}.\n\nCurrently tracking **${activeMarket.name} (${activeMarket.symbol})** at **$${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}** (${isUp ? '+' : ''}${activeMarket.change24h}%). Cash reserves stand at **$${currentSummary.balance.toLocaleString()}** with **${currentSummary.positions.length} active positions**.\n\nYou can ask me:\n• *"What is RSI or EMA and how do I trade it?"*\n• *"How should I size my position with the 1% risk rule?"*\n• *"Scan the market for top opportunities"*\n• *"Analyze ${activeMarket.symbol}"*\n• *"Buy 0.5 ${activeMarket.symbol} with 10x leverage"*`,
    timestamp: Date.now(),
  };
}
