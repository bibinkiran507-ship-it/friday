import WebSocket from 'ws';
import { Candle, FeedStatus, MarketTicker, OrderBookEntry, RecentTrade } from './types.js';

export const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT': 'btcusdt',
  'ETH/USDT': 'ethusdt',
  'SOL/USDT': 'solusdt',
  'BNB/USDT': 'bnbusdt',
  'DOGE/USDT': 'dogeusdt',
  'XRP/USDT': 'xrpusdt',
};

export const STOCK_SYMBOL_MAP: Record<string, string> = {
  'NVDA/USD': 'NVDA',
  'AAPL/USD': 'AAPL',
  'TSLA/USD': 'TSLA',
  'MSFT/USD': 'MSFT',
  'AMZN/USD': 'AMZN',
  'SPY/USD': 'SPY',
  'EUR/USD': 'EURUSD=X',
};

// Inverted lookups
const BINANCE_TO_MARKET: Record<string, string> = {};
Object.entries(CRYPTO_SYMBOL_MAP).forEach(([mkt, bin]) => {
  BINANCE_TO_MARKET[bin.toUpperCase()] = mkt;
});

const TIMEFRAME_TO_BINANCE: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
};

function formatVolume(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

export class DataFeedService {
  private binanceWs: WebSocket | null = null;
  private isConnecting: boolean = false;
  private shouldRun: boolean = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private stockPollInterval: NodeJS.Timeout | null = null;

  private activeSymbol: string = 'BTC/USDT';
  private activeTimeframe: string = '5m';

  // Status tracking
  private binanceConnected: boolean = false;
  private lastBinanceTick: number | null = null;
  private lastStockUpdate: number | null = null;

  // Listeners
  private tickerListeners: Array<(symbol: string, data: Partial<MarketTicker>) => void> = [];
  private candleListeners: Array<(symbol: string, timeframe: string, candle: Candle, isNew: boolean) => void> = [];
  private depthListeners: Array<(symbol: string, depth: { bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: number }) => void> = [];
  private tradeListeners: Array<(symbol: string, trade: RecentTrade) => void> = [];
  private statusListeners: Array<(status: FeedStatus) => void> = [];

  constructor() {}

  public start() {
    this.shouldRun = true;
    this.connectBinanceWs();
    this.startStockPolling();
  }

  public stop() {
    this.shouldRun = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.stockPollInterval) {
      clearInterval(this.stockPollInterval);
      this.stockPollInterval = null;
    }
    if (this.binanceWs) {
      this.binanceWs.removeAllListeners();
      this.binanceWs.close();
      this.binanceWs = null;
    }
    this.binanceConnected = false;
    this.notifyStatus();
  }

  public setActiveMarket(symbol: string, timeframe: string = '5m') {
    const symbolChanged = this.activeSymbol !== symbol;
    const tfChanged = this.activeTimeframe !== timeframe;
    this.activeSymbol = symbol;
    this.activeTimeframe = timeframe;

    if (this.binanceConnected && (symbolChanged || tfChanged)) {
      // Re-establish streams for new active market
      this.reconnectBinanceWs();
    }
  }

  public getStatus(): FeedStatus {
    return {
      mode: 'live',
      binanceConnected: this.binanceConnected,
      lastBinanceTick: this.lastBinanceTick,
      lastStockUpdate: this.lastStockUpdate,
      activeCryptoCount: Object.keys(CRYPTO_SYMBOL_MAP).length,
      activeStockCount: Object.keys(STOCK_SYMBOL_MAP).length,
    };
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => fn(status));
  }

  // ─── BINANCE WEBSOCKET ────────────────────────────────────────────────────────

  private getStreamNames(): string[] {
    const streams: string[] = [];

    // All crypto 24hr tickers
    Object.values(CRYPTO_SYMBOL_MAP).forEach((binSym) => {
      streams.push(`${binSym}@ticker`);
    });

    // Active crypto symbol Kline, Depth, and AggTrade
    const activeBinSym = CRYPTO_SYMBOL_MAP[this.activeSymbol];
    if (activeBinSym) {
      const interval = TIMEFRAME_TO_BINANCE[this.activeTimeframe] || '5m';
      streams.push(`${activeBinSym}@kline_${interval}`);
      streams.push(`${activeBinSym}@depth20@100ms`);
      streams.push(`${activeBinSym}@aggTrade`);
    }

    return streams;
  }

  private connectBinanceWs() {
    if (this.isConnecting || !this.shouldRun) return;
    this.isConnecting = true;

    try {
      const streams = this.getStreamNames().join('/');
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
      const ws = new WebSocket(wsUrl);
      this.binanceWs = ws;

      ws.on('open', () => {
        this.isConnecting = false;
        this.binanceConnected = true;
        this.notifyStatus();
        console.log(`[DataFeed] Binance WebSocket connected. Streaming ${this.getStreamNames().length} channels.`);
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (!msg || !msg.data) return;
          this.handleBinanceMessage(msg.stream, msg.data);
        } catch {
          // ignore malformed payloads
        }
      });

      ws.on('close', () => {
        this.isConnecting = false;
        this.binanceConnected = false;
        this.binanceWs = null;
        this.notifyStatus();
        if (this.shouldRun) {
          this.scheduleReconnect();
        }
      });

      ws.on('error', (err) => {
        console.warn(`[DataFeed] Binance WS notice: ${err.message}`);
        ws.close();
      });
    } catch (err: any) {
      this.isConnecting = false;
      this.binanceConnected = false;
      console.warn(`[DataFeed] Binance connection attempt failed: ${err.message}`);
      if (this.shouldRun) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.shouldRun) {
        this.connectBinanceWs();
      }
    }, 3000);
  }

  private reconnectBinanceWs() {
    if (this.binanceWs) {
      this.binanceWs.close();
    } else {
      this.connectBinanceWs();
    }
  }

  private handleBinanceMessage(stream: string, data: any) {
    this.lastBinanceTick = Date.now();

    // 1. Ticker Stream (e.g. btcusdt@ticker)
    if (stream.endsWith('@ticker')) {
      const binSymbol = (data.s || '').toUpperCase();
      const symbol = BINANCE_TO_MARKET[binSymbol];
      if (!symbol) return;

      const price = parseFloat(data.c);
      const change24h = parseFloat(data.P);
      const high24h = parseFloat(data.h);
      const low24h = parseFloat(data.l);
      const quoteVol = parseFloat(data.q);

      if (!isNaN(price)) {
        this.tickerListeners.forEach((fn) =>
          fn(symbol, {
            price,
            change24h,
            high24h,
            low24h,
            volume24h: formatVolume(quoteVol),
          })
        );
      }
      return;
    }

    // 2. Kline Stream (e.g. btcusdt@kline_5m)
    if (stream.includes('@kline_')) {
      const k = data.k;
      if (!k) return;
      const binSymbol = (data.s || '').toUpperCase();
      const symbol = BINANCE_TO_MARKET[binSymbol];
      if (!symbol) return;

      const candle: Candle = {
        time: Math.floor(k.t),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };

      const isNew = k.x === true;
      this.candleListeners.forEach((fn) => fn(symbol, this.activeTimeframe, candle, isNew));
      return;
    }

    // 3. Depth Stream (e.g. btcusdt@depth20@100ms)
    if (stream.includes('@depth20')) {
      const binSymbol = stream.split('@')[0].toUpperCase();
      const symbol = BINANCE_TO_MARKET[binSymbol];
      if (!symbol) return;

      const rawBids: [string, string][] = data.bids || [];
      const rawAsks: [string, string][] = data.asks || [];

      let bidTotal = 0;
      const bids: OrderBookEntry[] = rawBids.slice(0, 10).map(([p, s]) => {
        const price = parseFloat(p);
        const size = parseFloat(s);
        bidTotal += size;
        return { price, size, total: Number(bidTotal.toFixed(4)), depthPercent: 0 };
      });
      bids.forEach((b) => {
        b.depthPercent = Math.min(100, Math.round((b.total / (bidTotal || 1)) * 100));
      });

      let askTotal = 0;
      const asks: OrderBookEntry[] = rawAsks.slice(0, 10).map(([p, s]) => {
        const price = parseFloat(p);
        const size = parseFloat(s);
        askTotal += size;
        return { price, size, total: Number(askTotal.toFixed(4)), depthPercent: 0 };
      });
      asks.forEach((a) => {
        a.depthPercent = Math.min(100, Math.round((a.total / (askTotal || 1)) * 100));
      });

      const spread = asks.length && bids.length ? Number((asks[0].price - bids[0].price).toFixed(2)) : 0;
      this.depthListeners.forEach((fn) => fn(symbol, { bids, asks, spread }));
      return;
    }

    // 4. Trade Stream (e.g. btcusdt@aggTrade)
    if (stream.includes('@aggTrade')) {
      const binSymbol = (data.s || '').toUpperCase();
      const symbol = BINANCE_TO_MARKET[binSymbol];
      if (!symbol) return;

      const price = parseFloat(data.p);
      const size = parseFloat(data.q);
      const isBuyerMaker = data.m; // If true, maker is buyer -> trade was a market sell
      const d = new Date(data.T);

      const trade: RecentTrade = {
        id: String(data.a || Math.random().toString(36).substring(2, 9)),
        time: d.toTimeString().split(' ')[0],
        price,
        size,
        side: isBuyerMaker ? 'sell' : 'buy',
      };

      this.tradeListeners.forEach((fn) => fn(symbol, trade));
      return;
    }
  }

  // ─── BINANCE HISTORICAL KLINES (REST) ─────────────────────────────────────────

  public async fetchBinanceKlines(symbol: string, timeframe: string, limit: number = 70): Promise<Candle[]> {
    const binSymbol = CRYPTO_SYMBOL_MAP[symbol]?.toUpperCase();
    if (!binSymbol) return [];

    const interval = TIMEFRAME_TO_BINANCE[timeframe] || '5m';
    const url = `https://api.binance.com/api/v3/klines?symbol=${binSymbol}&interval=${interval}&limit=${limit}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: any[] = await res.json();
      return raw.map((k) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (err: any) {
      console.warn(`[DataFeed] Failed to fetch Binance klines for ${symbol}: ${err.message}`);
      return [];
    }
  }

  // ─── YAHOO FINANCE STOCK DATA (REST) ─────────────────────────────────────────

  private startStockPolling() {
    // Initial fetch immediately
    this.pollAllStocks();

    // Poll every 8 seconds
    this.stockPollInterval = setInterval(() => {
      if (this.shouldRun) {
        this.pollAllStocks();
      }
    }, 8000);
  }

  private async pollAllStocks() {
    const symbols = Object.keys(STOCK_SYMBOL_MAP);
    for (const sym of symbols) {
      try {
        await this.pollSingleStock(sym);
      } catch {
        // Individual stock failure shouldn't halt polling
      }
    }
    this.lastStockUpdate = Date.now();
    this.notifyStatus();
  }

  private async pollSingleStock(symbol: string) {
    const ticker = STOCK_SYMBOL_MAP[symbol];
    if (!ticker) return;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=5m&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return;

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    if (!price || isNaN(price)) return;

    const change24h = prevClose ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
    const high24h = meta.regularMarketDayHigh || price;
    const low24h = meta.regularMarketDayLow || price;
    const volume = meta.regularMarketVolume || 0;

    this.tickerListeners.forEach((fn) =>
      fn(symbol, {
        price,
        change24h,
        high24h,
        low24h,
        volume24h: formatVolume(volume * price),
      })
    );
  }

  public async fetchYahooKlines(symbol: string, timeframe: string): Promise<Candle[]> {
    const ticker = STOCK_SYMBOL_MAP[symbol];
    if (!ticker) return [];

    let interval = '5m';
    let range = '1d';

    switch (timeframe) {
      case '1m':
        interval = '1m';
        range = '1d';
        break;
      case '5m':
        interval = '5m';
        range = '1d';
        break;
      case '15m':
        interval = '15m';
        range = '5d';
        break;
      case '1h':
        interval = '60m';
        range = '1mo';
        break;
      case '4h':
        interval = '60m';
        range = '1mo';
        break;
      case '1D':
        interval = '1d';
        range = '3mo';
        break;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]) return [];

      const timestamps: number[] = result.timestamp;
      const quote = result.indicators.quote[0];
      const candles: Candle[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open[i];
        const h = quote.high[i];
        const l = quote.low[i];
        const c = quote.close[i];
        const v = quote.volume[i] || 0;

        // Skip missing ticks
        if (o === null || h === null || l === null || c === null || isNaN(c)) continue;

        candles.push({
          time: timestamps[i] * 1000,
          open: Number(o.toFixed(2)),
          high: Number(h.toFixed(2)),
          low: Number(l.toFixed(2)),
          close: Number(c.toFixed(2)),
          volume: Math.round(v),
        });
      }

      // Return recent 70 candles
      return candles.slice(-70);
    } catch (err: any) {
      console.warn(`[DataFeed] Failed to fetch Yahoo candles for ${symbol}: ${err.message}`);
      return [];
    }
  }

  // ─── SUBSCRIPTION LISTENERS ──────────────────────────────────────────────────

  public onTicker(fn: (symbol: string, data: Partial<MarketTicker>) => void) {
    this.tickerListeners.push(fn);
  }

  public onCandle(fn: (symbol: string, timeframe: string, candle: Candle, isNew: boolean) => void) {
    this.candleListeners.push(fn);
  }

  public onDepth(fn: (symbol: string, depth: { bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: number }) => void) {
    this.depthListeners.push(fn);
  }

  public onTrade(fn: (symbol: string, trade: RecentTrade) => void) {
    this.tradeListeners.push(fn);
  }

  public onStatus(fn: (status: FeedStatus) => void) {
    this.statusListeners.push(fn);
  }
}

export const dataFeedService = new DataFeedService();
