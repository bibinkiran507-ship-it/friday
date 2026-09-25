import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '@/context/TradingContext';
import { useAuth } from '@/App';
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Zap,
  Activity,
  Radar,
  TrendingUp,
} from 'lucide-react';
import {
  playStarkChime,
  playOrderExecutedSfx,
  speakFriday,
  stopSpeaking,
  startSpeechRecognition,
  stopSpeechRecognition,
  isSpeechRecognitionSupported,
} from '@/utils/speechAndAudio';
import { CopilotMessage, CopilotActionCard } from '@/types/trading';

// Rich Markdown Text Formatter for F.R.I.D.A.Y. responses
function FormattedMessageText({ text, isFriday }: { text: string; isFriday: boolean }) {
  if (!isFriday) {
    return <p className="whitespace-pre-line">{text}</p>;
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[12px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Header ###
        if (line.startsWith('### ')) {
          return (
            <div key={idx} className="text-cyan-300 font-bold font-mono text-[12px] pt-1.5 pb-0.5 border-b border-cyan-500/20">
              {line.replace('### ', '')}
            </div>
          );
        }

        const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
        const content = isBullet ? line.slice(2) : line;

        // Inline formatting for **bold** and `code`
        const tokens = content.split(/(\*\*.*?\*\*|`.*?`)/g);
        const parsed = tokens.map((token, tIdx) => {
          if (token.startsWith('**') && token.endsWith('**')) {
            return (
              <strong key={tIdx} className="text-white font-bold">
                {token.slice(2, -2)}
              </strong>
            );
          }
          if (token.startsWith('`') && token.endsWith('`')) {
            return (
              <code
                key={tIdx}
                className="px-1.5 py-0.5 rounded bg-black/50 text-cyan-300 font-mono text-[11px] border border-cyan-500/30 shadow-sm"
              >
                {token.slice(1, -1)}
              </code>
            );
          }
          return <span key={tIdx}>{token}</span>;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-bold text-[10px] mt-0.5 select-none">◆</span>
              <div className="flex-1 text-white/90">{parsed}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-white/90">
            {parsed}
          </p>
        );
      })}
    </div>
  );
}

export const FridayCopilotDrawer: React.FC = () => {
  const { user } = useAuth();
  const {
    isFridayDrawerOpen,
    setIsFridayDrawerOpen,
    activeMarket,
    balance,
    marginRatioPercent,
    positions,
    placeOrder,
    closePosition,
    setIsDepositOpen,
    setToast,
    setActiveSymbol,
  } = useTrading();

  const bossName = user?.name ? user.name.split(' ')[0] : 'Boss';

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'friday',
      text: `Good day, ${bossName}! F.R.I.D.A.Y. Tactical Neural Interface is active. All terminal systems are operating at peak efficiency.\n\n• **Collateral**: **$${balance.toLocaleString()}** cash (${positions.length} active positions, ${marginRatioPercent}% margin)\n• **Active Market**: ${activeMarket.name} (${activeMarket.symbol}) at $${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}\n\nHow may I assist your trading today, ${bossName}?`,
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [poweredByGemini, setPoweredByGemini] = useState<boolean | null>(null); // null = unknown

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const speechStopFnRef = useRef<(() => void) | null>(null);

  // Probe AI engine status
  useEffect(() => {
    fetch('/api/copilot/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.geminiAvailable === 'boolean') {
          setPoweredByGemini(data.geminiAvailable);
        }
      })
      .catch(() => {
        // Fallback silently if offline
      });
  }, [isFridayDrawerOpen]);

  // Play Stark chime when drawer opens
  useEffect(() => {
    if (isFridayDrawerOpen) {
      playStarkChime();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      stopSpeaking();
      if (speechStopFnRef.current) {
        speechStopFnRef.current();
        speechStopFnRef.current = null;
      }
      setIsListening(false);
      setIsSpeaking(false);
    }
  }, [isFridayDrawerOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isFridayDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isFridayDrawerOpen]);

  // Send message to copilot backend
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    setInput('');
    const userMsgId = Math.random().toString(36).substring(2, 9);
    const userMsg: CopilotMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          activeSymbol: activeMarket.symbol,
          userName: user?.name || 'Boss',
        }),
      });

      if (!res.ok) {
        throw new Error('Neural core communication error.');
      }

      const data = await res.json();
      // Track which engine responded
      if (data.poweredBy === 'gemini') setPoweredByGemini(true);
      else if (data.poweredBy === 'heuristic') setPoweredByGemini(false);

      const fridayMsg: CopilotMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'friday',
        text: data.reply || 'Request acknowledged.',
        actionCard: data.actionCard,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, fridayMsg]);

      // Vocalize response
      if (!isMuted) {
        speakFriday(data.reply, {
          isMuted,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    } catch (err: any) {
      // Intelligent client-side fallback if backend encounters network delay
      const lower = query.toLowerCase();
      let fallbackText = `Telemetry update for **${activeMarket.symbol}**, ${bossName}:\n\nMark price stands at **$${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}** (${activeMarket.change24h >= 0 ? '+' : ''}${activeMarket.change24h}%). Cash reserves at **$${balance.toLocaleString()}**.\n\nAll risk and order routing engines are standing by for your directive.`;

      if (/^(hi|hello|hey|greetings|morning|afternoon|evening|yo|sup|hiya)/i.test(lower)) {
        fallbackText = `Hello, ${bossName}! ⚡\n\nF.R.I.D.A.Y. tactical neural core is online and scanning markets in real-time. Currently tracking **${activeMarket.name} (${activeMarket.symbol})** at **$${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: activeMarket.precision })}**.\n\nHow would you like to direct your capital today?`;
      } else if (/rsi/i.test(lower)) {
        fallbackText = `**RSI (Relative Strength Index)** Breakdown, ${bossName}:\n\n• Measured on a scale of **0 to 100**.\n• **> 70**: Overbought (buying momentum climaxing, watch for reversal or exhaustion).\n• **< 30**: Oversold (selling volume climaxing, high probability relief bounce zone).\n• **Bullish Divergence**: Price prints a lower low while RSI prints a higher low—classic institutional accumulation indicator!`;
      } else if (/ema|moving average/i.test(lower)) {
        fallbackText = `**EMA (Exponential Moving Average)** Guide, ${bossName}:\n\n• **20 EMA (Yellow)**: Short-term trend momentum line.\n• **50 EMA (Cyan)**: Intermediate trend baseline.\n• **Confluence Strategy**: When 20 EMA is above 50 EMA, buy pullbacks to the 20 EMA for high Risk/Reward entries!`;
      } else if (/risk|size|1% rule/i.test(lower)) {
        const onePct = (balance * 0.01).toFixed(2);
        fallbackText = `**Institutional 1% Risk Rule**, ${bossName}:\n\n• Never risk more than 1-2% of total equity per setup.\n• Max 1% risk on your balance ($${balance.toLocaleString()}) = **$${onePct}**.\n• Formula: Position Size = (Account Capital × 1%) / |Entry - Stop Loss|.\n• Sticking to minimum 1:2 R/R guarantees profitability even with a 40% win rate!`;
      }

      const errorMsg: CopilotMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'friday',
        text: fallbackText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);

      if (!isMuted) {
        speakFriday(fallbackText, {
          isMuted,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle voice recognition
  const handleToggleVoice = () => {
    if (isListening) {
      stopSpeechRecognition();
      if (speechStopFnRef.current) {
        speechStopFnRef.current();
        speechStopFnRef.current = null;
      }
      setIsListening(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        setToast('Speech recognition is not supported in this browser.');
        return;
      }

      setIsListening(true);
      const stopFn = startSpeechRecognition(
        (transcript, isFinal) => {
          setInput(transcript);
          if (isFinal) {
            setIsListening(false);
            handleSendMessage(transcript);
          }
        },
        () => {
          setIsListening(false);
        },
        (err) => {
          console.debug('Speech recognition error:', err);
          setIsListening(false);
          setToast('Microphone input error or permission denied.');
        }
      );
      speechStopFnRef.current = stopFn;
    }
  };

  // Execute Order Card 1-click
  const handleExecuteOrderIntent = async (card: Extract<CopilotActionCard, { type: 'order_intent' }>, msgId: string) => {
    setExecutingActionId(msgId);
    try {
      const success = await placeOrder({
        symbol: card.symbol,
        side: card.side,
        type: 'market',
        tradeMode: card.tradeMode,
        size: card.size,
        leverage: card.leverage,
        takeProfit: card.takeProfit,
        stopLoss: card.stopLoss,
      });

      if (success) {
        playOrderExecutedSfx();
        const confMsg: CopilotMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'friday',
          text: `⚡ **Order Executed**: Opened ${card.side.toUpperCase()} ${card.size} ${card.symbol} with ${card.leverage}x leverage. ${card.takeProfit ? `TP: $${card.takeProfit.toLocaleString()} ` : ''}${card.stopLoss ? `SL: $${card.stopLoss.toLocaleString()}` : ''}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, confMsg]);
        if (!isMuted) {
          speakFriday(`Order executed successfully for ${card.size} ${card.symbol}. Position is live.`, {
            isMuted,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          });
        }
      }
    } finally {
      setExecutingActionId(null);
    }
  };

  // Execute Close Intent 1-click
  const handleExecuteCloseIntent = async (card: Extract<CopilotActionCard, { type: 'close_intent' }>, msgId: string) => {
    setExecutingActionId(msgId);
    try {
      if (card.target === 'all') {
        for (const p of positions) {
          await closePosition(p.id);
        }
        playOrderExecutedSfx();
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: 'friday',
            text: `✅ All ${positions.length} active positions have been closed at mark price. Collateral restored to cash.`,
            timestamp: Date.now(),
          },
        ]);
      } else {
        const toClose = positions.filter((p) => p.symbol === card.target);
        for (const p of toClose) {
          await closePosition(p.id);
        }
        playOrderExecutedSfx();
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: 'friday',
            text: `✅ Closed active positions for ${card.target}.`,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'friday',
        text: `Telemetry log purged. Ready for your next directives, Boss.`,
        timestamp: Date.now(),
      },
    ]);
  };

  if (!isFridayDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-auto bg-black/40 backdrop-blur-sm animate-fade-in select-none">
      {/* Click outside to close */}
      <div className="flex-1" onClick={() => setIsFridayDrawerOpen(false)} />

      {/* Slide-out HUD Drawer */}
      <div className="w-full sm:w-[480px] md:w-[520px] h-full bg-white/[0.04] backdrop-blur-2xl border-l border-cyan-500/25 shadow-[0_0_50px_rgba(6,182,212,0.18)] flex flex-col relative z-10 animate-slide-in-right overflow-hidden">
        {/* Holographic Header Bar */}
        <div className="px-4 py-3.5 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Arc Reactor Icon */}
            <div className="relative w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-white text-[13px] tracking-wider">F.R.I.D.A.Y.</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold">
                  v3.4 HUD
                </span>
                {/* AI Engine badge */}
                {poweredByGemini === true && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-400/50 text-blue-300 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    GEMINI
                  </span>
                )}
                {poweredByGemini === false && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-semibold">
                    HEURISTIC
                  </span>
                )}
              </div>
              <div className="text-[10px] text-cyan-400/70 font-mono tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                NEURAL CORE SYNCHRONIZED
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Mute/Unmute */}
            <button
              onClick={() => {
                if (!isMuted) stopSpeaking();
                setIsMuted(!isMuted);
              }}
              className={`p-2 rounded-lg border transition-all ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              }`}
              title={isMuted ? 'Unmute F.R.I.D.A.Y. Speech' : 'Mute F.R.I.D.A.Y. Speech'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
              title="Purge Chat Telemetry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Close Drawer */}
            <button
              onClick={() => setIsFridayDrawerOpen(false)}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Voice Activity Equalizer Bar */}
        {(isSpeaking || isListening) && (
          <div className="px-4 py-1.5 bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border-b border-cyan-500/20 flex items-center justify-between animate-pulse text-[11px] font-mono text-cyan-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {isListening ? 'LISTENING TO VOICE DIRECTIVE...' : 'F.R.I.D.A.Y. TRANSMITTING AUDIO RESPONSE...'}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-4 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-2 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
              <span className="w-1 h-4 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '450ms' }} />
              <span className="w-1 h-2 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '600ms' }} />
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
          {messages.map((m) => {
            const isFriday = m.sender === 'friday';
            return (
              <div key={m.id} className={`flex flex-col ${isFriday ? 'items-start' : 'items-end'}`}>
                {/* Sender badge */}
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1 px-1">
                  {isFriday ? 'F.R.I.D.A.Y.' : 'YOU'}
                </span>

                {/* Bubble */}
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-lg ${
                    isFriday
                      ? 'bg-gradient-to-br from-cyan-950/30 via-[#0E1530]/80 to-blue-950/30 border border-cyan-500/30 text-white/90 shadow-[0_4px_20px_rgba(6,182,212,0.1)]'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                  }`}
                >
                  <FormattedMessageText text={m.text} isFriday={isFriday} />

                  {/* Render Action Cards if Present */}
                  {m.actionCard && (
                    <div className="mt-3 pt-3 border-t border-white/[0.1] space-y-2.5 select-text">
                      {/* 1. ORDER INTENT CARD */}
                      {m.actionCard.type === 'order_intent' && (
                        <div className="rounded-xl bg-black/40 border border-cyan-500/40 p-3 shadow-inner">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase ${
                                m.actionCard.side === 'buy'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              {m.actionCard.side === 'buy' ? 'LONG (BUY)' : 'SHORT (SELL)'}
                            </span>
                            <span className="font-mono text-cyan-300 font-bold text-[12px]">{m.actionCard.symbol}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/80 mb-2.5">
                            <div>
                              <span className="text-white/40">Size:</span> {m.actionCard.size}
                            </div>
                            <div>
                              <span className="text-white/40">Leverage:</span> {m.actionCard.leverage}x
                            </div>
                            <div>
                              <span className="text-white/40">Entry Price:</span> ${m.actionCard.price.toLocaleString()}
                            </div>
                            <div>
                              <span className="text-white/40">Req. Margin:</span> ${m.actionCard.reqMargin.toLocaleString()}
                            </div>
                            {m.actionCard.takeProfit && (
                              <div className="text-emerald-400">
                                <span className="text-white/40">TP:</span> ${m.actionCard.takeProfit.toLocaleString()}
                              </div>
                            )}
                            {m.actionCard.stopLoss && (
                              <div className="text-rose-400">
                                <span className="text-white/40">SL:</span> ${m.actionCard.stopLoss.toLocaleString()}
                              </div>
                            )}
                            <div>
                              <span className="text-white/40">Est. Fee:</span> ${m.actionCard.estFee}
                            </div>
                          </div>

                          <button
                            onClick={() => handleExecuteOrderIntent(m.actionCard as any, m.id)}
                            disabled={executingActionId === m.id}
                            className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-[11px] tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{executingActionId === m.id ? 'EXECUTING...' : 'AUTHORIZE & EXECUTE ORDER'}</span>
                          </button>
                        </div>
                      )}

                      {/* 2. CLOSE INTENT CARD */}
                      {m.actionCard.type === 'close_intent' && (
                        <div className="rounded-xl bg-black/40 border border-rose-500/40 p-3 shadow-inner">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-rose-400 font-bold font-mono text-[11px] flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> LIQUIDATE / CLOSE POSITION
                            </span>
                            <span className="font-mono text-white/60 text-[11px]">
                              {m.actionCard.target === 'all' ? 'ALL POSITIONS' : m.actionCard.target}
                            </span>
                          </div>

                          <p className="text-[11px] text-white/70 mb-2">
                            {m.actionCard.target === 'all'
                              ? `Execute market closure of all ${positions.length} active positions immediately.`
                              : `Liquidate active ${m.actionCard.target} exposure at current mark price.`}
                          </p>

                          <button
                            onClick={() => handleExecuteCloseIntent(m.actionCard as any, m.id)}
                            disabled={executingActionId === m.id}
                            className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[11px] tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{executingActionId === m.id ? 'CLOSING...' : 'CONFIRM CLOSURE'}</span>
                          </button>
                        </div>
                      )}

                      {/* 3. RISK AUDIT CARD */}
                      {m.actionCard.type === 'risk_audit' && (
                        <div className="rounded-xl bg-black/40 border border-cyan-500/30 p-3">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="font-mono text-cyan-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5" /> MARGIN RISK AUDIT
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                m.actionCard.status === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                                  : m.actionCard.status === 'ELEVATED'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              }`}
                            >
                              {m.actionCard.status}
                            </span>
                          </div>

                          {/* Progress Meter */}
                          <div className="mb-2">
                            <div className="flex justify-between text-[10px] font-mono mb-1 text-white/60">
                              <span>Margin Capacity Utilization</span>
                              <span className="font-bold text-white">{m.actionCard.marginRatioPercent}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  m.actionCard.marginRatioPercent >= 80
                                    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                    : m.actionCard.marginRatioPercent >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, m.actionCard.marginRatioPercent)}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/70 mb-2">
                            <div>
                              <span className="text-white/40">Cash Collateral:</span> ${m.actionCard.cash.toLocaleString()}
                            </div>
                            <div>
                              <span className="text-white/40">Margin In Use:</span> ${m.actionCard.marginUsed.toLocaleString()}
                            </div>
                            <div>
                              <span className="text-white/40">Avail. Margin:</span> ${m.actionCard.availableMargin.toLocaleString()}
                            </div>
                            <div>
                              <span className="text-white/40">Positions:</span> {m.actionCard.positionsCount}
                            </div>
                          </div>

                          {m.actionCard.status === 'CRITICAL' && (
                            <button
                              onClick={() => setIsDepositOpen(true)}
                              className="w-full mt-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[10px] tracking-wider uppercase transition-all"
                            >
                              INJECT COLLATERAL (DEPOSIT)
                            </button>
                          )}
                        </div>
                      )}

                      {/* 4. MARKET ANALYSIS CARD */}
                      {m.actionCard.type === 'market_analysis' && (() => {
                        const card = m.actionCard;
                        return (
                          <div className="rounded-xl bg-black/40 border border-cyan-500/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-bold text-white text-[12px]">{card.symbol}</div>
                                <div className="text-[10px] text-white/40">{card.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-white text-[12px]">
                                  ${card.price.toLocaleString()}
                                </div>
                                <div
                                  className={`text-[10px] font-mono font-semibold ${
                                    card.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {card.change24h >= 0 ? '+' : ''}
                                  {card.change24h}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-2 p-1.5 rounded bg-white/[0.04] border border-white/[0.06]">
                              <span className="text-[10px] font-mono text-white/50">Model Stance</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  card.signal.bias.includes('BULLISH')
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {card.signal.bias} ({card.signal.confidence}%)
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/70 mb-2.5">
                              <div>
                                <span className="text-white/40">Key Support:</span> ${card.signal.supportLevel.toLocaleString()}
                              </div>
                              <div>
                                <span className="text-white/40">Key Resistance:</span> ${card.signal.resistanceLevel.toLocaleString()}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setActiveSymbol(card.symbol);
                                  setToast(`Active market set to ${card.symbol}`);
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1"
                              >
                                <Activity className="w-3 h-3" /> View Chart
                              </button>
                              <button
                                onClick={() => handleSendMessage(`Stage buy order for ${card.symbol}`)}
                                className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1"
                              >
                                <Zap className="w-3 h-3" /> Stage Trade
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 5. DEPOSIT INTENT CARD */}
                      {m.actionCard.type === 'deposit_intent' && (
                        <div className="rounded-xl bg-black/40 border border-emerald-500/40 p-3 text-center">
                          <div className="text-emerald-400 font-mono font-bold text-[13px] mb-1">
                            +${m.actionCard.amount.toLocaleString()} Collateral Injection
                          </div>
                          <p className="text-[11px] text-white/60 mb-2">Open the collateral deposit dialog to fund account.</p>
                          <button
                            onClick={() => setIsDepositOpen(true)}
                            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider"
                          >
                            Open Deposit Portal
                          </button>
                        </div>
                      )}

                      {/* 6. MARKET SCANNER CARD */}
                      {m.actionCard.type === 'market_scan' && (
                        <div className="rounded-xl bg-black/40 border border-cyan-500/30 p-3 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                            <span className="font-mono text-cyan-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                              <Radar className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                              MARKET SCANNER TELEMETRY
                            </span>
                            <span className="text-[10px] font-mono text-white/40 uppercase">
                              {m.actionCard.filter} feeds
                            </span>
                          </div>

                          {/* Momentum Section */}
                          {m.actionCard.momentum && m.actionCard.momentum.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 uppercase mb-1.5">
                                <TrendingUp className="w-3 h-3" /> Top Momentum Setups
                              </div>
                              <div className="space-y-1.5">
                                {m.actionCard.momentum.map((item) => (
                                  <div
                                    key={item.symbol}
                                    className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-white text-[11px]">{item.symbol}</span>
                                        <span
                                          className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                                            item.change24h >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                          }`}
                                        >
                                          {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-white/40 font-mono truncate">
                                        ${item.price.toLocaleString()} • Sup: ${item.support.toLocaleString()} • Res: ${item.resistance.toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => {
                                          setActiveSymbol(item.symbol);
                                          setToast(`Active market set to ${item.symbol}`);
                                        }}
                                        className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold uppercase transition-all"
                                      >
                                        Chart
                                      </button>
                                      <button
                                        onClick={() => handleSendMessage(`Stage long order for ${item.symbol}`)}
                                        className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase transition-all"
                                      >
                                        Buy
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reversal / Dip-Buy Section */}
                          {m.actionCard.reversal && m.actionCard.reversal.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 uppercase mb-1.5">
                                <Activity className="w-3 h-3" /> Reversal / Dip-Buy Candidates
                              </div>
                              <div className="space-y-1.5">
                                {m.actionCard.reversal.map((item) => (
                                  <div
                                    key={item.symbol}
                                    className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-white text-[11px]">{item.symbol}</span>
                                        <span
                                          className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                                            item.change24h >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                          }`}
                                        >
                                          {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-white/40 font-mono truncate">
                                        ${item.price.toLocaleString()} • Sup: ${item.support.toLocaleString()} • Res: ${item.resistance.toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => {
                                          setActiveSymbol(item.symbol);
                                          setToast(`Active market set to ${item.symbol}`);
                                        }}
                                        className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold uppercase transition-all"
                                      >
                                        Chart
                                      </button>
                                      <button
                                        onClick={() => handleSendMessage(`Stage order for ${item.symbol}`)}
                                        className="px-2 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-mono text-[10px] font-bold uppercase transition-all"
                                      >
                                        Trade
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex flex-col items-start animate-pulse">
              <span className="text-[10px] font-mono text-cyan-400/60 mb-1 px-1">F.R.I.D.A.Y. IS THINKING</span>
              <div className="px-3.5 py-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Interpreting trading directive & parsing order flow...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-3 py-2 border-t border-white/[0.06] bg-black/40 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-[11px]">
          <button
            onClick={() => handleSendMessage('Hi Friday')}
            className="px-2.5 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>👋</span> <span>Hi Friday</span>
          </button>
          <button
            onClick={() => handleSendMessage(`Analyze ${activeMarket.symbol}`)}
            className="px-2.5 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/40 text-blue-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>📊</span> <span>Analyze {activeMarket.symbol}</span>
          </button>
          <button
            onClick={() => handleSendMessage('Scan the market for best opportunities')}
            className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>💡</span> <span>Scan Opportunities</span>
          </button>
          <button
            onClick={() => handleSendMessage('Explain RSI and EMA indicators')}
            className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>📈</span> <span>Explain RSI & EMA</span>
          </button>
          <button
            onClick={() => handleSendMessage('How should I size my position with the 1% risk rule?')}
            className="px-2.5 py-1 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>🎯</span> <span>1% Risk Rule Math</span>
          </button>
          <button
            onClick={() => handleSendMessage('Audit Portfolio Risk')}
            className="px-2.5 py-1 rounded-full bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>🛡️</span> <span>Audit Risk</span>
          </button>
          <button
            onClick={() => handleSendMessage(`Buy 0.25 ${activeMarket.symbol} with 5x leverage TP ${(activeMarket.price * 1.05).toFixed(activeMarket.precision)} SL ${(activeMarket.price * 0.97).toFixed(activeMarket.precision)}`)}
            className="px-2.5 py-1 rounded-full bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-400/40 text-cyan-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>⚡</span> <span>Bracket Order {activeMarket.symbol.split('/')[0]}</span>
          </button>
          <button
            onClick={() => handleSendMessage('Close all positions')}
            className="px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-200 shrink-0 transition-all font-mono font-medium flex items-center gap-1 hover:scale-105"
          >
            <span>🛑</span> <span>Close All</span>
          </button>
        </div>

        {/* Command Input Bar */}
        <div className="p-3.5 border-t border-cyan-500/20 bg-gradient-to-b from-black/50 to-black/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                isListening
                  ? 'bg-rose-500/30 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
              }`}
              title={isListening ? 'Stop Listening' : 'Voice Command F.R.I.D.A.Y.'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Input field */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening to voice...' : "Command F.R.I.D.A.Y. (e.g. 'Long 0.5 BTC 10x TP 72k')"}
                disabled={isProcessing}
                className="w-full bg-white/[0.05] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition-all disabled:opacity-40 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Tip Footer */}
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-white/30 px-1">
            <span>Press Ctrl+J to toggle HUD</span>
            <span>Natural language order routing active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
