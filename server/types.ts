export type MarketCategory = 'crypto' | 'stock' | 'forex';

export interface MarketTicker {
  symbol: string;
  name: string;
  category: MarketCategory;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  precision: number;
  fundingRate: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  depthPercent: number;
}

export interface RecentTrade {
  id: string;
  time: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  markPrice: number;
  size: number;
  leverage: number;
  margin: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liqPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  fee?: number;
  timestamp: number;
}

export interface StockHolding {
  symbol: string;
  name: string;
  category: MarketCategory;
  shares: number;
  avgCost: number;
  totalCost: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  tradeMode?: 'spot' | 'margin';
  price: number;
  size: number;
  leverage: number;
  takeProfit?: number;
  stopLoss?: number;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short' | 'buy' | 'sell';
  tradeMode?: 'spot' | 'margin';
  entryPrice: number;
  closePrice: number;
  size: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  fee?: number;
  exitReason?: 'market' | 'take_profit' | 'stop_loss' | 'liquidation';
  closedAt: number;
}

export interface AiSignal {
  bias: 'STRONG BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG BEARISH';
  score: number; // 0 to 100
  volatilityForecast: 'LOW' | 'EXPANDING' | 'HIGH' | 'EXTREME';
  confidence: number;
  supportLevel: number;
  resistanceLevel: number;
  rationale: string;
}

export interface AccountState {
  balance: number;
  holdings: Record<string, StockHolding>;
  positions: Position[];
  openOrders: Order[];
  tradeHistory: ClosedTrade[];
}

export interface HoldingWithMarketData extends StockHolding {
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface AccountSummary {
  balance: number;
  cash: number;
  stockAssetValue: number;
  totalPortfolioValue: number;
  equity: number;
  marginUsed: number;
  availableMargin: number;
  marginRatioPercent: number;
  isMarginCall: boolean;
  totalUnrealizedPnl: number;
  holdings: Record<string, StockHolding>;
  holdingsList: HoldingWithMarketData[];
  positions: Position[];
  openOrders: Order[];
  tradeHistory: ClosedTrade[];
}

export type FeedMode = 'live' | 'simulated';

export interface FeedStatus {
  mode: FeedMode;
  binanceConnected: boolean;
  lastBinanceTick: number | null;
  lastStockUpdate: number | null;
  activeCryptoCount: number;
  activeStockCount: number;
}

export type WsMessageType =
  | 'INIT'
  | 'TICK'
  | 'CANDLE'
  | 'CANDLE_UPDATE'
  | 'ORDERBOOK'
  | 'TRADE'
  | 'ACCOUNT'
  | 'HOLDINGS_UPDATE'
  | 'ORDER_FILLED'
  | 'POSITION_CLOSED'
  | 'FEED_STATUS';

export interface WsMessage {
  type: WsMessageType;
  data: any;
}


