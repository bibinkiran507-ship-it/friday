import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MarketTicker,
  Candle,
  OrderBookEntry,
  RecentTrade,
  Position,
  Order,
  ClosedTrade,
  AiSignal,
  StockHolding,
  FeedMode,
  FeedStatus,
} from '@/types/trading';

// ─── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Order Prefill Shape (OrderBook -> OrderForm) ──────────────────────────────

export interface OrderPrefill {
  symbol?: string;
  price?: number;
  size?: number;
  side?: 'buy' | 'sell';
  type?: 'market' | 'limit' | 'stop';
  timestamp: number;
}

// ─── Context Shape ─────────────────────────────────────────────────────────────

interface TradingContextType {
  viewMode: 'landing' | 'terminal' | 'quant-lab' | 'architecture' | 'split-screen';
  setViewMode: (mode: 'landing' | 'terminal' | 'quant-lab' | 'architecture' | 'split-screen') => void;
  activeArchitectureTab: string;
  setActiveArchitectureTab: (tab: string) => void;
  navigateToArchitecture: (pillarId?: string) => void;
  markets: MarketTicker[];
  activeSymbol: string;
  setActiveSymbol: (sym: string) => void;
  activeMarket: MarketTicker;
  candles: Candle[];
  activeTimeframe: string;
  setActiveTimeframe: (tf: string) => void;
  orderBook: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    spread: number;
  };
  recentTrades: RecentTrade[];
  balance: number;
  equity: number;
  marginUsed: number;
  availableMargin: number;
  marginRatioPercent: number;
  isMarginCall: boolean;
  isDepositOpen: boolean;
  setIsDepositOpen: (open: boolean) => void;
  isFridayDrawerOpen: boolean;
  setIsFridayDrawerOpen: (open: boolean) => void;
  holdings: Record<string, StockHolding>;
  holdingsList: StockHolding[];
  stockAssetValue: number;
  totalPortfolioValue: number;
  positions: Position[];
  openOrders: Order[];
  tradeHistory: ClosedTrade[];
  aiSignal: AiSignal;
  toast: string | null;
  setToast: (msg: string | null) => void;
  feedStatus: FeedStatus;
  toggleFeedMode: (mode: FeedMode) => Promise<void>;
  placeOrder: (params: {
    symbol?: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    tradeMode?: 'spot' | 'margin';
    price?: number;
    size: number;
    leverage: number;
    takeProfit?: number;
    stopLoss?: number;
  }) => Promise<boolean>;
  orderPrefill: OrderPrefill | null;
  setOrderPrefill: (prefill: OrderPrefill | null) => void;
  prefillOrderFromBook: (params: { price: number; size?: number; side?: 'buy' | 'sell' }) => void;
  closePosition: (id: string, fraction?: number) => Promise<void>;
  closeAllPositions: () => Promise<void>;
  exportTradeHistoryCsv: () => void;
  updatePositionBracket: (id: string, takeProfit?: number | null, stopLoss?: number | null) => Promise<boolean>;
  cancelOrder: (id: string) => Promise<void>;
  resetAccount: () => Promise<void>;
  depositFunds: (amount: number, method?: string) => Promise<boolean>;
  withdrawFunds: (amount: number, method?: string) => Promise<boolean>;
  isConnected: boolean;
}

// ─── Fallback defaults ─────────────────────────────────────────────────────────

const FALLBACK_MARKETS: MarketTicker[] = [
  { symbol: 'NVDA/USD', name: 'NVIDIA Corp', category: 'stock', price: 230.36, change24h: 0.84, high24h: 232.5, low24h: 227.8, volume24h: '$4.45B', precision: 2, fundingRate: 0.0025 },
  { symbol: 'AAPL/USD', name: 'Apple Inc', category: 'stock', price: 319.97, change24h: -2.51, high24h: 324.8, low24h: 316.3, volume24h: '$3.80B', precision: 2, fundingRate: 0.0018 },
  { symbol: 'TSLA/USD', name: 'Tesla Inc', category: 'stock', price: 354.08, change24h: -5.92, high24h: 365.5, low24h: 348.4, volume24h: '$5.12B', precision: 2, fundingRate: 0.0035 },
  { symbol: 'MSFT/USD', name: 'Microsoft Corp', category: 'stock', price: 499.70, change24h: -2.04, high24h: 504.0, low24h: 494.2, volume24h: '$2.95B', precision: 2, fundingRate: 0.0015 },
  { symbol: 'AMZN/USD', name: 'Amazon.com Inc', category: 'stock', price: 258.51, change24h: -0.15, high24h: 262.8, low24h: 255.5, volume24h: '$3.25B', precision: 2, fundingRate: 0.002 },
  { symbol: 'SPY/USD', name: 'S&P 500 Index ETF', category: 'stock', price: 770.19, change24h: -0.39, high24h: 774.8, low24h: 766.4, volume24h: '$7.85B', precision: 2, fundingRate: 0.001 },
  { symbol: 'BTC/USDT', name: 'Bitcoin', category: 'crypto', price: 78439.0, change24h: -1.54, high24h: 79250.0, low24h: 77800.0, volume24h: '$8.28B', precision: 1, fundingRate: 0.0102 },
  { symbol: 'ETH/USDT', name: 'Ethereum', category: 'crypto', price: 2474.40, change24h: -1.04, high24h: 2520.0, low24h: 2420.5, volume24h: '$4.15B', precision: 2, fundingRate: 0.0085 },
  { symbol: 'SOL/USDT', name: 'Solana', category: 'crypto', price: 102.81, change24h: -2.44, high24h: 108.3, low24h: 100.6, volume24h: '$2.12B', precision: 2, fundingRate: 0.015 },
  { symbol: 'BNB/USDT', name: 'BNB', category: 'crypto', price: 749.98, change24h: 0.67, high24h: 758.0, low24h: 740.2, volume24h: '$1.05B', precision: 2, fundingRate: 0.005 },
  { symbol: 'DOGE/USDT', name: 'Dogecoin', category: 'crypto', price: 0.0894, change24h: -0.62, high24h: 0.092, low24h: 0.086, volume24h: '$950M', precision: 4, fundingRate: 0.012 },
  { symbol: 'XRP/USDT', name: 'XRP', category: 'crypto', price: 1.3862, change24h: -1.78, high24h: 1.420, low24h: 1.350, volume24h: '$1.45B', precision: 4, fundingRate: 0.008 },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex', price: 1.1623, change24h: -0.02, high24h: 1.1680, low24h: 1.1590, volume24h: '$9.40B', precision: 4, fundingRate: 0.0005 },
];

function generateFallbackCandles(basePrice: number, precision: number = 2, count: number = 55): Candle[] {
  const candles: Candle[] = new Array(count);
  const now = Date.now();
  const step = 60 * 1000 * 5;
  const currentCandleTime = Math.floor(now / step) * step;
  let currentClose = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const time = currentCandleTime - (count - 1 - i) * step;
    const volatility = Math.max(0.01, currentClose * 0.0028);
    const change = (Math.random() - 0.49) * volatility;
    const close = Number(currentClose.toFixed(precision));
    const open = Number(Math.max(0.01, currentClose - change).toFixed(precision));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.45).toFixed(precision));
    const low = Number(Math.max(0.01, Math.min(open, close) - Math.random() * volatility * 0.45).toFixed(precision));
    const volume = Math.floor(Math.random() * 80 + 20);

    candles[i] = { time, open, high, low, close, volume };
    currentClose = open;
  }
  return candles;
}

function buildFallbackSignal(market: MarketTicker): AiSignal {
  const p = market.price;
  const isBullish = market.change24h >= 0;
  return {
    bias: market.change24h > 3 ? 'STRONG BULLISH' : isBullish ? 'BULLISH' : 'BEARISH',
    score: Math.min(96, Math.max(38, Math.round(50 + market.change24h * 5))),
    volatilityForecast: market.change24h > 4 ? 'EXPANDING' : 'LOW',
    confidence: 91.2,
    supportLevel: Number((p * 0.98).toFixed(market.precision)),
    resistanceLevel: Number((p * 1.025).toFixed(market.precision)),
    rationale: `Model detected institutional order flow on ${market.name} (${market.symbol}). Orderbook buy-side depth is absorbing sell volume.`,
  };
}

// ─── Context ───────────────────────────────────────────────────────────────────

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<'landing' | 'terminal' | 'quant-lab' | 'architecture' | 'split-screen'>('landing');
  const [activeArchitectureTab, setActiveArchitectureTab] = useState<string>('overview');

  const navigateToArchitecture = useCallback((pillarId?: string) => {
    if (pillarId) {
      setActiveArchitectureTab(pillarId);
    }
    setViewMode('architecture');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // fallback
    }
  }, []);

  const [markets, setMarkets] = useState<MarketTicker[]>(FALLBACK_MARKETS);
  const [activeSymbol, setActiveSymbol] = useState<string>('BTC/USDT');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: number }>({
    bids: [],
    asks: [],
    spread: 0,
  });
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [aiSignal, setAiSignal] = useState<AiSignal>(buildFallbackSignal(FALLBACK_MARKETS[6]));
  const [balance, setBalance] = useState<number>(100000);
  const [equity, setEquity] = useState<number>(100000);
  const [marginUsed, setMarginUsed] = useState<number>(0);
  const [availableMargin, setAvailableMargin] = useState<number>(100000);
  const [marginRatioPercent, setMarginRatioPercent] = useState<number>(0);
  const [isMarginCall, setIsMarginCall] = useState<boolean>(false);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [isFridayDrawerOpen, setIsFridayDrawerOpen] = useState<boolean>(false);
  const [holdings, setHoldings] = useState<Record<string, StockHolding>>({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<ClosedTrade[]>([]);
  const [orderPrefill, setOrderPrefill] = useState<OrderPrefill | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({
    mode: 'live',
    binanceConnected: false,
    lastBinanceTick: null,
    lastStockUpdate: null,
    activeCryptoCount: 6,
    activeStockCount: 7,
  });

  const toggleFeedMode = useCallback(async (mode: FeedMode) => {
    try {
      const res = await apiFetch<{ success: boolean; status: FeedStatus }>('/api/feed-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.status) {
        setFeedStatus(res.status);
      }
      setToast(`Market feed switched to ${mode.toUpperCase()} mode.`);
    } catch (err: any) {
      setToast(err.message || 'Failed to toggle feed mode.');
    }
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSymbolRef = useRef<string>(activeSymbol);
  const activeTimeframeRef = useRef<string>(activeTimeframe);

  useEffect(() => {
    activeSymbolRef.current = activeSymbol;
  }, [activeSymbol]);

  useEffect(() => {
    activeTimeframeRef.current = activeTimeframe;
  }, [activeTimeframe]);

  // Global shortcut (Ctrl+J or Cmd+J) to toggle F.R.I.D.A.Y. Copilot drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setIsFridayDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeMarket = useMemo(
    () => markets.find((m) => m.symbol === activeSymbol) || markets[0],
    [markets, activeSymbol]
  );

  const handleSetActiveSymbol = useCallback(
    (newSym: string) => {
      if (newSym === activeSymbolRef.current) return;
      activeSymbolRef.current = newSym;
      setActiveSymbol(newSym);

      // Immediately prime clean fallback candles for the target asset so that
      // candles from the previous asset are NEVER retained, mutated, or scaled against
      const targetMkt = markets.find((m) => m.symbol === newSym);
      if (targetMkt) {
        setCandles(generateFallbackCandles(targetMkt.price, targetMkt.precision, 55));
      } else {
        setCandles([]);
      }
    },
    [markets]
  );

  // Compute live holdings list with updated real-time prices & unrealized PnL
  const holdingsList = useMemo(() => {
    return Object.values(holdings).map((h) => {
      const mkt = markets.find((m) => m.symbol === h.symbol);
      const currentPrice = mkt ? mkt.price : h.avgCost;
      const marketValue = Number((h.shares * currentPrice).toFixed(2));
      const cost = h.shares * h.avgCost;
      const unrealizedPnl = Number((marketValue - cost).toFixed(2));
      const unrealizedPnlPercent = cost > 0 ? Number(((unrealizedPnl / cost) * 100).toFixed(2)) : 0;
      return {
        ...h,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    });
  }, [holdings, markets]);

  const stockAssetValue = useMemo(() => {
    return Number(holdingsList.reduce((acc, h) => acc + (h.marketValue || 0), 0).toFixed(2));
  }, [holdingsList]);

  const totalPortfolioValue = useMemo(() => {
    return Number((balance + stockAssetValue).toFixed(2));
  }, [balance, stockAssetValue]);

  // ─── Apply account snapshot ───────────────────────────────────────────────────

  const applyAccountSnapshot = useCallback((data: any) => {
    if (!data) return;
    if (typeof data.balance === 'number') setBalance(data.balance);
    if (typeof data.equity === 'number') setEquity(data.equity);
    if (typeof data.marginUsed === 'number') setMarginUsed(data.marginUsed);
    if (typeof data.availableMargin === 'number') setAvailableMargin(data.availableMargin);
    if (typeof data.marginRatioPercent === 'number') {
      setMarginRatioPercent(data.marginRatioPercent);
    } else if (typeof data.marginUsed === 'number' && typeof data.balance === 'number') {
      const ratio = data.balance > 0 ? Number(((data.marginUsed / data.balance) * 100).toFixed(1)) : (data.marginUsed > 0 ? 100 : 0);
      setMarginRatioPercent(ratio);
    }
    if (typeof data.isMarginCall === 'boolean') {
      setIsMarginCall(data.isMarginCall);
    } else if (typeof data.marginRatioPercent === 'number') {
      setIsMarginCall(data.marginRatioPercent >= 80);
    }
    if (data.holdings && typeof data.holdings === 'object') setHoldings(data.holdings);
    if (Array.isArray(data.positions)) setPositions(data.positions);
    if (Array.isArray(data.openOrders)) setOpenOrders(data.openOrders);
    if (Array.isArray(data.tradeHistory)) setTradeHistory(data.tradeHistory);
  }, []);

  // ─── WebSocket connection ─────────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'INIT':
            if (Array.isArray(msg.data.markets)) setMarkets(msg.data.markets);
            applyAccountSnapshot(msg.data.account);
            if (msg.data.feedStatus) setFeedStatus(msg.data.feedStatus);
            break;
          case 'FEED_STATUS':
            if (msg.data) setFeedStatus(msg.data);
            break;
          case 'TICK':
            if (Array.isArray(msg.data.markets)) {
              setMarkets(msg.data.markets);
            }
            break;
          case 'CANDLE_UPDATE': {
            const { symbol, timeframe, candle, isNew } = msg.data;
            // Always compare against latest activeSymbolRef and activeTimeframeRef (no stale closure)
            if (symbol === activeSymbolRef.current && timeframe === activeTimeframeRef.current) {
              setCandles((prev) => {
                if (!prev.length) return [candle];
                const lastCandle = prev[prev.length - 1];
                const ratio = candle.close / (lastCandle.close || candle.close);
                // If candle price doesn't match current array scale, reset to avoid Y-axis distortion
                if (ratio > 2.5 || ratio < 0.4) {
                  return [candle];
                }
                if (isNew) {
                  return [...prev.slice(-69), candle];
                }
                const updated = [...prev];
                updated[updated.length - 1] = candle;
                return updated;
              });
            }
            break;
          }
          case 'TRADE': {
            const { symbol, trade } = msg.data;
            if (symbol === activeSymbolRef.current) {
              setRecentTrades((prev) => [trade, ...prev.slice(0, 29)]);
            }
            break;
          }
          case 'ACCOUNT':
            applyAccountSnapshot(msg.data);
            break;
          case 'ORDER_FILLED':
            setToast(`Order filled: ${msg.data.order?.symbol}`);
            apiFetch<any>('/api/account').then(applyAccountSnapshot).catch(() => {});
            break;
          case 'POSITION_CLOSED':
            apiFetch<any>('/api/account').then(applyAccountSnapshot).catch(() => {});
            break;
        }
      } catch {
        // ignore malformed WS messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimerRef.current = setTimeout(() => connectWS(), 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [applyAccountSnapshot]);

  // ─── Initial load & WS bootstrap ─────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      apiFetch<MarketTicker[]>('/api/markets'),
      apiFetch<any>('/api/account'),
    ])
      .then(([mkts, account]) => {
        setMarkets(mkts);
        applyAccountSnapshot(account);
      })
      .catch(() => {
        // Fallback in case backend is initialising
      });

    connectWS();

    return () => {
      wsRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // ─── Load candles when symbol or timeframe changes ───────────────────────────

  useEffect(() => {
    const sym = activeSymbol;
    const tf = activeTimeframe;
    let cancelled = false;

    // Notify backend to prime Binance active stream for this symbol/timeframe
    apiFetch('/api/active-market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym, timeframe: tf }),
    }).catch(() => {});

    apiFetch<Candle[]>(`/api/candles?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}`)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          const ratio = activeMarket.price / (latest?.close || activeMarket.price);
          if (ratio >= 0.35 && ratio <= 2.8) {
            setCandles(data);
          } else {
            setCandles(generateFallbackCandles(activeMarket.price, activeMarket.precision, 55));
          }
        } else {
          setCandles(generateFallbackCandles(activeMarket.price, activeMarket.precision, 55));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCandles(generateFallbackCandles(activeMarket.price, activeMarket.precision, 55));
      });

    return () => {
      cancelled = true;
    };
  }, [activeSymbol, activeTimeframe, activeMarket.price, activeMarket.precision]);

  // ─── Load orderbook, recent trades, ai signals periodically ──────────────────

  useEffect(() => {
    const loadMarketData = () => {
      const sym = encodeURIComponent(activeSymbol);
      apiFetch<{ bids: OrderBookEntry[]; asks: OrderBookEntry[]; spread: number }>(`/api/orderbook?symbol=${sym}`)
        .then(setOrderBook)
        .catch(() => {});
      apiFetch<RecentTrade[]>(`/api/trades/recent?symbol=${sym}`)
        .then(setRecentTrades)
        .catch(() => {});
      apiFetch<AiSignal>(`/api/ai-signals?symbol=${sym}`)
        .then(setAiSignal)
        .catch(() => setAiSignal(buildFallbackSignal(activeMarket)));
    };

    loadMarketData();
    const interval = setInterval(loadMarketData, 2000);
    return () => clearInterval(interval);
  }, [activeSymbol, activeMarket]);

  // ─── Update candle close in real time on active market price ticks ────────────

  useEffect(() => {
    setCandles((prev) => {
      if (!prev.length) return prev;
      const last = { ...prev[prev.length - 1] };
      const currentPrice = activeMarket.price;
      // Sanity check: only mutate if currentPrice belongs to the same asset price scale
      const ratio = currentPrice / (last.close || currentPrice);
      if (ratio > 2.5 || ratio < 0.4) {
        return prev;
      }
      last.close = currentPrice;
      last.high = Math.max(last.high, currentPrice);
      last.low = Math.min(last.low, currentPrice);
      last.volume += 1;
      return [...prev.slice(0, -1), last];
    });
  }, [activeMarket.price]);

  // ─── Toast auto-clear ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const placeOrder = useCallback(
    async (params: {
      symbol?: string;
      side: 'buy' | 'sell';
      type: 'market' | 'limit' | 'stop';
      tradeMode?: 'spot' | 'margin';
      price?: number;
      size: number;
      leverage: number;
      takeProfit?: number;
      stopLoss?: number;
    }): Promise<boolean> => {
      try {
        const orderSymbol = params.symbol || activeSymbol;
        const result = await apiFetch<{ success: boolean; message: string }>('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: orderSymbol,
            ...params,
          }),
        });
        setToast(result.message);
        // Refresh full account state
        const account = await apiFetch<any>('/api/account');
        applyAccountSnapshot(account);
        return result.success;
      } catch (err: any) {
        setToast(err.message || 'Order failed.');
        return false;
      }
    },
    [activeSymbol, applyAccountSnapshot]
  );

  const prefillOrderFromBook = useCallback(
    (params: { price: number; size?: number; side?: 'buy' | 'sell' }) => {
      setOrderPrefill({
        ...params,
        symbol: activeSymbol,
        type: 'limit',
        timestamp: Date.now(),
      });
      const sideText = params.side ? params.side.toUpperCase() : 'LIMIT';
      setToast(`Copied ${sideText} @ $${params.price.toFixed(activeMarket.precision)} into Order Form`);
    },
    [activeSymbol, activeMarket.precision]
  );

  const closePosition = useCallback(
    async (id: string, fraction: number = 1.0) => {
      const clampedFraction = Math.max(0.01, Math.min(1.0, fraction));
      try {
        const result = await apiFetch<{ success: boolean; message: string }>(`/api/positions/${id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fraction: clampedFraction }),
        });
        setToast(result.message);
        const account = await apiFetch<any>('/api/account');
        applyAccountSnapshot(account);
      } catch (err: any) {
        // Direct local fallback so it works seamlessly offline / standalone dev
        setPositions((prev) => {
          const target = prev.find((p) => p.id === id);
          if (!target) return prev;
          const isPartial = clampedFraction < 0.999;
          const closingSize = Number((target.size * clampedFraction).toFixed(4));
          const closingMargin = Number((target.margin * clampedFraction).toFixed(2));
          const diff = target.side === 'long' ? (target.markPrice - target.entryPrice) : (target.entryPrice - target.markPrice);
          const rawPnl = Number(((diff / target.entryPrice) * (closingSize * target.entryPrice)).toFixed(2));
          const fee = Number((closingSize * target.markPrice * 0.0004).toFixed(2));
          const netPnl = Number((rawPnl - fee).toFixed(2));

          setBalance((b) => Number((b + netPnl).toFixed(2)));

          const closedTrade: ClosedTrade = {
            id: Math.random().toString(36).substring(2, 9),
            symbol: target.symbol,
            side: target.side,
            tradeMode: 'margin',
            entryPrice: target.entryPrice,
            closePrice: target.markPrice,
            size: closingSize,
            leverage: target.leverage,
            pnl: netPnl,
            pnlPercent: closingMargin > 0 ? Number(((netPnl / closingMargin) * 100).toFixed(2)) : 0,
            fee,
            exitReason: 'market',
            closedAt: Date.now(),
          };
          setTradeHistory((hist) => [closedTrade, ...hist]);

          const pctLabel = isPartial ? ` (${Math.round(clampedFraction * 100)}% partial)` : '';
          setToast(`Closed ${target.side.toUpperCase()} ${target.symbol}${pctLabel}. Realized PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl}`);

          if (isPartial) {
            return prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    size: Number((p.size - closingSize).toFixed(4)),
                    margin: Number((p.margin - closingMargin).toFixed(2)),
                  }
                : p
            );
          } else {
            return prev.filter((p) => p.id !== id);
          }
        });
      }
    },
    [applyAccountSnapshot]
  );

  const closeAllPositions = useCallback(async () => {
    try {
      const result = await apiFetch<{ success: boolean; message: string; count: number; totalPnl: number }>(
        '/api/positions/close-all',
        { method: 'POST' }
      );
      setToast(result.message);
      const account = await apiFetch<any>('/api/account');
      applyAccountSnapshot(account);
    } catch (err: any) {
      if (positions.length === 0) {
        setToast('No open positions to close.');
        return;
      }
      let totalPnl = 0;
      const closedTrades: ClosedTrade[] = [];
      positions.forEach((target) => {
        const diff = target.side === 'long' ? (target.markPrice - target.entryPrice) : (target.entryPrice - target.markPrice);
        const rawPnl = Number(((diff / target.entryPrice) * (target.size * target.entryPrice)).toFixed(2));
        const fee = Number((target.size * target.markPrice * 0.0004).toFixed(2));
        const netPnl = Number((rawPnl - fee).toFixed(2));
        totalPnl += netPnl;
        closedTrades.push({
          id: Math.random().toString(36).substring(2, 9),
          symbol: target.symbol,
          side: target.side,
          tradeMode: 'margin',
          entryPrice: target.entryPrice,
          closePrice: target.markPrice,
          size: target.size,
          leverage: target.leverage,
          pnl: netPnl,
          pnlPercent: target.margin > 0 ? Number(((netPnl / target.margin) * 100).toFixed(2)) : 0,
          fee,
          exitReason: 'market',
          closedAt: Date.now(),
        });
      });
      setBalance((b) => Number((b + totalPnl).toFixed(2)));
      setTradeHistory((hist) => [...closedTrades, ...hist]);
      const count = positions.length;
      setPositions([]);
      setToast(`Liquidated all ${count} positions. Net PnL: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`);
    }
  }, [positions, applyAccountSnapshot]);

  const exportTradeHistoryCsv = useCallback(() => {
    if (tradeHistory.length === 0) {
      setToast('No trade history available to export.');
      return;
    }
    const headers = ['Trade ID', 'Symbol', 'Side', 'Type', 'Size', 'Entry Price', 'Close Price', 'Realized PnL ($)', 'Return (%)', 'Fee ($)', 'Closed At'];
    const rows = tradeHistory.map((t) => [
      `"${t.id}"`,
      `"${t.symbol}"`,
      `"${(t.side || '').toUpperCase()}"`,
      `"${(t.tradeMode || 'margin').toUpperCase()}"`,
      t.size,
      t.entryPrice,
      t.closePrice || t.entryPrice,
      t.pnl.toFixed(2),
      `"${t.pnlPercent.toFixed(2)}%"`,
      (t.fee || 0).toFixed(2),
      `"${new Date(t.closedAt).toISOString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `apogee_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast(`Exported ${tradeHistory.length} trades to CSV.`);
  }, [tradeHistory]);

  const updatePositionBracket = useCallback(
    async (id: string, takeProfit?: number | null, stopLoss?: number | null): Promise<boolean> => {
      try {
        const result = await apiFetch<{ success: boolean; message: string }>(`/api/positions/${id}/bracket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ takeProfit, stopLoss }),
        });
        setToast(result.message);
        const account = await apiFetch<any>('/api/account');
        applyAccountSnapshot(account);
        return result.success;
      } catch (err: any) {
        setToast(err.message || 'Failed to update bracket orders.');
        return false;
      }
    },
    [applyAccountSnapshot]
  );

  const cancelOrder = useCallback(
    async (id: string) => {
      try {
        const result = await apiFetch<{ success: boolean; message: string }>(`/api/orders/${id}`, {
          method: 'DELETE',
        });
        setToast(result.message);
        const account = await apiFetch<any>('/api/account');
        applyAccountSnapshot(account);
      } catch (err: any) {
        setToast(err.message || 'Failed to cancel order.');
      }
    },
    [applyAccountSnapshot]
  );

  const resetAccount = useCallback(async () => {
    try {
      const result = await apiFetch<{ success: boolean; message: string }>('/api/account/reset', { method: 'POST' });
      setToast(result.message);
      const account = await apiFetch<any>('/api/account');
      applyAccountSnapshot(account);
    } catch (err: any) {
      setToast(err.message || 'Failed to reset account.');
    }
  }, [applyAccountSnapshot]);

  const depositFunds = useCallback(
    async (amount: number, method: string = 'card'): Promise<boolean> => {
      try {
        const result = await apiFetch<{ success: boolean; message: string; balance: number }>('/api/account/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, method }),
        });
        setToast(result.message);
        const account = await apiFetch<any>('/api/account');
        applyAccountSnapshot(account);
        return result.success;
      } catch (err: any) {
        setToast(err.message || 'Deposit failed.');
        return false;
      }
    },
    [applyAccountSnapshot]
  );

  const withdrawFunds = useCallback(
    async (amount: number, method: string = 'bank'): Promise<boolean> => {
      try {
        const result = await apiFetch<{ success: boolean; message: string; balance: number }>('/api/account/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, method }),
        });
        setToast(result.message);
        const account = await apiFetch<any>('/api/account');
        applyAccountSnapshot(account);
        return result.success;
      } catch (err: any) {
        setToast(err.message || 'Withdrawal failed.');
        return false;
      }
    },
    [applyAccountSnapshot]
  );

  return (
    <TradingContext.Provider
      value={{
        viewMode,
        setViewMode,
        activeArchitectureTab,
        setActiveArchitectureTab,
        navigateToArchitecture,
        markets,
        activeSymbol,
        setActiveSymbol: handleSetActiveSymbol,
        activeMarket,
        candles,
        activeTimeframe,
        setActiveTimeframe,
        orderBook,
        recentTrades,
        balance,
        equity,
        marginUsed,
        availableMargin,
        marginRatioPercent,
        isMarginCall,
        isDepositOpen,
        setIsDepositOpen,
        isFridayDrawerOpen,
        setIsFridayDrawerOpen,
        holdings,
        holdingsList,
        stockAssetValue,
        totalPortfolioValue,
        positions,
        openOrders,
        tradeHistory,
        aiSignal,
        toast,
        setToast,
        feedStatus,
        toggleFeedMode,
        placeOrder,
        orderPrefill,
        setOrderPrefill,
        prefillOrderFromBook,
        closePosition,
        closeAllPositions,
        exportTradeHistoryCsv,
        updatePositionBracket,
        cancelOrder,
        resetAccount,
        depositFunds,
        withdrawFunds,
        isConnected,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
