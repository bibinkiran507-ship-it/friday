import { MarketTicker, Candle, OrderBookEntry, RecentTrade, AiSignal, FeedMode, FeedStatus } from './types.js';
import { dataFeedService, CRYPTO_SYMBOL_MAP, STOCK_SYMBOL_MAP } from './dataFeedService.js';

export const INITIAL_MARKETS: MarketTicker[] = [
  {
    symbol: 'NVDA/USD',
    name: 'NVIDIA Corp',
    category: 'stock',
    price: 128.45,
    change24h: 3.42,
    high24h: 131.2,
    low24h: 125.8,
    volume24h: '$3.45B',
    precision: 2,
    fundingRate: 0.0025,
  },
  {
    symbol: 'AAPL/USD',
    name: 'Apple Inc',
    category: 'stock',
    price: 224.50,
    change24h: 1.85,
    high24h: 226.8,
    low24h: 221.3,
    volume24h: '$2.80B',
    precision: 2,
    fundingRate: 0.0018,
  },
  {
    symbol: 'TSLA/USD',
    name: 'Tesla Inc',
    category: 'stock',
    price: 218.80,
    change24h: 4.62,
    high24h: 222.5,
    low24h: 211.4,
    volume24h: '$4.12B',
    precision: 2,
    fundingRate: 0.0035,
  },
  {
    symbol: 'MSFT/USD',
    name: 'Microsoft Corp',
    category: 'stock',
    price: 417.30,
    change24h: 1.15,
    high24h: 420.0,
    low24h: 414.2,
    volume24h: '$1.95B',
    precision: 2,
    fundingRate: 0.0015,
  },
  {
    symbol: 'AMZN/USD',
    name: 'Amazon.com Inc',
    category: 'stock',
    price: 182.60,
    change24h: 2.10,
    high24h: 184.8,
    low24h: 179.5,
    volume24h: '$2.25B',
    precision: 2,
    fundingRate: 0.002,
  },
  {
    symbol: 'SPY/USD',
    name: 'S&P 500 Index ETF',
    category: 'stock',
    price: 554.20,
    change24h: 0.85,
    high24h: 556.8,
    low24h: 551.4,
    volume24h: '$5.85B',
    precision: 2,
    fundingRate: 0.001,
  },
  {
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    category: 'crypto',
    price: 78400.0,
    change24h: -1.45,
    high24h: 79200.0,
    low24h: 77800.0,
    volume24h: '$8.28B',
    precision: 1,
    fundingRate: 0.0102,
  },
  {
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    category: 'crypto',
    price: 2450.20,
    change24h: -0.85,
    high24h: 2510.0,
    low24h: 2410.5,
    volume24h: '$4.15B',
    precision: 2,
    fundingRate: 0.0085,
  },
  {
    symbol: 'SOL/USDT',
    name: 'Solana',
    category: 'crypto',
    price: 145.80,
    change24h: 2.42,
    high24h: 149.3,
    low24h: 141.6,
    volume24h: '$2.12B',
    precision: 2,
    fundingRate: 0.015,
  },
  {
    symbol: 'BNB/USDT',
    name: 'BNB',
    category: 'crypto',
    price: 615.50,
    change24h: 1.15,
    high24h: 622.0,
    low24h: 608.2,
    volume24h: '$1.05B',
    precision: 2,
    fundingRate: 0.005,
  },
  {
    symbol: 'DOGE/USDT',
    name: 'Dogecoin',
    category: 'crypto',
    price: 0.165,
    change24h: 3.85,
    high24h: 0.172,
    low24h: 0.158,
    volume24h: '$950M',
    precision: 4,
    fundingRate: 0.012,
  },
  {
    symbol: 'XRP/USDT',
    name: 'XRP',
    category: 'crypto',
    price: 1.425,
    change24h: 5.20,
    high24h: 1.480,
    low24h: 1.350,
    volume24h: '$1.45B',
    precision: 4,
    fundingRate: 0.008,
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'forex',
    price: 1.0874,
    change24h: -0.18,
    high24h: 1.0910,
    low24h: 1.0855,
    volume24h: '$9.40B',
    precision: 4,
    fundingRate: 0.0005,
  },
];

export const TIMEFRAME_STEP_MS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
};

function generateCandlesForPrice(
  basePrice: number,
  precision: number,
  count: number = 55,
  stepMs: number = 5 * 60 * 1000
): Candle[] {
  const candles: Candle[] = new Array(count);
  const now = Date.now();
  const currentCandleTime = Math.floor(now / stepMs) * stepMs;

  let currentClose = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const time = currentCandleTime - (count - 1 - i) * stepMs;
    const volatility = Math.max(0.01, currentClose * (stepMs <= 60000 ? 0.0015 : 0.0035));
    const change = (Math.random() - 0.49) * volatility;

    const close = Number(currentClose.toFixed(precision));
    const open = Number(Math.max(0.01, currentClose - change).toFixed(precision));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.45).toFixed(precision));
    const low = Number(Math.max(0.01, Math.min(open, close) - Math.random() * volatility * 0.45).toFixed(precision));
    const volume = Math.floor(Math.random() * 80 + 20);

    candles[i] = {
      time,
      open,
      high,
      low,
      close,
      volume,
    };

    currentClose = open;
  }

  return candles;
}

export class MarketEngine {
  private markets: Map<string, MarketTicker> = new Map();
  // symbol -> timeframe -> Candle[]
  private candleHistory: Map<string, Map<string, Candle[]>> = new Map();
  private recentTrades: Map<string, RecentTrade[]> = new Map();
  private liveOrderBooks: Map<string, { bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: number }> = new Map();

  private tickListeners: Array<(markets: MarketTicker[], updatedMarket: MarketTicker) => void> = [];
  private tradeListeners: Array<(symbol: string, trade: RecentTrade) => void> = [];
  private candleListeners: Array<(symbol: string, timeframe: string, candle: Candle, isNew: boolean) => void> = [];
  private feedStatusListeners: Array<(status: FeedStatus) => void> = [];

  private intervalId: NodeJS.Timeout | null = null;
  private symbolIndex: number = 0;
  private feedMode: FeedMode = 'live';

  constructor() {
    INITIAL_MARKETS.forEach((m) => {
      this.markets.set(m.symbol, { ...m });
      const tfMap = new Map<string, Candle[]>();
      Object.entries(TIMEFRAME_STEP_MS).forEach(([tf, stepMs]) => {
        tfMap.set(tf, generateCandlesForPrice(m.price, m.precision, 55, stepMs));
      });
      this.candleHistory.set(m.symbol, tfMap);
      this.recentTrades.set(m.symbol, this.generateInitialTrades(m));
    });

    this.setupDataFeedIntegration();
    this.startSimulation();
  }

  private setupDataFeedIntegration() {
    // 1. Ticker updates from Binance / Yahoo Finance
    dataFeedService.onTicker((symbol, partialData) => {
      if (this.feedMode !== 'live') return;

      const existing = this.markets.get(symbol);
      if (!existing) return;

      const updatedMarket: MarketTicker = {
        ...existing,
        ...partialData,
        price: partialData.price !== undefined ? Number(partialData.price.toFixed(existing.precision)) : existing.price,
      };

      this.markets.set(symbol, updatedMarket);

      // Update active candle close for all timeframes
      const tfMap = this.candleHistory.get(symbol);
      if (tfMap) {
        tfMap.forEach((candles, tf) => {
          if (!candles || candles.length === 0) return;
          const last = candles[candles.length - 1];
          last.close = updatedMarket.price;
          last.high = Math.max(last.high, updatedMarket.price);
          last.low = Math.min(last.low, updatedMarket.price);
          this.candleListeners.forEach((fn) => fn(symbol, tf, last, false));
        });
      }

      // Notify tick listeners
      const allMarkets = this.getMarkets();
      this.tickListeners.forEach((fn) => fn(allMarkets, updatedMarket));
    });

    // 2. Real-time kline updates from Binance WS
    dataFeedService.onCandle((symbol, timeframe, candle, isNew) => {
      if (this.feedMode !== 'live') return;

      const tfMap = this.candleHistory.get(symbol);
      if (tfMap) {
        const list = tfMap.get(timeframe) || [];
        if (isNew) {
          list.push(candle);
          if (list.length > 70) list.shift();
          tfMap.set(timeframe, list);
        } else if (list.length > 0) {
          list[list.length - 1] = candle;
        }
      }

      this.candleListeners.forEach((fn) => fn(symbol, timeframe, candle, isNew));
    });

    // 3. Real-time Depth from Binance WS
    dataFeedService.onDepth((symbol, depth) => {
      if (this.feedMode !== 'live') return;
      this.liveOrderBooks.set(symbol, depth);
    });

    // 4. Real-time Trades from Binance WS
    dataFeedService.onTrade((symbol, trade) => {
      if (this.feedMode !== 'live') return;
      const trades = this.recentTrades.get(symbol) || [];
      this.recentTrades.set(symbol, [trade, ...trades.slice(0, 29)]);
      this.tradeListeners.forEach((fn) => fn(symbol, trade));
    });

    // 5. Feed status updates
    dataFeedService.onStatus((status) => {
      this.feedStatusListeners.forEach((fn) => fn({ ...status, mode: this.feedMode }));
    });

    // Start live feeds
    dataFeedService.start();
  }

  private generateInitialTrades(m: MarketTicker): RecentTrade[] {
    const list: RecentTrade[] = [];
    const p = m.price;
    for (let i = 0; i < 15; i++) {
      const isBuy = Math.random() > 0.48;
      const tradePrice = Number((p + (Math.random() - 0.5) * p * 0.0004).toFixed(m.precision));
      const size = Number((Math.random() * 1.5 + 0.05).toFixed(m.category === 'stock' ? 1 : 3));
      const d = new Date(Date.now() - i * 3000);
      list.push({
        id: Math.random().toString(36).substring(2, 9),
        time: d.toTimeString().split(' ')[0],
        price: tradePrice,
        size,
        side: isBuy ? 'buy' : 'sell',
      });
    }
    return list;
  }

  private startSimulation() {
    // Tick loop runs every 280ms when in 'simulated' mode
    this.intervalId = setInterval(() => {
      // In 'live' mode, live feeds handle ticks.
      if (this.feedMode === 'live') return;

      const symbols = Array.from(this.markets.keys());
      if (!symbols.length) return;

      // Update 2-3 symbols per tick
      const symbolsToUpdate = new Set<string>();
      this.symbolIndex = (this.symbolIndex + 1) % symbols.length;
      symbolsToUpdate.add(symbols[this.symbolIndex]);
      symbolsToUpdate.add(symbols[Math.floor(Math.random() * symbols.length)]);
      symbolsToUpdate.add(symbols[Math.floor(Math.random() * symbols.length)]);

      symbolsToUpdate.forEach((targetSymbol) => {
        const market = this.markets.get(targetSymbol);
        if (!market) return;

        const maxDelta = market.category === 'crypto' ? 0.0028 : market.category === 'stock' ? 0.0022 : 0.0008;
        const deltaPercent = (Math.random() - 0.492) * maxDelta;
        const newPrice = Number(Math.max(0.0001, market.price * (1 + deltaPercent)).toFixed(market.precision));
        const high24h = Math.max(market.high24h, newPrice);
        const low24h = Math.min(market.low24h, newPrice);

        const updatedMarket: MarketTicker = {
          ...market,
          price: newPrice,
          high24h,
          low24h,
        };
        this.markets.set(targetSymbol, updatedMarket);

        // Update candles across timeframes
        const tfMap = this.candleHistory.get(targetSymbol);
        if (tfMap) {
          const now = Date.now();
          tfMap.forEach((candles, tf) => {
            if (!candles || candles.length === 0) return;
            const stepMs = TIMEFRAME_STEP_MS[tf] || 60000;
            const last = candles[candles.length - 1];

            if (now - last.time >= stepMs) {
              const newCandle: Candle = {
                time: Math.floor(now / stepMs) * stepMs,
                open: last.close,
                high: Math.max(last.close, newPrice),
                low: Math.min(last.close, newPrice),
                close: newPrice,
                volume: Math.floor(Math.random() * 15 + 5),
              };
              candles.push(newCandle);
              if (candles.length > 70) {
                candles.shift();
              }
              this.candleListeners.forEach((fn) => fn(targetSymbol, tf, newCandle, true));
            } else {
              last.close = newPrice;
              last.high = Math.max(last.high, newPrice);
              last.low = Math.min(last.low, newPrice);
              last.volume += 1;
              this.candleListeners.forEach((fn) => fn(targetSymbol, tf, last, false));
            }
          });
        }

        // Generate simulated recent trade execution
        const isBuy = Math.random() > 0.48;
        const tradeSize = Number(
          (Math.random() * (market.category === 'stock' ? 12 : 0.8) + (market.category === 'stock' ? 1 : 0.02)).toFixed(
            market.category === 'stock' ? 0 : 3
          )
        );
        const newTrade: RecentTrade = {
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toTimeString().split(' ')[0],
          price: newPrice,
          size: tradeSize,
          side: isBuy ? 'buy' : 'sell',
        };
        const trades = this.recentTrades.get(targetSymbol) || [];
        this.recentTrades.set(targetSymbol, [newTrade, ...trades.slice(0, 29)]);

        // Notify subscribers
        const allMarkets = this.getMarkets();
        this.tickListeners.forEach((fn) => fn(allMarkets, updatedMarket));
        this.tradeListeners.forEach((fn) => fn(targetSymbol, newTrade));
      });
    }, 280);
  }

  // ─── FEED CONTROLS ────────────────────────────────────────────────────────────

  public setFeedMode(mode: FeedMode) {
    if (this.feedMode === mode) return;
    this.feedMode = mode;
    console.log(`[MarketEngine] Feed mode switched to: ${mode.toUpperCase()}`);

    if (mode === 'live') {
      dataFeedService.start();
    } else {
      dataFeedService.stop();
    }

    const status = this.getFeedStatus();
    this.feedStatusListeners.forEach((fn) => fn(status));
  }

  public getFeedMode(): FeedMode {
    return this.feedMode;
  }

  public getFeedStatus(): FeedStatus {
    const s = dataFeedService.getStatus();
    return {
      ...s,
      mode: this.feedMode,
    };
  }

  public setActiveMarket(symbol: string, timeframe: string = '5m') {
    dataFeedService.setActiveMarket(symbol, timeframe);
  }

  // ─── PUBLIC ACCESSORS ─────────────────────────────────────────────────────────

  public getMarkets(): MarketTicker[] {
    return Array.from(this.markets.values());
  }

  public getMarket(symbol: string): MarketTicker | undefined {
    return this.markets.get(symbol);
  }

  public getCandles(symbol: string, timeframe: string = '5m'): Candle[] {
    const tfMap = this.candleHistory.get(symbol);
    if (!tfMap) {
      const m = this.getMarket(symbol) || INITIAL_MARKETS[0];
      return generateCandlesForPrice(m.price, m.precision, 55, TIMEFRAME_STEP_MS[timeframe] || 5 * 60 * 1000);
    }
    const candles = tfMap.get(timeframe);
    if (!candles) {
      const m = this.getMarket(symbol) || INITIAL_MARKETS[0];
      const newCandles = generateCandlesForPrice(m.price, m.precision, 55, TIMEFRAME_STEP_MS[timeframe] || 5 * 60 * 1000);
      tfMap.set(timeframe, newCandles);
      return newCandles;
    }
    return candles;
  }

  public async getCandlesAsync(symbol: string, timeframe: string = '5m'): Promise<Candle[]> {
    this.setActiveMarket(symbol, timeframe);

    if (this.feedMode === 'live') {
      try {
        let liveCandles: Candle[] = [];
        if (CRYPTO_SYMBOL_MAP[symbol]) {
          liveCandles = await dataFeedService.fetchBinanceKlines(symbol, timeframe, 70);
        } else if (STOCK_SYMBOL_MAP[symbol]) {
          liveCandles = await dataFeedService.fetchYahooKlines(symbol, timeframe);
        }

        if (liveCandles && liveCandles.length > 0) {
          let tfMap = this.candleHistory.get(symbol);
          if (!tfMap) {
            tfMap = new Map();
            this.candleHistory.set(symbol, tfMap);
          }
          tfMap.set(timeframe, liveCandles);
          return liveCandles;
        }
      } catch (err: any) {
        console.warn(`[MarketEngine] Live candles fetch failed for ${symbol}: ${err.message}`);
      }
    }

    return this.getCandles(symbol, timeframe);
  }

  public getRecentTrades(symbol: string): RecentTrade[] {
    return this.recentTrades.get(symbol) || [];
  }

  public getOrderBook(symbol: string): { bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: number } {
    // If live depth available from Binance, return it
    if (this.feedMode === 'live' && this.liveOrderBooks.has(symbol)) {
      const book = this.liveOrderBooks.get(symbol)!;
      if (book.bids.length > 0 && book.asks.length > 0) {
        return book;
      }
    }

    // Otherwise generate realistic book
    const market = this.markets.get(symbol) || INITIAL_MARKETS[0];
    const p = market.price;
    const precision = market.precision;
    const asks: OrderBookEntry[] = [];
    const bids: OrderBookEntry[] = [];
    let askTotal = 0;
    let bidTotal = 0;

    const step = p * 0.0003;
    for (let i = 7; i >= 1; i--) {
      const askPrice = Number((p + i * step).toFixed(precision));
      const size = Number((Math.random() * (market.category === 'stock' ? 25 : 1.8) + 0.1).toFixed(market.category === 'stock' ? 1 : 3));
      askTotal += size;
      asks.push({ price: askPrice, size, total: Number(askTotal.toFixed(precision)), depthPercent: 0 });
    }
    asks.forEach((a) => {
      a.depthPercent = Math.min(100, Math.round((a.total / (askTotal || 1)) * 100));
    });

    for (let i = 1; i <= 7; i++) {
      const bidPrice = Number((p - i * step).toFixed(precision));
      const size = Number((Math.random() * (market.category === 'stock' ? 25 : 1.8) + 0.1).toFixed(market.category === 'stock' ? 1 : 3));
      bidTotal += size;
      bids.push({ price: bidPrice, size, total: Number(bidTotal.toFixed(precision)), depthPercent: 0 });
    }
    bids.forEach((b) => {
      b.depthPercent = Math.min(100, Math.round((b.total / (bidTotal || 1)) * 100));
    });

    const spread = asks.length && bids.length ? Number((asks[asks.length - 1].price - bids[0].price).toFixed(precision)) : 0;

    return { asks, bids, spread };
  }

  public getAiSignal(symbol: string): AiSignal {
    const market = this.markets.get(symbol) || INITIAL_MARKETS[0];
    const p = market.price;
    const isBullish = market.change24h >= 0;
    return {
      bias: market.change24h > 3 ? 'STRONG BULLISH' : isBullish ? 'BULLISH' : 'BEARISH',
      score: Math.min(96, Math.max(38, Math.round(50 + market.change24h * 5))),
      volatilityForecast: market.change24h > 4 ? 'EXPANDING' : 'LOW',
      confidence: 91.2,
      supportLevel: Number((p * 0.98).toFixed(market.precision)),
      resistanceLevel: Number((p * 1.025).toFixed(market.precision)),
      rationale: `Real-time volume dynamics analyzed for ${market.name} (${market.symbol}). Order flow and 24h momentum at ${market.change24h > 0 ? '+' : ''}${market.change24h}% indicates ${isBullish ? 'bullish accumulation' : 'bearish distribution'}.`,
    };
  }

  public onTick(listener: (markets: MarketTicker[], updatedMarket: MarketTicker) => void) {
    this.tickListeners.push(listener);
  }

  public onTrade(listener: (symbol: string, trade: RecentTrade) => void) {
    this.tradeListeners.push(listener);
  }

  public onCandle(listener: (symbol: string, timeframe: string, candle: Candle, isNew: boolean) => void) {
    this.candleListeners.push(listener);
  }

  public onFeedStatus(listener: (status: FeedStatus) => void) {
    this.feedStatusListeners.push(listener);
  }

  public applyMarketImpact(symbol: string, side: 'buy' | 'sell', size: number): MarketTicker | undefined {
    const market = this.markets.get(symbol);
    if (!market) return undefined;

    const notional = size * market.price;
    const impactFactor = Math.min(0.012, Math.max(0.0035, (notional / 25000) * 0.005));
    const deltaPercent = side === 'buy' ? impactFactor : -impactFactor;
    const newPrice = Number(Math.max(0.0001, market.price * (1 + deltaPercent)).toFixed(market.precision));
    const high24h = Math.max(market.high24h, newPrice);
    const low24h = Math.min(market.low24h, newPrice);

    const updatedMarket: MarketTicker = {
      ...market,
      price: newPrice,
      high24h,
      low24h,
    };
    this.markets.set(symbol, updatedMarket);

    const tfMap = this.candleHistory.get(symbol);
    if (tfMap) {
      tfMap.forEach((candles, tf) => {
        if (!candles || candles.length === 0) return;
        const last = candles[candles.length - 1];
        last.close = newPrice;
        if (side === 'buy') {
          last.high = Math.max(last.high, newPrice);
        } else {
          last.low = Math.min(last.low, newPrice);
        }
        last.volume += Math.max(1, Math.round(size));
        this.candleListeners.forEach((fn) => fn(symbol, tf, last, false));
      });
    }

    const newTrade: RecentTrade = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toTimeString().split(' ')[0],
      price: newPrice,
      size,
      side: side === 'buy' ? 'buy' : 'sell',
    };
    const trades = this.recentTrades.get(symbol) || [];
    this.recentTrades.set(symbol, [newTrade, ...trades.slice(0, 29)]);

    const allMarkets = this.getMarkets();
    this.tickListeners.forEach((fn) => fn(allMarkets, updatedMarket));
    this.tradeListeners.forEach((fn) => fn(symbol, newTrade));

    return updatedMarket;
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    dataFeedService.stop();
  }
}

export const marketEngine = new MarketEngine();
