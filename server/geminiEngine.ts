/**
 * F.R.I.D.A.Y. Gemini AI Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Powers F.R.I.D.A.Y. with Google Gemini 1.5 Flash via Function Calling.
 * Receives full real-time market context and account state, reasons about it
 * using the LLM, and calls structured tools to produce action cards that the
 * existing FridayCopilotDrawer.tsx renders without any changes.
 */

import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Tool } from '@google/generative-ai';
import { MarketTicker, AccountSummary, Position } from './types.js';
import { marketEngine } from './marketEngine.js';

// ─── Tool Declarations (Gemini Function Calling Schema) ───────────────────────

const FRIDAY_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'stage_order',
        description:
          'Stage a buy (long) or sell (short) order for the user to review and confirm. Use this whenever the user asks to buy, sell, go long, go short, or open a position on any asset.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symbol: {
              type: SchemaType.STRING,
              description: 'The market symbol to trade, e.g. "BTC/USDT" or "NVDA/USD".',
            },
            side: {
              type: SchemaType.STRING,
              description: '"buy" for long, "sell" for short.',
            },
            size: {
              type: SchemaType.NUMBER,
              description: 'Quantity of the asset to trade.',
            },
            leverage: {
              type: SchemaType.NUMBER,
              description: 'Leverage multiplier (1 = spot, >1 = margin). Default 1.',
            },
            takeProfit: {
              type: SchemaType.NUMBER,
              description: 'Optional take-profit price level.',
            },
            stopLoss: {
              type: SchemaType.NUMBER,
              description: 'Optional stop-loss price level.',
            },
            rationale: {
              type: SchemaType.STRING,
              description:
                'Brief explanation of why you are recommending this trade setup.',
            },
          },
          required: ['symbol', 'side', 'size', 'leverage'],
        },
      } as FunctionDeclaration,
      {
        name: 'close_positions',
        description:
          'Signal to close one specific position or all positions. Use when the user says "close", "exit", "liquidate", or "get me out".',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            target: {
              type: SchemaType.STRING,
              description:
                '"all" to close every open position, or a specific symbol like "BTC/USDT".',
            },
            rationale: {
              type: SchemaType.STRING,
              description: 'Brief reason for closing.',
            },
          },
          required: ['target'],
        },
      } as FunctionDeclaration,
      {
        name: 'portfolio_risk_audit',
        description:
          'Perform a comprehensive risk analysis of the current portfolio. Use when the user asks about risk, margin, safety, health, exposure, or collateral.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            focus: {
              type: SchemaType.STRING,
              description:
                'Optional focus area: "margin" | "drawdown" | "concentration" | "overall".',
            },
          },
          required: [],
        },
      } as FunctionDeclaration,
      {
        name: 'market_scanner',
        description:
          'Scan all available markets and return the top trade setups based on momentum, technicals, and risk/reward. Use when the user asks what to trade, for opportunities, or for a market scan.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            filter: {
              type: SchemaType.STRING,
              description:
                'Optional filter: "crypto" | "stocks" | "all". Default "all".',
            },
            count: {
              type: SchemaType.NUMBER,
              description: 'Number of top setups to return. Default 3.',
            },
          },
          required: [],
        },
      } as FunctionDeclaration,
      {
        name: 'deposit_intent',
        description:
          'Open the deposit flow to add collateral funds. Use when the user asks to deposit, add funds, add cash, or inject capital.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            amount: {
              type: SchemaType.NUMBER,
              description: 'The amount in USD they want to deposit. Default 10000.',
            },
          },
          required: [],
        },
      } as FunctionDeclaration,
    ],
  },
];

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  markets: MarketTicker[],
  summary: AccountSummary,
  userName: string,
  activeSymbol: string
): string {
  const bossName = userName && userName.trim() ? userName.trim().split(' ')[0] : 'Boss';
  const activeMarket = markets.find((m) => m.symbol === activeSymbol) || markets[0];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const topGainers = [...markets]
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 3)
    .map((m) => `${m.symbol} ${m.change24h >= 0 ? '+' : ''}${m.change24h}%`)
    .join(', ');

  const topLosers = [...markets]
    .sort((a, b) => a.change24h - b.change24h)
    .slice(0, 3)
    .map((m) => `${m.symbol} ${m.change24h}%`)
    .join(', ');

  const positionsText =
    summary.positions.length === 0
      ? 'No open positions.'
      : summary.positions
          .map(
            (p: Position) =>
              `${p.symbol} ${p.side.toUpperCase()} | Size: ${p.size} | Entry: $${p.entryPrice} | Mark: $${p.markPrice} | uPnL: ${p.unrealizedPnl >= 0 ? '+' : ''}$${p.unrealizedPnl} (${p.unrealizedPnlPercent}%) | Leverage: ${p.leverage}x${p.stopLoss ? ` | SL: $${p.stopLoss}` : ''}${p.takeProfit ? ` | TP: $${p.takeProfit}` : ''}`
          )
          .join('\n');

  return `You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), the elite AI trading copilot and risk manager of the Apogee Pro Terminal. You have a sharp, confident, high-intelligence persona — calm under pressure, direct, and laser-focused on the user's financial wellbeing. You address the user as "${bossName}" and speak with military precision combined with institutional trading knowledge.

CURRENT TIME: ${timeOfDay}

══════════════════════════════════════
LIVE MARKET TELEMETRY
══════════════════════════════════════
Active Focus: ${activeMarket?.name} (${activeMarket?.symbol}) @ $${activeMarket?.price?.toLocaleString()} | 24h: ${activeMarket?.change24h >= 0 ? '+' : ''}${activeMarket?.change24h}%
All Markets: ${markets.map((m) => `${m.symbol}=$${m.price.toLocaleString()}(${m.change24h >= 0 ? '+' : ''}${m.change24h}%)`).join(' | ')}
Top Gainers: ${topGainers}
Top Losers: ${topLosers}

══════════════════════════════════════
ACCOUNT STATE
══════════════════════════════════════
Cash Balance: $${summary.balance.toLocaleString()}
Equity: $${summary.equity?.toLocaleString() || summary.balance.toLocaleString()}
Margin Used: $${summary.marginUsed?.toLocaleString() || '0'} (${summary.marginRatioPercent || 0}% utilization)
Available Margin: $${summary.availableMargin?.toLocaleString() || summary.balance.toLocaleString()}
Portfolio Value: $${summary.totalPortfolioValue?.toLocaleString() || summary.balance.toLocaleString()}
Margin Call Risk: ${(summary.marginRatioPercent || 0) >= 80 ? '🚨 CRITICAL — IMMEDIATE ACTION REQUIRED' : (summary.marginRatioPercent || 0) >= 50 ? '⚠️ ELEVATED' : '✅ NOMINAL'}

══════════════════════════════════════
OPEN POSITIONS (${summary.positions.length})
══════════════════════════════════════
${positionsText}

══════════════════════════════════════
YOUR CAPABILITIES
══════════════════════════════════════
You have the following tools available:
• stage_order — Stage a bracket buy/sell order for the user to authorize
• close_positions — Close one or all positions immediately
• portfolio_risk_audit — Deep risk analysis of the portfolio
• market_scanner — Find top trade setups across all markets
• deposit_intent — Open deposit flow to inject capital

══════════════════════════════════════
BEHAVIORAL RULES
══════════════════════════════════════
1. ALWAYS use a tool when the user's intent matches one (orders, closures, scans, risk, deposits). Do not just talk about it — execute the tool call.
2. Keep responses concise, data-driven, and actionable. Use bullet points and bold for key numbers.
3. Reference real live prices and account data from the context above. Never make up prices.
4. When staging orders, always calculate required margin, fees (0.04% taker), and Risk/Reward ratio.
5. Apply institutional risk management: warn if a position risks >2% of account on a single trade.
6. If the user asks a trading education question, provide an expert-level answer with concrete examples using the active market's real price.
7. Use markdown formatting: **bold** for numbers, ### for section headers, bullet points for lists.
8. Address the user as "${bossName}" naturally — not robotically on every sentence.`;
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

function executeTool(
  toolName: string,
  args: Record<string, any>,
  markets: MarketTicker[],
  summary: AccountSummary
): { actionCard?: any; toolResultText: string } {
  switch (toolName) {
    case 'stage_order': {
      const {
        symbol,
        side,
        size,
        leverage = 1,
        takeProfit,
        stopLoss,
        rationale,
      } = args;
      const market = markets.find((m) => m.symbol === symbol) || markets[0];
      const notional = size * market.price;
      const reqMargin = Number((notional / leverage).toFixed(2));
      const estFee = Number((notional * 0.0004).toFixed(2));
      const tradeMode = leverage > 1 ? 'margin' : 'spot';

      let rrText = '';
      if (takeProfit && stopLoss) {
        const risk = Math.abs(market.price - stopLoss);
        const reward = Math.abs(takeProfit - market.price);
        if (risk > 0) {
          const rr = (reward / risk).toFixed(2);
          rrText = `R/R: 1:${rr}`;
        }
      }

      return {
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
          availableMargin: summary.availableMargin,
          rationale,
        },
        toolResultText: `Order staged: ${side.toUpperCase()} ${size} ${symbol} @ $${market.price} | Margin: $${reqMargin} | Fee: $${estFee}${rrText ? ` | ${rrText}` : ''}`,
      };
    }

    case 'close_positions': {
      const { target, rationale } = args;
      if (target === 'all') {
        return {
          actionCard: {
            type: 'close_intent',
            target: 'all',
            positions: summary.positions,
            rationale,
          },
          toolResultText: `Close-all intent staged for ${summary.positions.length} positions.`,
        };
      }
      const matching = summary.positions.filter((p: Position) => p.symbol === target);
      return {
        actionCard: {
          type: 'close_intent',
          target,
          positions: matching,
          rationale,
        },
        toolResultText: `Close intent staged for ${target} (${matching.length} position(s)).`,
      };
    }

    case 'portfolio_risk_audit': {
      const marginRatio = summary.marginRatioPercent || 0;
      const isCritical = marginRatio >= 80;
      const isElevated = marginRatio >= 50;
      const status = isCritical ? 'CRITICAL' : isElevated ? 'ELEVATED' : 'NOMINAL';

      // Calculate total unrealized PnL
      const totalUpnl = summary.positions.reduce((acc: number, p: Position) => acc + p.unrealizedPnl, 0);
      const largestPosition = summary.positions.reduce(
        (max: Position, p: Position) => (Math.abs(p.margin) > Math.abs(max?.margin || 0) ? p : max),
        summary.positions[0]
      );

      return {
        actionCard: {
          type: 'risk_audit',
          marginRatioPercent: marginRatio,
          marginUsed: summary.marginUsed,
          availableMargin: summary.availableMargin,
          cash: summary.balance,
          totalPortfolioValue: summary.totalPortfolioValue,
          positionsCount: summary.positions.length,
          totalUnrealizedPnl: totalUpnl,
          largestPosition: largestPosition?.symbol,
          status,
        },
        toolResultText: `Risk audit: Status ${status} | Margin ${marginRatio}% | Total uPnL $${totalUpnl.toFixed(2)}`,
      };
    }

    case 'market_scanner': {
      const { filter = 'all', count = 3 } = args;
      const filtered = filter === 'crypto'
        ? markets.filter((m) => m.category === 'crypto')
        : filter === 'stocks'
        ? markets.filter((m) => m.category === 'stock')
        : markets;

      const topMomentum = [...filtered]
        .sort((a, b) => b.change24h - a.change24h)
        .slice(0, count)
        .map((m) => {
          const sig = marketEngine.getAiSignal(m.symbol);
          return {
            symbol: m.symbol,
            name: m.name,
            price: m.price,
            change24h: m.change24h,
            bias: sig.bias,
            confidence: sig.confidence,
            support: sig.supportLevel,
            resistance: sig.resistanceLevel,
          };
        });

      const topReversal = [...filtered]
        .sort((a, b) => a.change24h - b.change24h)
        .slice(0, Math.min(2, count))
        .map((m) => {
          const sig = marketEngine.getAiSignal(m.symbol);
          return {
            symbol: m.symbol,
            name: m.name,
            price: m.price,
            change24h: m.change24h,
            bias: sig.bias,
            confidence: sig.confidence,
            support: sig.supportLevel,
            resistance: sig.resistanceLevel,
          };
        });

      return {
        actionCard: {
          type: 'market_scan',
          momentum: topMomentum,
          reversal: topReversal,
          filter,
          scannedAt: Date.now(),
        },
        toolResultText: `Scanned ${filtered.length} markets. Top momentum: ${topMomentum.map((m) => m.symbol).join(', ')}. Top reversals: ${topReversal.map((m) => m.symbol).join(', ')}`,
      };
    }

    case 'deposit_intent': {
      const { amount = 10000 } = args;
      return {
        actionCard: {
          type: 'deposit_intent',
          amount,
        },
        toolResultText: `Deposit flow triggered for $${amount.toLocaleString()}.`,
      };
    }

    default:
      return { toolResultText: `Unknown tool: ${toolName}` };
  }
}

// ─── Main Gemini Engine ───────────────────────────────────────────────────────

export interface GeminiResponse {
  reply: string;
  actionCard?: any;
  timestamp: number;
}

let genAI: GoogleGenerativeAI | null = null;
let isInitialized = false;

function initGemini(): boolean {
  if (isInitialized) return genAI !== null;
  isInitialized = true;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.log('[F.R.I.D.A.Y.] No GEMINI_API_KEY found — running in heuristic fallback mode.');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    console.log('[F.R.I.D.A.Y.] Gemini AI Engine initialized. Neural core: ONLINE ✓');
    return true;
  } catch (err) {
    console.error('[F.R.I.D.A.Y.] Failed to initialize Gemini:', err);
    return false;
  }
}

export function isGeminiAvailable(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!(apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here');
}

export async function processWithGemini(
  message: string,
  activeSymbol: string,
  userName: string,
  markets: MarketTicker[],
  summary: AccountSummary
): Promise<GeminiResponse> {
  if (!initGemini() || !genAI) {
    throw new Error('Gemini not available');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: FRIDAY_TOOLS,
    systemInstruction: buildSystemPrompt(markets, summary, userName, activeSymbol),
  });

  const chat = model.startChat({
    history: [],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  // ── First turn: send user message ──────────────────────────────────────────
  const result = await chat.sendMessage(message);
  const response = result.response;
  const bossName = userName?.trim().split(' ')[0] || 'Boss';

  // ── Check for Function Calls ────────────────────────────────────────────────
  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    const toolName = call.name;
    const toolArgs = (call.args || {}) as Record<string, any>;

    // Execute the tool
    const { actionCard, toolResultText } = executeTool(toolName, toolArgs, markets, summary);

    // ── Second turn: send tool result back to Gemini for final reply ──────────
    const toolResponse = await chat.sendMessage([
      {
        functionResponse: {
          name: toolName,
          response: { result: toolResultText },
        },
      },
    ]);

    const finalText = toolResponse.response.text();

    return {
      reply: finalText || buildFallbackToolReply(toolName, toolArgs, bossName),
      actionCard,
      timestamp: Date.now(),
    };
  }

  // ── No function call — pure text response ───────────────────────────────────
  const text = response.text();
  return {
    reply: text || `I copy, ${bossName}. Standing by for your next command.`,
    timestamp: Date.now(),
  };
}

// ─── Fallback reply if Gemini returns empty text after tool call ──────────────

function buildFallbackToolReply(toolName: string, args: Record<string, any>, bossName: string): string {
  switch (toolName) {
    case 'stage_order':
      return `Order staged for **${args.size} ${args.symbol}** (${args.side?.toUpperCase()}) at ${args.leverage}x leverage, ${bossName}. Review the card below and click **Authorize & Execute** to route to the matching engine.`;
    case 'close_positions':
      return `Position closure initiated for **${args.target}**, ${bossName}. Confirm below to execute at current mark price.`;
    case 'portfolio_risk_audit':
      return `Risk audit complete, ${bossName}. Review the dashboard below for full margin and collateral analysis.`;
    case 'market_scanner':
      return `Market scan complete, ${bossName}. Top setups are displayed below — review momentum and reversal candidates.`;
    case 'deposit_intent':
      return `Collateral injection protocol ready, ${bossName}. Click below to proceed with the deposit.`;
    default:
      return `Command processed, ${bossName}.`;
  }
}
