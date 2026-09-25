export type StrategyType = 'ema_cross' | 'rsi_reversion' | 'macd_momentum' | 'bollinger_breakout';

export interface StrategyOption {
  id: StrategyType;
  name: string;
  category: 'Trend Following' | 'Mean Reversion' | 'Momentum' | 'Volatility Breakout';
  description: string;
  pros: string;
  cons: string;
}

export interface StrategyParamConfig {
  // Common
  initialCapital: number;
  positionSizePercent: number;
  feePercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;

  // EMA Cross
  fastEma: number;
  slowEma: number;

  // RSI Reversion
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;

  // MACD
  macdFast: number;
  macdSlow: number;
  macdSignal: number;

  // Bollinger Bands
  bbPeriod: number;
  bbStdDev: number;
}

export interface BacktestTrade {
  id: string;
  tradeNum: number;
  entryTime: number;
  exitTime: number;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  side: 'long' | 'short';
  size: number;
  pnl: number;
  pnlPercent: number;
  cumulativeEquity: number;
  exitReason: 'signal' | 'stop_loss' | 'take_profit';
}

export interface EquityPoint {
  time: number;
  dateStr: string;
  strategyEquity: number;
  benchmarkEquity: number;
  drawdownPercent: number;
  price: number;
}

export interface BacktestResult {
  strategy: StrategyType;
  strategyName: string;
  symbol: string;
  sampleDays: number;
  initialCapital: number;
  finalStrategyEquity: number;
  finalBenchmarkEquity: number;
  totalReturnPercent: number;
  benchmarkReturnPercent: number;
  alphaPercent: number;
  annualizedReturnPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPercent: number;
  winRatePercent: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgTradeReturnPercent: number;
  bestTradePercent: number;
  worstTradePercent: number;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
}
