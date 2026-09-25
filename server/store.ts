import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AccountState, Position, Order, ClosedTrade, StockHolding } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'trading_db.json');

const INITIAL_BALANCE = 100000;

class Store {
  private state: AccountState = {
    balance: INITIAL_BALANCE,
    holdings: {},
    positions: [],
    openOrders: [],
    tradeHistory: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          balance: typeof parsed.balance === 'number' ? parsed.balance : INITIAL_BALANCE,
          holdings: parsed.holdings && typeof parsed.holdings === 'object' ? parsed.holdings : {},
          positions: Array.isArray(parsed.positions) ? parsed.positions : [],
          openOrders: Array.isArray(parsed.openOrders) ? parsed.openOrders : [],
          tradeHistory: Array.isArray(parsed.tradeHistory) ? parsed.tradeHistory : [],
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading trading store from disk, using defaults:', err);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving trading store to disk:', err);
    }
  }

  public getState(): AccountState {
    return {
      balance: this.state.balance,
      holdings: { ...this.state.holdings },
      positions: [...this.state.positions],
      openOrders: [...this.state.openOrders],
      tradeHistory: [...this.state.tradeHistory],
    };
  }

  public getHoldings(): Record<string, StockHolding> {
    return { ...this.state.holdings };
  }

  public getHolding(symbol: string): StockHolding | undefined {
    return this.state.holdings[symbol];
  }

  public setHolding(holding: StockHolding) {
    this.state.holdings[holding.symbol] = holding;
    this.save();
  }

  public removeHolding(symbol: string) {
    if (this.state.holdings[symbol]) {
      delete this.state.holdings[symbol];
      this.save();
    }
  }

  public getBalance(): number {
    return this.state.balance;
  }

  public setBalance(newBalance: number) {
    this.state.balance = Number(newBalance.toFixed(2));
    this.save();
  }

  public getPositions(): Position[] {
    return this.state.positions;
  }

  public setPositions(positions: Position[]) {
    this.state.positions = positions;
    this.save();
  }

  public addPosition(position: Position) {
    this.state.positions = [position, ...this.state.positions];
    this.save();
  }

  public removePosition(id: string): Position | undefined {
    const pos = this.state.positions.find((p) => p.id === id);
    if (pos) {
      this.state.positions = this.state.positions.filter((p) => p.id !== id);
      this.save();
    }
    return pos;
  }

  public updatePositions(updater: (pos: Position) => Position) {
    this.state.positions = this.state.positions.map(updater);
    this.save();
  }

  public updatePositionBracket(id: string, takeProfit?: number | null, stopLoss?: number | null): Position | undefined {
    let updated: Position | undefined;
    this.state.positions = this.state.positions.map((p) => {
      if (p.id === id) {
        updated = {
          ...p,
          takeProfit: takeProfit === null ? undefined : takeProfit !== undefined ? takeProfit : p.takeProfit,
          stopLoss: stopLoss === null ? undefined : stopLoss !== undefined ? stopLoss : p.stopLoss,
        };
        return updated;
      }
      return p;
    });
    if (updated) {
      this.save();
    }
    return updated;
  }

  public getOpenOrders(): Order[] {
    return this.state.openOrders;
  }

  public addOpenOrder(order: Order) {
    this.state.openOrders = [order, ...this.state.openOrders];
    this.save();
  }

  public removeOpenOrder(id: string): Order | undefined {
    const ord = this.state.openOrders.find((o) => o.id === id);
    if (ord) {
      this.state.openOrders = this.state.openOrders.filter((o) => o.id !== id);
      this.save();
    }
    return ord;
  }

  public getTradeHistory(): ClosedTrade[] {
    return this.state.tradeHistory;
  }

  public addClosedTrade(trade: ClosedTrade) {
    this.state.tradeHistory = [trade, ...this.state.tradeHistory];
    this.save();
  }

  public resetAccount() {
    this.state = {
      balance: INITIAL_BALANCE,
      holdings: {},
      positions: [],
      openOrders: [],
      tradeHistory: [],
    };
    this.save();
    return this.getState();
  }
}

export const store = new Store();
