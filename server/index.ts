import 'dotenv/config';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { apiRouter } from './routes.js';
import { marketEngine } from './marketEngine.js';
import { orderEngine } from './orderEngine.js';
import { WsMessage } from './types.js';
import { isGeminiAvailable } from './geminiEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Root healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static build if dist folder exists (Production mode)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Client SPA fallback handler (Express v5 safe)
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg: WsMessage) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// WebSocket connection lifecycle
wss.on('connection', (ws) => {
  console.log(`[WS] Client connected. Total active connections: ${wss.clients.size}`);

  // Send initial snapshot
  const initialData: WsMessage = {
    type: 'INIT',
    data: {
      markets: marketEngine.getMarkets(),
      account: orderEngine.getAccountSummary(),
      feedStatus: marketEngine.getFeedStatus(),
    },
  };
  ws.send(JSON.stringify(initialData));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.action === 'ping') {
        ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
      }
    } catch {
      // ignore malformed payloads
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected. Total active connections: ${wss.clients.size}`);
  });
});

// Broadcast market price ticks
marketEngine.onTick((markets, updatedMarket) => {
  broadcast({
    type: 'TICK',
    data: {
      markets,
      updatedMarket,
    },
  });
});

// Broadcast real-time candle updates
marketEngine.onCandle((symbol, timeframe, candle, isNew) => {
  broadcast({
    type: 'CANDLE_UPDATE',
    data: {
      symbol,
      timeframe,
      candle,
      isNew,
    },
  });
});

// Broadcast trade executions
marketEngine.onTrade((symbol, trade) => {
  broadcast({
    type: 'TRADE',
    data: {
      symbol,
      trade,
    },
  });
});

// Broadcast account updates
orderEngine.onAccountUpdate(() => {
  broadcast({
    type: 'ACCOUNT',
    data: orderEngine.getAccountSummary(),
  });
});

// Broadcast order fills
orderEngine.onOrderFilled((order, position) => {
  broadcast({
    type: 'ORDER_FILLED',
    data: { order, position },
  });
});

// Broadcast position closures
orderEngine.onPositionClosed((trade) => {
  broadcast({
    type: 'POSITION_CLOSED',
    data: { trade },
  });
});

// Broadcast feed status updates
marketEngine.onFeedStatus((status) => {
  broadcast({
    type: 'FEED_STATUS',
    data: status,
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`[Apogee Backend] Running on http://localhost:${PORT}`);
  console.log(`[Apogee Backend] WebSocket endpoint active at ws://localhost:${PORT}/ws`);
  if (isGeminiAvailable()) {
    console.log(`[F.R.I.D.A.Y.] Gemini AI Engine ACTIVE (Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'})`);
  } else {
    console.log('[F.R.I.D.A.Y.] Running in heuristic fallback mode (set GEMINI_API_KEY in .env to activate LLM)');
  }
});
