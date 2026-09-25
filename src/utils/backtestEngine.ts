import { Candle } from '@/types/trading';
import {
  StrategyType,
  StrategyOption,
  StrategyParamConfig,
  BacktestResult,
  BacktestTrade,
  EquityPoint,
} from '@/types/backtest';

export const AVAILABLE_STRATEGIES: StrategyOption[] = [
  {
    id: 'ema_cross',
    name: 'EMA Dual Crossover (Trend Following)',
    category: 'Trend Following',
    description:
      'Capitalizes on multi-timeframe trend formation. Long when Fast EMA crosses above Slow EMA; exits when Fast EMA crosses below Slow EMA.',
    pros: 'Captures huge trending moves with low churn',
    cons: 'Vulnerable to whipsaws in sideways/ranging markets',
  },
  {
    id: 'rsi_reversion',
    name: 'RSI Dynamic Mean Reversion',
    category: 'Mean Reversion',
    description:
      'Identifies extreme oversold exhaustions. Buys when Wilder RSI dips below the oversold threshold and recovers; exits at overbought exhaustion.',
    pros: 'High win rate in range-bound and consolidating markets',
    cons: 'Can suffer during persistent one-way trends',
  },
  {
    id: 'macd_momentum',
    name: 'MACD Zero-Lag Momentum Surge',
    category: 'Momentum',
    description:
      'Detects accelerating price velocity. Enters when the MACD line crosses above the Signal line with expanding positive histogram bars.',
    pros: 'Early entry on momentum shifts and structural breaks',
    cons: 'Occasional false signals during low-volume compression',
  },
  {
    id: 'bollinger_breakout',
    name: 'Bollinger Band Volatility Squeeze',
    category: 'Volatility Breakout',
    description:
      'Trades standard deviation expansions. Buys when price mean-reverts from the lower 2σ volatility band and targets the upper band.',
    pros: 'Mathematically bounded risk entries with dynamic volatility stops',
    cons: 'Premature exits if bands expand aggressively',
  },
];

export const DEFAULT_CONFIG: StrategyParamConfig = {
  initialCapital: 100000,
  positionSizePercent: 90,
  feePercent: 0.05, // 0.05% per side
  stopLossPercent: 4.0, // 4% stop loss
  takeProfitPercent: 12.0, // 12% take profit
  fastEma: 12,
  slowEma: 26,
  rsiPeriod: 14,
  rsiOversold: 32,
  rsiOverbought: 68,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  bbPeriod: 20,
  bbStdDev: 2.0,
};

// ─── Mathematical Indicators ──────────────────────────────────────────────────

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = new Array(data.length);
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma[i] = data[i];
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j];
      }
      sma[i] = sum / period;
    }
  }
  return sma;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(data.length).fill(50);
  if (data.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  return rsi;
}

export function calculateMACD(
  data: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const fastEma = calculateEMA(data, fast);
  const slowEma = calculateEMA(data, slow);
  const macdLine = fastEma.map((f, i) => f - slowEma[i]);
  const signalLine = calculateEMA(macdLine, signal);
  const hist = macdLine.map((m, i) => m - signalLine[i]);

  return { macd: macdLine, signal: signalLine, hist };
}

export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDevMult: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper = new Array(data.length);
  const lower = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper[i] = middle[i];
      lower[i] = middle[i];
    } else {
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSq += Math.pow(data[j] - middle[i], 2);
      }
      const stdDev = Math.sqrt(sumSq / period);
      upper[i] = middle[i] + stdDev * stdDevMult;
      lower[i] = middle[i] - stdDev * stdDevMult;
    }
  }

  return { upper, middle, lower };
}

// ─── Realistic Multi-Regime Historical Data Generator ─────────────────────────

export function generateHistoricalDataset(
  symbol: string,
  basePrice: number,
  days: number = 180,
  precision: number = 2
): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startTime = now - days * dayMs;

  // Determine asset characteristics
  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL');
  const baseVolatility = isCrypto ? 0.035 : 0.018;
  const drift = isCrypto ? 0.0008 : 0.0004;

  let currentClose = basePrice * (1 - drift * days * 0.5 + (Math.random() - 0.5) * 0.15);
  currentClose = Math.max(basePrice * 0.4, currentClose);

  for (let i = 0; i < days; i++) {
    const time = startTime + i * dayMs;
    // Regime cycles: alternating bull, bear, and consolidation phases
    const cycle = Math.sin((i / days) * Math.PI * 4);
    const regimeDrift = cycle * 0.003;
    const dailyVol = baseVolatility * (1 + 0.5 * Math.sin(i / 10));

    const shock = (Math.random() - 0.485) * dailyVol * 2 + regimeDrift;
    const open = currentClose;
    const close = Math.max(0.01, open * (1 + shock));
    const range = Math.abs(close - open);
    const high = Math.max(open, close) + Math.random() * range * 0.8 + close * 0.004;
    const low = Math.max(0.005, Math.min(open, close) - Math.random() * range * 0.8 - close * 0.004);
    const volume = Math.floor((1000 + Math.random() * 5000) * (close > open ? 1.2 : 0.9));

    candles.push({
      time,
      open: Number(open.toFixed(precision)),
      high: Number(high.toFixed(precision)),
      low: Number(low.toFixed(precision)),
      close: Number(close.toFixed(precision)),
      volume,
    });

    currentClose = close;
  }

  // Adjust final candle close to match current actual live price smoothly
  const factor = basePrice / candles[candles.length - 1].close;
  for (let i = 0; i < candles.length; i++) {
    const blend = i / (candles.length - 1);
    const scale = 1 + (factor - 1) * blend;
    candles[i].open = Number((candles[i].open * scale).toFixed(precision));
    candles[i].high = Number((candles[i].high * scale).toFixed(precision));
    candles[i].low = Number((candles[i].low * scale).toFixed(precision));
    candles[i].close = Number((candles[i].close * scale).toFixed(precision));
  }

  return candles;
}

// ─── Quantitative Backtesting Engine ──────────────────────────────────────────

export function runBacktest(
  strategyType: StrategyType,
  candles: Candle[],
  config: StrategyParamConfig = DEFAULT_CONFIG,
  symbol: string = 'BTC/USDT'
): BacktestResult {
  if (candles.length < 30) {
    throw new Error('Insufficient historical data for backtesting (minimum 30 candles required).');
  }

  const closes = candles.map((c) => c.close);
  const strategyInfo = AVAILABLE_STRATEGIES.find((s) => s.id === strategyType) || AVAILABLE_STRATEGIES[0];

  // Pre-calculate technical indicators
  const fastEma = calculateEMA(closes, config.fastEma);
  const slowEma = calculateEMA(closes, config.slowEma);
  const rsi = calculateRSI(closes, config.rsiPeriod);
  const { macd, signal: macdSignal, hist: macdHist } = calculateMACD(
    closes,
    config.macdFast,
    config.macdSlow,
    config.macdSignal
  );
  const { upper: bbUpper, lower: bbLower } = calculateBollingerBands(closes, config.bbPeriod, config.bbStdDev);

  let cash = config.initialCapital;
  let openPosition: {
    side: 'long';
    entryPrice: number;
    size: number;
    entryTime: number;
    stopLossPrice: number;
    takeProfitPrice: number;
  } | null = null;

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  const startPrice = closes[0];
  const benchmarkShares = config.initialCapital / startPrice;
  let peakEquity = config.initialCapital;

  // Candle-by-candle simulation (Strictly no-lookahead bias)
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentPrice = candle.close;

    // 1. Manage Active Position (Stop-Loss & Take-Profit)
    if (openPosition) {
      let exitPrice: number | null = null;
      let exitReason: 'stop_loss' | 'take_profit' | null = null;

      // Check intra-candle low for stop loss
      if (candle.low <= openPosition.stopLossPrice) {
        exitPrice = openPosition.stopLossPrice;
        exitReason = 'stop_loss';
      } else if (candle.high >= openPosition.takeProfitPrice) {
        // Check intra-candle high for take profit
        exitPrice = openPosition.takeProfitPrice;
        exitReason = 'take_profit';
      }

      if (exitPrice !== null && exitReason !== null) {
        const grossReturn = (exitPrice - openPosition.entryPrice) * openPosition.size;
        const fee = (openPosition.entryPrice * openPosition.size + exitPrice * openPosition.size) * (config.feePercent / 100);
        const netPnl = grossReturn - fee;
        const netPnlPercent = (netPnl / (openPosition.entryPrice * openPosition.size)) * 100;

        cash += openPosition.entryPrice * openPosition.size + netPnl;

        trades.push({
          id: `BT-${trades.length + 1}`,
          tradeNum: trades.length + 1,
          entryTime: openPosition.entryTime,
          exitTime: candle.time,
          entryDate: new Date(openPosition.entryTime).toLocaleDateString(),
          exitDate: new Date(candle.time).toLocaleDateString(),
          entryPrice: openPosition.entryPrice,
          exitPrice,
          side: 'long',
          size: openPosition.size,
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(netPnlPercent.toFixed(2)),
          cumulativeEquity: Number(cash.toFixed(2)),
          exitReason,
        });

        openPosition = null;
      }
    }

    // 2. Evaluate Strategy Signals
    let buySignal = false;
    let sellSignal = false;

    if (i >= 2) {
      switch (strategyType) {
        case 'ema_cross': {
          // Bullish Golden Cross: Fast crosses above Slow
          const crossOver = fastEma[i - 1] <= slowEma[i - 1] && fastEma[i] > slowEma[i];
          const crossUnder = fastEma[i - 1] >= slowEma[i - 1] && fastEma[i] < slowEma[i];
          if (crossOver) buySignal = true;
          if (crossUnder) sellSignal = true;
          break;
        }

        case 'rsi_reversion': {
          // Reversion from oversold
          const oversoldBounce = rsi[i - 1] < config.rsiOversold && rsi[i] >= config.rsiOversold;
          const overbought = rsi[i] >= config.rsiOverbought;
          if (oversoldBounce) buySignal = true;
          if (overbought) sellSignal = true;
          break;
        }

        case 'macd_momentum': {
          // MACD Bullish cross with expanding histogram
          const macdCross = macd[i - 1] <= macdSignal[i - 1] && macd[i] > macdSignal[i] && macdHist[i] > 0;
          const macdBear = macd[i - 1] >= macdSignal[i - 1] && macd[i] < macdSignal[i];
          if (macdCross) buySignal = true;
          if (macdBear) sellSignal = true;
          break;
        }

        case 'bollinger_breakout': {
          // Re-entry from lower band
          const lowerBounce = closes[i - 1] < bbLower[i - 1] && closes[i] >= bbLower[i];
          const upperTouch = closes[i] >= bbUpper[i];
          if (lowerBounce) buySignal = true;
          if (upperTouch) sellSignal = true;
          break;
        }
      }
    }

    // 3. Process Sell Signal on active position
    if (sellSignal && openPosition) {
      const exitPrice = currentPrice;
      const grossReturn = (exitPrice - openPosition.entryPrice) * openPosition.size;
      const fee = (openPosition.entryPrice * openPosition.size + exitPrice * openPosition.size) * (config.feePercent / 100);
      const netPnl = grossReturn - fee;
      const netPnlPercent = (netPnl / (openPosition.entryPrice * openPosition.size)) * 100;

      cash += openPosition.entryPrice * openPosition.size + netPnl;

      trades.push({
        id: `BT-${trades.length + 1}`,
        tradeNum: trades.length + 1,
        entryTime: openPosition.entryTime,
        exitTime: candle.time,
        entryDate: new Date(openPosition.entryTime).toLocaleDateString(),
        exitDate: new Date(candle.time).toLocaleDateString(),
        entryPrice: openPosition.entryPrice,
        exitPrice,
        side: 'long',
        size: openPosition.size,
        pnl: Number(netPnl.toFixed(2)),
        pnlPercent: Number(netPnlPercent.toFixed(2)),
        cumulativeEquity: Number(cash.toFixed(2)),
        exitReason: 'signal',
      });

      openPosition = null;
    }

    // 4. Process Buy Signal (Enter new position)
    if (buySignal && !openPosition && cash > 100) {
      const allocateCapital = cash * (config.positionSizePercent / 100);
      const size = allocateCapital / currentPrice;
      const entryFee = allocateCapital * (config.feePercent / 100);

      cash -= allocateCapital + entryFee;

      const stopLossPrice = currentPrice * (1 - config.stopLossPercent / 100);
      const takeProfitPrice = currentPrice * (1 + config.takeProfitPercent / 100);

      openPosition = {
        side: 'long',
        entryPrice: currentPrice,
        size,
        entryTime: candle.time,
        stopLossPrice,
        takeProfitPrice,
      };
    }

    // 5. Track Real-Time Equity Point
    const currentUnrealizedPnl = openPosition ? (currentPrice - openPosition.entryPrice) * openPosition.size : 0;
    const currentPositionCapital = openPosition ? openPosition.entryPrice * openPosition.size : 0;
    const currentStrategyEquity = Number((cash + currentPositionCapital + currentUnrealizedPnl).toFixed(2));
    const currentBenchmarkEquity = Number((benchmarkShares * currentPrice).toFixed(2));

    if (currentStrategyEquity > peakEquity) {
      peakEquity = currentStrategyEquity;
    }

    const drawdownPercent = peakEquity > 0 ? Number((((peakEquity - currentStrategyEquity) / peakEquity) * 100).toFixed(2)) : 0;

    equityCurve.push({
      time: candle.time,
      dateStr: new Date(candle.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      strategyEquity: currentStrategyEquity,
      benchmarkEquity: currentBenchmarkEquity,
      drawdownPercent,
      price: currentPrice,
    });
  }

  // Close any lingering open position at end of backtest period
  if (openPosition) {
    const finalCandle = candles[candles.length - 1];
    const exitPrice = finalCandle.close;
    const grossReturn = (exitPrice - openPosition.entryPrice) * openPosition.size;
    const fee = (openPosition.entryPrice * openPosition.size + exitPrice * openPosition.size) * (config.feePercent / 100);
    const netPnl = grossReturn - fee;
    const netPnlPercent = (netPnl / (openPosition.entryPrice * openPosition.size)) * 100;

    cash += openPosition.entryPrice * openPosition.size + netPnl;

    trades.push({
      id: `BT-${trades.length + 1}`,
      tradeNum: trades.length + 1,
      entryTime: openPosition.entryTime,
      exitTime: finalCandle.time,
      entryDate: new Date(openPosition.entryTime).toLocaleDateString(),
      exitDate: new Date(finalCandle.time).toLocaleDateString(),
      entryPrice: openPosition.entryPrice,
      exitPrice,
      side: 'long',
      size: openPosition.size,
      pnl: Number(netPnl.toFixed(2)),
      pnlPercent: Number(netPnlPercent.toFixed(2)),
      cumulativeEquity: Number(cash.toFixed(2)),
      exitReason: 'signal',
    });
  }

  // ─── Quantitative Statistical Calculations ─────────────────────────────────

  const finalStrategyEquity = equityCurve[equityCurve.length - 1]?.strategyEquity || config.initialCapital;
  const finalBenchmarkEquity = equityCurve[equityCurve.length - 1]?.benchmarkEquity || config.initialCapital;

  const totalReturnPercent = Number((((finalStrategyEquity - config.initialCapital) / config.initialCapital) * 100).toFixed(2));
  const benchmarkReturnPercent = Number((((finalBenchmarkEquity - config.initialCapital) / config.initialCapital) * 100).toFixed(2));
  const alphaPercent = Number((totalReturnPercent - benchmarkReturnPercent).toFixed(2));

  const sampleDays = candles.length;
  const annualizedReturnPercent = Number(
    ((Math.pow(Math.max(0.001, finalStrategyEquity / config.initialCapital), 365 / sampleDays) - 1) * 100).toFixed(2)
  );

  // Daily returns for Sharpe & Sortino calculation
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].strategyEquity;
    const curr = equityCurve[i].strategyEquity;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }

  const meanReturn = dailyReturns.reduce((acc, r) => acc + r, 0) / (dailyReturns.length || 1);
  const variance = dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (dailyReturns.length || 1);
  const stdDev = Math.sqrt(variance);

  // Downside deviation (only negative returns)
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideVariance = downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / (dailyReturns.length || 1);
  const downsideStdDev = Math.sqrt(downsideVariance);

  // Risk free rate (annualized 3% = ~0.000082 per day)
  const dailyRf = 0.03 / 365;
  const sharpeRatio = stdDev > 0 ? Number((((meanReturn - dailyRf) / stdDev) * Math.sqrt(252)).toFixed(2)) : 0;
  const sortinoRatio =
    downsideStdDev > 0 ? Number((((meanReturn - dailyRf) / downsideStdDev) * Math.sqrt(252)).toFixed(2)) : 0;

  // Maximum Drawdown
  const maxDrawdownPercent = Number(Math.max(...equityCurve.map((e) => e.drawdownPercent), 0).toFixed(2));

  // Trade metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const losingTrades = trades.filter((t) => t.pnl <= 0).length;
  const winRatePercent = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(2)) : 0;

  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const avgTradeReturnPercent =
    totalTrades > 0 ? Number((trades.reduce((acc, t) => acc + t.pnlPercent, 0) / totalTrades).toFixed(2)) : 0;
  const bestTradePercent = trades.length > 0 ? Math.max(...trades.map((t) => t.pnlPercent)) : 0;
  const worstTradePercent = trades.length > 0 ? Math.min(...trades.map((t) => t.pnlPercent)) : 0;

  return {
    strategy: strategyType,
    strategyName: strategyInfo.name,
    symbol,
    sampleDays,
    initialCapital: config.initialCapital,
    finalStrategyEquity,
    finalBenchmarkEquity,
    totalReturnPercent,
    benchmarkReturnPercent,
    alphaPercent,
    annualizedReturnPercent,
    sharpeRatio,
    sortinoRatio,
    maxDrawdownPercent,
    winRatePercent,
    profitFactor,
    totalTrades,
    winningTrades,
    losingTrades,
    avgTradeReturnPercent,
    bestTradePercent,
    worstTradePercent,
    equityCurve,
    trades,
  };
}

// ─── CSV Export Utility ───────────────────────────────────────────────────────

export function exportTradesToCSV(result: BacktestResult): void {
  const headers = [
    'Trade #',
    'Strategy',
    'Symbol',
    'Direction',
    'Entry Date',
    'Exit Date',
    'Entry Price ($)',
    'Exit Price ($)',
    'Size',
    'Net PnL ($)',
    'PnL (%)',
    'Cumulative Capital ($)',
    'Exit Reason',
  ];

  const rows = result.trades.map((t) => [
    t.tradeNum,
    result.strategyName,
    result.symbol,
    t.side.toUpperCase(),
    t.entryDate,
    t.exitDate,
    t.entryPrice.toFixed(2),
    t.exitPrice.toFixed(2),
    t.size.toFixed(4),
    t.pnl.toFixed(2),
    `${t.pnlPercent.toFixed(2)}%`,
    t.cumulativeEquity.toFixed(2),
    t.exitReason.replace('_', ' ').toUpperCase(),
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `QuantLab_${result.symbol.replace('/', '_')}_${result.strategy}_backtest.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
