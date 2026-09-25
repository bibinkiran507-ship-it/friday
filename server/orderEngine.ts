import { store } from './store.js';
import { marketEngine } from './marketEngine.js';
import { Position, Order, ClosedTrade, MarketTicker, StockHolding } from './types.js';

export class OrderEngine {
  public static readonly TAKER_FEE = 0.0004; // 0.04% taker fee
  public static readonly MAKER_FEE = 0.0002; // 0.02% maker fee

  private orderFilledListeners: Array<(order: Order, position: Position) => void> = [];
  private positionClosedListeners: Array<(trade: ClosedTrade) => void> = [];
  private accountUpdateListeners: Array<() => void> = [];

  constructor() {
    // Listen to market ticks to update positions and check open orders
    marketEngine.onTick((_markets, updatedMarket) => {
      this.evaluateTick(updatedMarket);
    });
  }

  public getAccountSummary() {
    const state = store.getState();
    const markets = marketEngine.getMarkets();

    // 1. Recalculate stock holdings market value & unrealized PnL
    let stockAssetValue = 0;
    let stockUnrealizedPnl = 0;
    const holdingsList = Object.values(state.holdings || {}).map((h) => {
      const mkt = markets.find((m) => m.symbol === h.symbol);
      const currentPrice = mkt ? mkt.price : h.avgCost;
      const marketValue = Number((h.shares * currentPrice).toFixed(2));
      const cost = h.shares * h.avgCost;
      const unrealizedPnl = Number((marketValue - cost).toFixed(2));
      const unrealizedPnlPercent = cost > 0 ? Number(((unrealizedPnl / cost) * 100).toFixed(2)) : 0;
      stockAssetValue += marketValue;
      stockUnrealizedPnl += unrealizedPnl;
      return {
        ...h,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    });

    // 2. Recalculate leveraged positions unrealized PnL
    const positions = state.positions.map((pos) => {
      const mkt = markets.find((m) => m.symbol === pos.symbol);
      const currentPrice = mkt ? mkt.price : pos.markPrice;
      const diff = pos.side === 'long' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
      const unrealizedPnl = Number(((diff / pos.entryPrice) * (pos.size * pos.entryPrice)).toFixed(2));
      const unrealizedPnlPercent = pos.margin > 0 ? Number(((unrealizedPnl / pos.margin) * 100).toFixed(2)) : 0;

      return {
        ...pos,
        markPrice: currentPrice,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    });

    const marginUsed = Number(positions.reduce((sum, p) => sum + p.margin, 0).toFixed(2));
    const posUnrealizedPnl = Number(positions.reduce((sum, p) => sum + p.unrealizedPnl, 0).toFixed(2));
    
    // Total portfolio value includes Cash + Owned Stock Value + Leveraged Unrealized PnL
    const equity = Number((state.balance + stockAssetValue + posUnrealizedPnl).toFixed(2));
    const totalPortfolioValue = equity;
    const availableMargin = Math.max(0, Number((state.balance - marginUsed).toFixed(2)));

    const marginCapacity = state.balance;
    const marginRatioPercent = marginCapacity > 0 ? Number(((marginUsed / marginCapacity) * 100).toFixed(1)) : (marginUsed > 0 ? 100 : 0);
    const isMarginCall = marginRatioPercent >= 80;

    return {
      balance: state.balance,
      cash: state.balance,
      stockAssetValue: Number(stockAssetValue.toFixed(2)),
      totalPortfolioValue,
      equity,
      marginUsed,
      availableMargin,
      marginRatioPercent,
      isMarginCall,
      totalUnrealizedPnl: Number((posUnrealizedPnl + stockUnrealizedPnl).toFixed(2)),
      holdings: state.holdings || {},
      holdingsList,
      positions,
      openOrders: state.openOrders,
      tradeHistory: state.tradeHistory,
    };
  }

  public placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    tradeMode?: 'spot' | 'margin';
    price?: number;
    size: number;
    leverage: number;
    takeProfit?: number;
    stopLoss?: number;
  }): { success: boolean; message: string; position?: Position; order?: Order; holding?: StockHolding } {
    const market = marketEngine.getMarket(params.symbol);
    if (!market) {
      return { success: false, message: `Market ${params.symbol} not found.` };
    }

    const execPrice = params.type === 'market' || !params.price ? market.price : params.price;
    const isSpot = params.tradeMode === 'spot' || params.leverage === 1;

    // ─── SPOT / REAL STOCK TRADING ──────────────────────────────────────────
    if (isSpot && params.type === 'market') {
      const state = store.getState();
      const notional = Number((params.size * execPrice).toFixed(2));
      const feeRate = params.type === 'market' ? OrderEngine.TAKER_FEE : OrderEngine.MAKER_FEE;
      const fee = Number((notional * feeRate).toFixed(2));

      if (params.side === 'buy') {
        const totalDebit = Number((notional + fee).toFixed(2));
        if (totalDebit > state.balance) {
          return {
            success: false,
            message: `Buy failed: Insufficient cash. Cost + Fee: $${totalDebit.toLocaleString()}, Available Cash: $${state.balance.toLocaleString()}`,
          };
        }

        // Deduct cash including fee
        store.setBalance(Number((state.balance - totalDebit).toFixed(2)));

        // Update or create stock holding
        const existing = store.getHolding(params.symbol);
        let updatedHolding: StockHolding;
        if (existing) {
          const totalShares = Number((existing.shares + params.size).toFixed(4));
          const totalCost = Number((existing.totalCost + notional).toFixed(2));
          const avgCost = Number((totalCost / totalShares).toFixed(market.precision));
          updatedHolding = {
            ...existing,
            shares: totalShares,
            totalCost,
            avgCost,
            updatedAt: Date.now(),
          };
        } else {
          updatedHolding = {
            symbol: market.symbol,
            name: market.name,
            category: market.category,
            shares: params.size,
            avgCost: execPrice,
            totalCost: notional,
            updatedAt: Date.now(),
          };
        }
        store.setHolding(updatedHolding);

        // Log trade record
        const closedRecord: ClosedTrade = {
          id: Math.random().toString(36).substring(2, 9),
          symbol: market.symbol,
          side: 'buy',
          tradeMode: 'spot',
          entryPrice: execPrice,
          closePrice: execPrice,
          size: params.size,
          leverage: 1,
          pnl: 0,
          pnlPercent: 0,
          fee,
          closedAt: Date.now(),
        };
        store.addClosedTrade(closedRecord);

        // Instantly push the market graph UP
        marketEngine.applyMarketImpact(params.symbol, 'buy', params.size);
        this.notifyAccountUpdate();

        return {
          success: true,
          message: `Bought ${params.size} ${market.symbol} stock @ $${execPrice.toLocaleString()} (Fee: $${fee.toFixed(2)})`,
          holding: updatedHolding,
        };
      } else {
        // Sell Stock
        const existing = store.getHolding(params.symbol);
        if (!existing || existing.shares < params.size) {
          const owned = existing ? existing.shares : 0;
          return {
            success: false,
            message: `Sell failed: Insufficient stock available. You currently own ${owned} ${market.symbol}, requested ${params.size}.`,
          };
        }

        const proceeds = Number((notional - fee).toFixed(2));
        const costBasis = Number((params.size * existing.avgCost).toFixed(2));
        const pnl = Number((proceeds - costBasis).toFixed(2));
        const pnlPercent = costBasis > 0 ? Number(((pnl / costBasis) * 100).toFixed(2)) : 0;

        // Credit proceeds to cash
        store.setBalance(Number((state.balance + proceeds).toFixed(2)));

        // Deduct shares from holding
        const remainingShares = Number((existing.shares - params.size).toFixed(4));
        if (remainingShares <= 0.0001) {
          store.removeHolding(params.symbol);
        } else {
          const remainingCost = Number((remainingShares * existing.avgCost).toFixed(2));
          store.setHolding({
            ...existing,
            shares: remainingShares,
            totalCost: remainingCost,
            updatedAt: Date.now(),
          });
        }

        // Log trade record
        const closedRecord: ClosedTrade = {
          id: Math.random().toString(36).substring(2, 9),
          symbol: market.symbol,
          side: 'sell',
          tradeMode: 'spot',
          entryPrice: existing.avgCost,
          closePrice: execPrice,
          size: params.size,
          leverage: 1,
          pnl,
          pnlPercent,
          fee,
          closedAt: Date.now(),
        };
        store.addClosedTrade(closedRecord);

        // Instantly push the market graph DOWN
        marketEngine.applyMarketImpact(params.symbol, 'sell', params.size);
        this.notifyAccountUpdate();

        return {
          success: true,
          message: `Sold ${params.size} ${market.symbol} stock @ $${execPrice.toLocaleString()} (Fee: $${fee.toFixed(2)}). Realized P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString()}`,
        };
      }
    }

    // ─── MARGIN / FUTURES LEVERAGED TRADING ─────────────────────────────────
    const notionalValue = params.size * execPrice;
    const reqMargin = Number((notionalValue / params.leverage).toFixed(2));

    const summary = this.getAccountSummary();
    if (reqMargin > summary.availableMargin) {
      return {
        success: false,
        message: `Order failed: Insufficient available margin. Required: $${reqMargin.toLocaleString()}, Available: $${summary.availableMargin.toLocaleString()}`,
      };
    }

    if (params.type === 'market') {
      const isLong = params.side === 'buy';
      const liqPrice = isLong
        ? Number((execPrice * (1 - 1 / params.leverage + 0.005)).toFixed(market.precision))
        : Number((execPrice * (1 + 1 / params.leverage - 0.005)).toFixed(market.precision));

      const fee = Number((notionalValue * OrderEngine.TAKER_FEE).toFixed(2));
      // Deduct open fee from cash balance
      store.setBalance(Math.max(0, Number((store.getBalance() - fee).toFixed(2))));

      const newPosition: Position = {
        id: Math.random().toString(36).substring(2, 9),
        symbol: market.symbol,
        side: isLong ? 'long' : 'short',
        entryPrice: execPrice,
        markPrice: execPrice,
        size: params.size,
        leverage: params.leverage,
        margin: reqMargin,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        liqPrice: Math.max(0, liqPrice),
        takeProfit: params.takeProfit ? Number(params.takeProfit) : undefined,
        stopLoss: params.stopLoss ? Number(params.stopLoss) : undefined,
        fee,
        timestamp: Date.now(),
      };

      store.addPosition(newPosition);
      marketEngine.applyMarketImpact(params.symbol, params.side, params.size);
      this.notifyAccountUpdate();

      return {
        success: true,
        message: `Executed Margin ${params.side.toUpperCase()} ${params.size} ${market.symbol} @ $${execPrice.toLocaleString()} (${params.leverage}x)`,
        position: newPosition,
      };
    } else {
      const newOrder: Order = {
        id: Math.random().toString(36).substring(2, 9),
        symbol: market.symbol,
        side: params.side,
        type: params.type,
        tradeMode: params.tradeMode || 'margin',
        price: execPrice,
        size: params.size,
        leverage: params.leverage,
        takeProfit: params.takeProfit ? Number(params.takeProfit) : undefined,
        stopLoss: params.stopLoss ? Number(params.stopLoss) : undefined,
        status: 'open',
        timestamp: Date.now(),
      };

      store.addOpenOrder(newOrder);
      this.notifyAccountUpdate();

      return {
        success: true,
        message: `Submitted ${params.type.toUpperCase()} ${params.side.toUpperCase()} order for ${params.size} ${market.symbol} @ $${execPrice.toLocaleString()}`,
        order: newOrder,
      };
    }
  }

  public closePosition(
    id: string,
    exitReason: 'market' | 'take_profit' | 'stop_loss' | 'liquidation' = 'market',
    fraction: number = 1.0
  ): { success: boolean; message: string; trade?: ClosedTrade } {
    const state = store.getState();
    const pos = state.positions.find((p) => p.id === id);
    if (!pos) {
      return { success: false, message: `Position with ID ${id} not found.` };
    }

    const clampedFraction = Math.max(0.01, Math.min(1.0, fraction));
    const isPartial = clampedFraction < 0.999;
    const closingSize = Number((pos.size * clampedFraction).toFixed(4));
    const closingMargin = Number((pos.margin * clampedFraction).toFixed(2));

    const market = marketEngine.getMarket(pos.symbol);
    const closePrice = market ? market.price : pos.markPrice;
    const diff = pos.side === 'long' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
    const rawPnl = Number(((diff / pos.entryPrice) * (closingSize * pos.entryPrice)).toFixed(2));
    const closeFee = Number((closingSize * closePrice * OrderEngine.TAKER_FEE).toFixed(2));
    const netPnl = Number((rawPnl - closeFee).toFixed(2));
    const totalFee = Number((((pos.fee || 0) * clampedFraction) + closeFee).toFixed(2));
    const pnlPercent = closingMargin > 0 ? Number(((netPnl / closingMargin) * 100).toFixed(2)) : 0;

    if (isPartial) {
      // Reduce position size and margin
      const remainingSize = Number((pos.size - closingSize).toFixed(4));
      const remainingMargin = Number((pos.margin - closingMargin).toFixed(2));
      pos.size = remainingSize;
      pos.margin = remainingMargin;
      pos.fee = Number(((pos.fee || 0) - (pos.fee || 0) * clampedFraction).toFixed(2));
    } else {
      store.removePosition(id);
    }

    store.setBalance(Number((state.balance + netPnl).toFixed(2)));

    const closedRecord: ClosedTrade = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: pos.symbol,
      side: pos.side,
      tradeMode: 'margin',
      entryPrice: pos.entryPrice,
      closePrice,
      size: closingSize,
      leverage: pos.leverage,
      pnl: netPnl,
      pnlPercent,
      fee: totalFee,
      exitReason,
      closedAt: Date.now(),
    };

    store.addClosedTrade(closedRecord);
    this.notifyAccountUpdate();
    this.positionClosedListeners.forEach((fn) => fn(closedRecord));

    let reasonSuffix = '';
    if (exitReason === 'take_profit') reasonSuffix = ' (Take-Profit Triggered 🎯)';
    else if (exitReason === 'stop_loss') reasonSuffix = ' (Stop-Loss Triggered 🛑)';
    else if (exitReason === 'liquidation') reasonSuffix = ' (Liquidated ⚠️)';

    const fractionLabel = isPartial ? ` (${Math.round(clampedFraction * 100)}% partial)` : '';

    return {
      success: true,
      message: `Closed ${pos.side.toUpperCase()} ${pos.symbol}${fractionLabel}${reasonSuffix}. Realized PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl}`,
      trade: closedRecord,
    };
  }

  public closeAllPositions(): { success: boolean; message: string; count: number; totalPnl: number } {
    const state = store.getState();
    const positionsToClose = [...state.positions];
    if (positionsToClose.length === 0) {
      return { success: true, message: 'No open positions to close.', count: 0, totalPnl: 0 };
    }

    let totalPnl = 0;
    let closedCount = 0;

    for (const pos of positionsToClose) {
      const res = this.closePosition(pos.id, 'market', 1.0);
      if (res.success && res.trade) {
        totalPnl += res.trade.pnl;
        closedCount++;
      }
    }

    return {
      success: true,
      message: `Closed all ${closedCount} positions. Realized P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,
      count: closedCount,
      totalPnl: Number(totalPnl.toFixed(2)),
    };
  }

  public updatePositionBracket(
    id: string,
    takeProfit?: number | null,
    stopLoss?: number | null
  ): { success: boolean; message: string; position?: Position } {
    const updated = store.updatePositionBracket(id, takeProfit, stopLoss);
    if (!updated) {
      return { success: false, message: `Position with ID ${id} not found.` };
    }
    this.notifyAccountUpdate();
    return {
      success: true,
      message: `Updated bracket limits for ${updated.symbol}: TP ${updated.takeProfit ? '$' + updated.takeProfit.toLocaleString() : 'None'}, SL ${updated.stopLoss ? '$' + updated.stopLoss.toLocaleString() : 'None'}`,
      position: updated,
    };
  }

  public cancelOrder(id: string): { success: boolean; message: string } {
    const cancelled = store.removeOpenOrder(id);
    if (!cancelled) {
      return { success: false, message: `Order with ID ${id} not found.` };
    }
    this.notifyAccountUpdate();
    return { success: true, message: 'Order cancelled successfully.' };
  }

  public resetAccount() {
    store.resetAccount();
    this.notifyAccountUpdate();
    return { success: true, message: 'Account balance reset to $100,000 USDT.' };
  }

  public deposit(amount: number, method: string = 'card') {
    if (!amount || amount <= 0) {
      return { success: false, message: 'Deposit amount must be greater than $0.' };
    }
    const state = store.getState();
    const newBalance = Number((state.balance + amount).toFixed(2));
    store.setBalance(newBalance);

    const depositRecord: ClosedTrade = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: 'USD/DEPOSIT',
      side: 'buy',
      tradeMode: 'spot',
      entryPrice: amount,
      closePrice: amount,
      size: 1,
      leverage: 1,
      pnl: 0,
      pnlPercent: 0,
      closedAt: Date.now(),
    };
    store.addClosedTrade(depositRecord);

    this.notifyAccountUpdate();
    return {
      success: true,
      message: `Successfully deposited $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via ${method.toUpperCase()}!`,
      balance: newBalance,
    };
  }

  public withdraw(amount: number, method: string = 'bank') {
    if (!amount || amount <= 0) {
      return { success: false, message: 'Withdrawal amount must be greater than $0.' };
    }
    const state = store.getState();
    if (amount > state.balance) {
      return {
        success: false,
        message: `Withdrawal failed: Insufficient cash balance. Available: $${state.balance.toLocaleString()}, requested: $${amount.toLocaleString()}.`,
      };
    }
    const newBalance = Number((state.balance - amount).toFixed(2));
    store.setBalance(newBalance);

    const withdrawRecord: ClosedTrade = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: 'USD/WITHDRAW',
      side: 'sell',
      tradeMode: 'spot',
      entryPrice: amount,
      closePrice: amount,
      size: 1,
      leverage: 1,
      pnl: 0,
      pnlPercent: 0,
      closedAt: Date.now(),
    };
    store.addClosedTrade(withdrawRecord);

    this.notifyAccountUpdate();
    return {
      success: true,
      message: `Successfully processed withdrawal of $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${method.toUpperCase()}.`,
      balance: newBalance,
    };
  }

  private evaluateTick(market: MarketTicker) {
    // 1. Check open orders for execution
    const openOrders = store.getOpenOrders();
    for (const order of openOrders) {
      if (order.symbol !== market.symbol) continue;

      let shouldFill = false;
      if (order.type === 'limit') {
        if (order.side === 'buy' && market.price <= order.price) {
          shouldFill = true;
        } else if (order.side === 'sell' && market.price >= order.price) {
          shouldFill = true;
        }
      } else if (order.type === 'stop') {
        if (order.side === 'buy' && market.price >= order.price) {
          shouldFill = true;
        } else if (order.side === 'sell' && market.price <= order.price) {
          shouldFill = true;
        }
      }

      if (shouldFill) {
        store.removeOpenOrder(order.id);
        const isLong = order.side === 'buy';
        const notional = order.size * market.price;
        const margin = Number((notional / order.leverage).toFixed(2));
        const liqPrice = isLong
          ? Number((market.price * (1 - 1 / order.leverage + 0.005)).toFixed(market.precision))
          : Number((market.price * (1 + 1 / order.leverage - 0.005)).toFixed(market.precision));

        const fee = Number((notional * OrderEngine.MAKER_FEE).toFixed(2));
        store.setBalance(Math.max(0, Number((store.getBalance() - fee).toFixed(2))));

        const newPos: Position = {
          id: Math.random().toString(36).substring(2, 9),
          symbol: order.symbol,
          side: isLong ? 'long' : 'short',
          entryPrice: market.price,
          markPrice: market.price,
          size: order.size,
          leverage: order.leverage,
          margin,
          unrealizedPnl: 0,
          unrealizedPnlPercent: 0,
          liqPrice: Math.max(0, liqPrice),
          takeProfit: order.takeProfit,
          stopLoss: order.stopLoss,
          fee,
          timestamp: Date.now(),
        };

        store.addPosition(newPos);
        const filledOrder: Order = { ...order, status: 'filled' };
        this.orderFilledListeners.forEach((fn) => fn(filledOrder, newPos));
        this.notifyAccountUpdate();
      }
    }

    // 2. Check position liquidation & bracket auto-exits (OCO)
    const positions = store.getPositions();
    for (const pos of positions) {
      if (pos.symbol !== market.symbol) continue;

      // 2a. Liquidation check
      const isLiquidated =
        (pos.side === 'long' && market.price <= pos.liqPrice) ||
        (pos.side === 'short' && market.price >= pos.liqPrice);

      if (isLiquidated) {
        this.closePosition(pos.id, 'liquidation');
        continue;
      }

      // 2b. Protective Stop-Loss check (Evaluated before TP for capital preservation)
      if (pos.stopLoss !== undefined && pos.stopLoss > 0) {
        const isStopLossHit =
          (pos.side === 'long' && market.price <= pos.stopLoss) ||
          (pos.side === 'short' && market.price >= pos.stopLoss);

        if (isStopLossHit) {
          this.closePosition(pos.id, 'stop_loss');
          continue;
        }
      }

      // 2c. Take-Profit check
      if (pos.takeProfit !== undefined && pos.takeProfit > 0) {
        const isTakeProfitHit =
          (pos.side === 'long' && market.price >= pos.takeProfit) ||
          (pos.side === 'short' && market.price <= pos.takeProfit);

        if (isTakeProfitHit) {
          this.closePosition(pos.id, 'take_profit');
          continue;
        }
      }
    }
  }

  private notifyAccountUpdate() {
    this.accountUpdateListeners.forEach((fn) => fn());
  }

  public onOrderFilled(listener: (order: Order, position: Position) => void) {
    this.orderFilledListeners.push(listener);
  }

  public onPositionClosed(listener: (trade: ClosedTrade) => void) {
    this.positionClosedListeners.push(listener);
  }

  public onAccountUpdate(listener: () => void) {
    this.accountUpdateListeners.push(listener);
  }
}

export const orderEngine = new OrderEngine();
