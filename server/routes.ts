import { Router, Request, Response } from 'express';
import { marketEngine } from './marketEngine.js';
import { orderEngine } from './orderEngine.js';
import { processCopilotMessageAsync } from './fridayIntelligence.js';
import { isGeminiAvailable } from './geminiEngine.js';
import { fraudEngine } from './fraudEngine.js';

export const apiRouter = Router();

// GET /api/markets
apiRouter.get('/markets', (_req: Request, res: Response) => {
  res.json(marketEngine.getMarkets());
});

// GET /api/feed-status
apiRouter.get('/feed-status', (_req: Request, res: Response) => {
  res.json(marketEngine.getFeedStatus());
});

// POST /api/feed-mode
apiRouter.post('/feed-mode', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'live' || mode === 'simulated') {
    marketEngine.setFeedMode(mode);
    return res.json({ success: true, status: marketEngine.getFeedStatus() });
  }
  return res.status(400).json({ success: false, message: 'Invalid mode. Use live or simulated.' });
});

// POST /api/active-market
apiRouter.post('/active-market', (req: Request, res: Response) => {
  const { symbol, timeframe } = req.body;
  if (symbol) {
    marketEngine.setActiveMarket(symbol, timeframe || '5m');
  }
  return res.json({ success: true });
});

// GET /api/candles?symbol=BTC/USDT&timeframe=5m
apiRouter.get('/candles', async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  const timeframe = (req.query.timeframe as string) || '5m';
  try {
    const candles = await marketEngine.getCandlesAsync(symbol, timeframe);
    res.json(candles);
  } catch (err: any) {
    res.json(marketEngine.getCandles(symbol, timeframe));
  }
});

// GET /api/orderbook?symbol=BTC/USDT
apiRouter.get('/orderbook', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  res.json(marketEngine.getOrderBook(symbol));
});

// GET /api/trades/recent?symbol=BTC/USDT
apiRouter.get('/trades/recent', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  res.json(marketEngine.getRecentTrades(symbol));
});

// GET /api/ai-signals?symbol=BTC/USDT
apiRouter.get('/ai-signals', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  res.json(marketEngine.getAiSignal(symbol));
});

// GET /api/account
apiRouter.get('/account', (_req: Request, res: Response) => {
  res.json(orderEngine.getAccountSummary());
});

// GET /api/holdings
apiRouter.get('/holdings', (_req: Request, res: Response) => {
  res.json(orderEngine.getAccountSummary().holdingsList);
});

// POST /api/orders
apiRouter.post('/orders', (req: Request, res: Response) => {
  const { symbol, side, type, price, size, leverage, tradeMode, takeProfit, stopLoss } = req.body;
  if (!symbol || !side || !type || !size) {
    return res.status(400).json({ success: false, message: 'Missing required order parameters.' });
  }

  const result = orderEngine.placeOrder({
    symbol,
    side,
    type,
    tradeMode: tradeMode || (Number(leverage) === 1 ? 'spot' : 'margin'),
    price: price ? Number(price) : undefined,
    size: Number(size),
    leverage: Number(leverage) || 1,
    takeProfit: takeProfit ? Number(takeProfit) : undefined,
    stopLoss: stopLoss ? Number(stopLoss) : undefined,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// POST /api/positions/:id/bracket
apiRouter.post('/positions/:id/bracket', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { takeProfit, stopLoss } = req.body;
  const tp = takeProfit === null ? null : takeProfit !== undefined ? Number(takeProfit) : undefined;
  const sl = stopLoss === null ? null : stopLoss !== undefined ? Number(stopLoss) : undefined;

  const result = orderEngine.updatePositionBracket(id, tp, sl);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// POST /api/positions/close-all
apiRouter.post('/positions/close-all', (_req: Request, res: Response) => {
  const result = orderEngine.closeAllPositions();
  return res.json(result);
});

// POST /api/positions/:id/close
apiRouter.post('/positions/:id/close', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const fraction = req.body && req.body.fraction !== undefined ? Number(req.body.fraction) : 1.0;
  const result = orderEngine.closePosition(id, 'market', fraction);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// DELETE /api/orders/:id
apiRouter.delete('/orders/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = orderEngine.cancelOrder(id);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// POST /api/account/reset
apiRouter.post('/account/reset', (_req: Request, res: Response) => {
  const result = orderEngine.resetAccount();
  return res.json(result);
});

// POST /api/account/deposit
apiRouter.post('/account/deposit', (req: Request, res: Response) => {
  const { amount, method } = req.body;
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid deposit amount.' });
  }
  const result = orderEngine.deposit(num, method || 'card');
  return res.json(result);
});

// POST /api/account/withdraw
apiRouter.post('/account/withdraw', (req: Request, res: Response) => {
  const { amount, method, recipientAddress, rail } = req.body;
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
  }

  // Pre-flight Fraud Guard Check
  if (recipientAddress) {
    const fraudReport = fraudEngine.verify({
      accountOrAddress: recipientAddress,
      rail: rail || 'crypto',
      amount: num,
    });

    if (fraudReport.isBlocked) {
      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Transaction intercepted: destination address is blacklisted or flagged for high-risk fraud.',
        fraudReport,
      });
    }
  }

  const result = orderEngine.withdraw(num, method || 'bank');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// ─── FRAUD & AML RISK VERIFICATION SHIELD ──────────────────────────────

// POST /api/payments/verify-fraud
apiRouter.post('/payments/verify-fraud', (req: Request, res: Response) => {
  const { accountOrAddress, rail, network, amount } = req.body;
  if (!accountOrAddress) {
    return res.status(400).json({ error: 'accountOrAddress is required for AML/Fraud verification.' });
  }

  const report = fraudEngine.verify({
    accountOrAddress: String(accountOrAddress),
    rail,
    network,
    amount: amount ? Number(amount) : undefined,
  });

  return res.json(report);
});

// ─── COPILOT CHAT & NATURAL LANGUAGE INTENT PARSER ──────────────────────

// GET /api/copilot/status
apiRouter.get('/copilot/status', (_req: Request, res: Response) => {
  const gemini = isGeminiAvailable();
  return res.json({
    geminiAvailable: gemini,
    engine: gemini ? 'gemini' : 'heuristic',
  });
});

apiRouter.post('/copilot/chat', async (req: Request, res: Response) => {
  const { message, activeSymbol, userName } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const markets = marketEngine.getMarkets();
  const summary = orderEngine.getAccountSummary();

  try {
    const response = await processCopilotMessageAsync(
      message,
      activeSymbol,
      userName,
      markets,
      summary
    );

    // Optional: let the frontend know which engine responded
    res.setHeader('X-Friday-Engine', response.poweredBy || 'heuristic');
    return res.json(response);
  } catch (err: any) {
    console.error('[F.R.I.D.A.Y.] Chat route error:', err);
    return res.status(500).json({ error: 'F.R.I.D.A.Y. neural core encountered an error. Please try again.' });
  }
});


