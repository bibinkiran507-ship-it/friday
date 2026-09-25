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

export interface StockHolding {
  symbol: string;
  name: string;
  category: MarketCategory;
  shares: number;
  avgCost: number;
  totalCost: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
  updatedAt: number;
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

export type FeedMode = 'live' | 'simulated';

export interface FeedStatus {
  mode: FeedMode;
  binanceConnected: boolean;
  lastBinanceTick: number | null;
  lastStockUpdate: number | null;
  activeCryptoCount: number;
  activeStockCount: number;
}

export type CopilotActionCard =
  | {
      type: 'order_intent';
      symbol: string;
      side: 'buy' | 'sell';
      tradeMode: 'spot' | 'margin';
      size: number;
      leverage: number;
      price: number;
      takeProfit?: number;
      stopLoss?: number;
      reqMargin: number;
      estFee: number;
      availableMargin: number;
    }
  | {
      type: 'close_intent';
      target: string;
      positions: Position[];
    }
  | {
      type: 'risk_audit';
      marginRatioPercent: number;
      marginUsed: number;
      availableMargin: number;
      cash: number;
      totalPortfolioValue: number;
      positionsCount: number;
      status: 'NOMINAL' | 'ELEVATED' | 'CRITICAL';
      advice?: string;
      totalUnrealizedPnl?: number;
      largestPosition?: string;
    }
  | {
      type: 'market_analysis';
      symbol: string;
      name: string;
      price: number;
      change24h: number;
      high24h: number;
      low24h: number;
      signal: AiSignal;
    }
  | {
      type: 'deposit_intent';
      amount: number;
    }
  | {
      type: 'market_scan';
      momentum: Array<{
        symbol: string;
        name: string;
        price: number;
        change24h: number;
        bias: string;
        confidence: number;
        support: number;
        resistance: number;
      }>;
      reversal: Array<{
        symbol: string;
        name: string;
        price: number;
        change24h: number;
        bias: string;
        confidence: number;
        support: number;
        resistance: number;
      }>;
      filter: string;
      scannedAt: number;
    };

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'friday';
  text: string;
  actionCard?: CopilotActionCard;
  timestamp: number;
}



