import React, { useState, useMemo } from 'react';
import { useTrading } from '@/context/TradingContext';
import {
  X,
  CreditCard,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Camera,
  Copy,
  Check,
  Fingerprint,
} from 'lucide-react';
import { generateQrSvgPath } from '@/utils/qrGenerator';
import { QrScannerModal } from './QrScannerModal';
import { FraudShieldHUD, FraudReport } from './FraudShieldHUD';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

type CryptoNetwork = 'USDT_TRC20' | 'USDC_ERC20' | 'SOL' | 'BTC' | 'UPI_SCAN';

interface NetworkConfig {
  id: CryptoNetwork;
  name: string;
  badge: string;
  depositAddress: string;
  feeEstimate: string;
}

const NETWORKS: Record<CryptoNetwork, NetworkConfig> = {
  USDT_TRC20: {
    id: 'USDT_TRC20',
    name: 'Tether (TRC-20)',
    badge: 'Fast & Low Fee',
    depositAddress: 'TX9aApogeeOfficialTradingVaultTRC20',
    feeEstimate: '~$1.00 Network Gas',
  },
  USDC_ERC20: {
    id: 'USDC_ERC20',
    name: 'USD Coin (ERC-20)',
    badge: 'Ethereum Mainnet',
    depositAddress: '0x28C6c06298d514Db089934071355E5743bf21d60',
    feeEstimate: '~$2.40 Network Gas',
  },
  SOL: {
    id: 'SOL',
    name: 'Solana (SPL)',
    badge: 'Instant Finality',
    depositAddress: 'ApogeeSolVault9999999999999999999999999999999',
    feeEstimate: '< $0.01 Network Gas',
  },
  BTC: {
    id: 'BTC',
    name: 'Bitcoin (SegWit)',
    badge: 'Native L1',
    depositAddress: 'bc1qapogeeinstitutionalsettlementvault2026',
    feeEstimate: '~$1.80 Network Gas',
  },
  UPI_SCAN: {
    id: 'UPI_SCAN',
    name: 'Instant Scan & Pay',
    badge: 'UPI / QR Rail',
    depositAddress: 'apogeepay@institutionalbank',
    feeEstimate: 'Zero Fee',
  },
};

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { balance, depositFunds, withdrawFunds } = useTrading();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<number>(10000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('10000');
  const [paymentMethod, setPaymentMethod] = useState<'crypto_qr' | 'card' | 'applepay'>('crypto_qr');
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('USDT_TRC20');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Copy address state
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Withdrawal Recipient & QR Scanner
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Fraud & AML Shield States
  const [isScanningFraud, setIsScanningFraud] = useState<boolean>(false);
  const [fraudReport, setFraudReport] = useState<FraudReport | null>(null);

  // Mock Card state
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Auto-format card input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setCardExpiry(formatted);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4));
  };

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmountStr(String(val));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmountStr(raw);
    const num = parseFloat(raw);
    setAmount(!isNaN(num) && num > 0 ? num : 0);
  };

  // Generate QR payload for dynamic deposit
  const currentNetworkConfig = NETWORKS[selectedNetwork];
  const qrPayload = useMemo(() => {
    if (selectedNetwork === 'UPI_SCAN') {
      return `upi://pay?pa=${currentNetworkConfig.depositAddress}&pn=Apogee%20Terminal&am=${amount}&cu=USD`;
    }
    return `${selectedNetwork.toLowerCase()}:${currentNetworkConfig.depositAddress}?amount=${amount}&ref=FRIDAY_AUTO_CREDIT`;
  }, [selectedNetwork, currentNetworkConfig.depositAddress, amount]);

  const qrSvg = useMemo(() => {
    return generateQrSvgPath(qrPayload, 25);
  }, [qrPayload]);

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(currentNetworkConfig.depositAddress);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Run Fraud Check against backend API
  const runFraudCheck = async (addrToVerify: string) => {
    if (!addrToVerify.trim()) return;
    setIsScanningFraud(true);
    setFraudReport(null);

    try {
      const res = await fetch('/api/payments/verify-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountOrAddress: addrToVerify.trim(),
          rail: mode === 'withdraw' ? 'crypto' : 'crypto',
          network: selectedNetwork,
          amount,
        }),
      });

      const report: FraudReport = await res.json();
      setFraudReport(report);
    } catch (err) {
      console.error('Fraud verification failed:', err);
    } finally {
      setIsScanningFraud(false);
    }
  };

  // Callback when user completes scan in QrScannerModal
  const handleScanComplete = (scannedAddr: string) => {
    setRecipientAddress(scannedAddr);
    runFraudCheck(scannedAddr);
  };

  // Audit Apogee receiving vault
  const handleAuditReceivingVault = () => {
    runFraudCheck(currentNetworkConfig.depositAddress);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    // If withdrawing without fraud check, run check first
    if (mode === 'withdraw' && recipientAddress && !fraudReport) {
      await runFraudCheck(recipientAddress);
      return;
    }

    if (mode === 'withdraw' && fraudReport?.isBlocked) {
      return; // Blocked by fraud shield
    }

    setIsProcessing(true);
    setSuccessMessage(null);

    await new Promise((r) => setTimeout(r, 1200));

    let ok = false;
    if (mode === 'deposit') {
      ok = await depositFunds(amount, paymentMethod);
      if (ok) {
        setSuccessMessage(`+$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} credited instantly to trading capital!`);
      }
    } else {
      ok = await withdrawFunds(amount, paymentMethod);
      if (ok) {
        setSuccessMessage(`-$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} settled to counterparty address!`);
      }
    }

    setIsProcessing(false);

    if (ok) {
      setTimeout(() => {
        setSuccessMessage(null);
        setFraudReport(null);
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  const newProjectedBalance = mode === 'deposit' ? balance + amount : Math.max(0, balance - amount);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-opacity animate-fade-in"
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-[560px] max-h-[92vh] overflow-y-auto bg-[#070A1A]/95 backdrop-blur-[35px] border border-white/[0.16] rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/10 z-10 animate-fade-scale">
          {/* Top Laser Accent */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08] pr-10">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg ${
                mode === 'deposit'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-cyan-500/10'
              }`}
            >
              {mode === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-white font-bold text-[17px] tracking-tight flex items-center gap-2">
                <span>{mode === 'deposit' ? 'Deposit Trading Capital' : 'Withdraw Cash Funds'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  F.R.I.D.A.Y. AML Shield
                </span>
              </h3>
              <p className="text-white/40 text-[11px] font-mono">
                AVAILABLE CASH: <span className="text-emerald-400 font-semibold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          {/* Deposit / Withdraw Tabs */}
          <div className="flex bg-black/40 border border-white/[0.1] rounded-xl p-1 my-4">
            <button
              onClick={() => {
                setMode('deposit');
                setSuccessMessage(null);
                setFraudReport(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'deposit'
                  ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposit Funds</span>
            </button>
            <button
              onClick={() => {
                setMode('withdraw');
                setSuccessMessage(null);
                setFraudReport(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'withdraw'
                  ? 'bg-cyan-600/90 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw with QR Scan</span>
            </button>
          </div>

          {successMessage ? (
            /* Success Screen */
            <div className="py-10 flex flex-col items-center justify-center text-center animate-fade-scale">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
              <h4 className="text-white font-bold text-xl mb-1">Transaction Confirmed!</h4>
              <p className="text-white/60 text-sm font-mono mb-4">{successMessage}</p>
              <div className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white/80 font-mono text-sm">
                New Available Cash:{' '}
                <span className="text-emerald-400 font-bold">
                  ${newProjectedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Quick Amount Presets */}
              <div>
                <label className="block text-white/60 text-[11px] font-semibold uppercase tracking-wider mb-1.5 font-mono">
                  Select Amount
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectPreset(val)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-mono font-semibold transition-all border ${
                        amount === val
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      +${(val / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono font-bold text-lg">
                    $
                  </span>
                  <input
                    type="text"
                    value={customAmountStr}
                    onChange={handleCustomChange}
                    placeholder="10,000"
                    className="w-full bg-black/40 border border-white/[0.16] rounded-xl pl-9 pr-4 py-2.5 text-white font-mono font-bold text-lg outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              </div>

              {/* ─── DEPOSIT MODE: PAYMENT CHANNELS & DYNAMIC QR ─── */}
              {mode === 'deposit' && (
                <>
                  <div>
                    <label className="block text-white/60 text-[11px] font-semibold uppercase tracking-wider mb-1.5 font-mono">
                      Payment Channel
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'crypto_qr', label: 'QR Scan to Pay', icon: QrCode },
                        { id: 'card', label: 'Credit Card', icon: CreditCard },
                        { id: 'applepay', label: 'Apple Pay', icon: Smartphone },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = paymentMethod === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPaymentMethod(item.id as any)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                                : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-white/40'}`} />
                            <span className="text-[11px] font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR SCAN CHANNEL VIEW */}
                  {paymentMethod === 'crypto_qr' && (
                    <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 flex flex-col gap-3">
                      {/* Network Selector */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-1.5">
                          <span>SELECT NETWORK</span>
                          <span className="text-cyan-400 font-semibold">{currentNetworkConfig.feeEstimate}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                          {(Object.keys(NETWORKS) as CryptoNetwork[]).map((netKey) => {
                            const net = NETWORKS[netKey];
                            const isNetActive = selectedNetwork === netKey;
                            return (
                              <button
                                key={netKey}
                                type="button"
                                onClick={() => setSelectedNetwork(netKey)}
                                className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-semibold transition-all border truncate ${
                                  isNetActive
                                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm'
                                    : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white'
                                }`}
                              >
                                {net.name.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Vector QR Code Display */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/50 p-3.5 rounded-xl border border-white/[0.08]">
                        <div className="relative p-2 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg">
                          <svg
                            viewBox={`0 0 ${qrSvg.totalSize} ${qrSvg.totalSize}`}
                            className="w-28 h-28"
                            shapeRendering="crispEdges"
                          >
                            <path d={qrSvg.path} fill="#070A1A" />
                          </svg>
                          <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-xl pointer-events-none" />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-white/50 uppercase">
                              Deposit Vault Address
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              Auto-Crediting
                            </span>
                          </div>

                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                            <span className="font-mono text-cyan-300 text-xs truncate select-all flex-1">
                              {currentNetworkConfig.depositAddress}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyAddress}
                              className="p-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition-colors shrink-0"
                              title="Copy Address"
                            >
                              {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-mono mt-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Scan with Mobile Banking or Crypto Wallet to fund.</span>
                          </div>
                        </div>
                      </div>

                      {/* Audit Vault Trigger */}
                      <button
                        type="button"
                        onClick={handleAuditReceivingVault}
                        className="text-[11px] font-mono text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center gap-1 py-1 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify Apogee Vault AML Integrity with F.R.I.D.A.Y. →</span>
                      </button>
                    </div>
                  )}

                  {/* CREDIT CARD FORM */}
                  {paymentMethod === 'card' && (
                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.08] flex flex-col gap-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-white/40">
                        <span>Card Number</span>
                        <span className="text-cyan-400 font-bold">VISA / MASTERCARD</span>
                      </div>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white font-mono outline-none tracking-widest"
                      />
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <span className="text-white/40 block text-[10px]">Expires</span>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            maxLength={5}
                            placeholder="MM/YY"
                            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white font-mono outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-white/40 block text-[10px]">CVC</span>
                          <input
                            type="text"
                            value={cardCvc}
                            onChange={handleCvcChange}
                            maxLength={4}
                            placeholder="CVC"
                            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white font-mono outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* APPLE PAY FORM */}
                  {paymentMethod === 'applepay' && (
                    <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] text-center text-xs font-mono">
                      <div className="flex items-center justify-center gap-2 text-white font-semibold text-sm mb-1">
                        <span> Apple Pay Instant Checkout</span>
                      </div>
                      <p className="text-white/40">Touch ID or Face ID will authorize this payment instantly.</p>
                    </div>
                  )}
                </>
              )}

              {/* ─── WITHDRAWAL MODE: QR SCANNER & FRAUD AUDIT ─── */}
              {mode === 'withdraw' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-white/60 text-[11px] font-semibold uppercase tracking-wider font-mono">
                        Recipient Destination Wallet / Account
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 transition-all hover:scale-105 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Scan Recipient QR</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => {
                          setRecipientAddress(e.target.value);
                          setFraudReport(null);
                        }}
                        placeholder="Scan or enter 0x... / TRC20 / VPA recipient"
                        className="w-full bg-black/40 border border-white/[0.16] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                      />
                    </div>
                  </div>

                  {/* Manual trigger to scan fraud if user typed address */}
                  {recipientAddress && !fraudReport && !isScanningFraud && (
                    <button
                      type="button"
                      onClick={() => runFraudCheck(recipientAddress)}
                      className="w-full py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Fingerprint className="w-4 h-4" />
                      Run F.R.I.D.A.Y. Anti-Fraud Audit on Recipient Address →
                    </button>
                  )}
                </div>
              )}

              {/* Render F.R.I.D.A.Y. Fraud Shield HUD if report or scanning active */}
              {(isScanningFraud || fraudReport) && (
                <FraudShieldHUD
                  report={fraudReport}
                  isScanning={isScanningFraud}
                  onConfirm={
                    mode === 'withdraw'
                      ? () => {
                          // Trigger deposit/withdraw
                          const fakeEvent = { preventDefault: () => {} } as any;
                          handleSubmit(fakeEvent);
                        }
                      : undefined
                  }
                  onCancel={() => {
                    setFraudReport(null);
                    setRecipientAddress('');
                  }}
                  confirmLabel={mode === 'withdraw' ? 'Authorize & Settle Withdrawal' : 'Acknowledge Audit'}
                />
              )}

              {/* Action Submit Button (Hidden if Fraud Shield is displaying its own confirm button) */}
              {!fraudReport && (
                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    amount <= 0 ||
                    (mode === 'withdraw' && amount > balance) ||
                    (mode === 'withdraw' && !recipientAddress.trim())
                  }
                  className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    mode === 'deposit'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/40 shadow-cyan-500/25'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Processing {mode === 'deposit' ? 'Deposit' : 'Withdrawal'}...</span>
                    </>
                  ) : mode === 'deposit' ? (
                    `Complete Deposit of $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} →`
                  ) : (
                    `Verify Recipient & Withdraw $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} →`
                  )}
                </button>
              )}

              {/* Security Seal */}
              <div className="flex items-center justify-center gap-1.5 text-white/30 text-[10px] mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400/70" />
                <span>256-bit TLS Encrypted • OFAC Verified • F.R.I.D.A.Y. Neural Fraud Interceptor</span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Holographic QR Scanner Viewport Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};
