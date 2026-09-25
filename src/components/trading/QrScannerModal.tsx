import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Zap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { playRadarChirp } from '@/utils/speechAndAudio';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (scannedAddress: string, network?: string) => void;
}

interface TestPreset {
  id: string;
  name: string;
  address: string;
  network: string;
  type: 'clean' | 'fraud' | 'sanctioned';
  desc: string;
}

const TEST_PRESETS: TestPreset[] = [
  {
    id: 'binance-clean',
    name: 'Binance Tier-1 Custody Vault',
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    network: 'ETH (ERC-20)',
    type: 'clean',
    desc: 'Audited institutional exchange cold reserve (Clean - Expected Risk < 10)',
  },
  {
    id: 'apogee-clean',
    name: 'Apogee System Reserve Vault',
    address: 'TX9aApogeeOfficialTradingVaultTRC20',
    network: 'USDT (TRC-20)',
    type: 'clean',
    desc: 'Whitelisted Apogee multi-sig reserve (Clean - Expected Risk < 5)',
  },
  {
    id: 'tornado-mixer',
    name: 'Tornado.Cash Illicit Mixer',
    address: '0x8576aCC5C05D6Ce88f4e49bf65bdf0C62F91353C',
    network: 'ETH (ERC-20)',
    type: 'sanctioned',
    desc: 'OFAC Sanctioned mixing contract (Fraud - Expected Risk 98/100)',
  },
  {
    id: 'phishing-drainer',
    name: 'Inferno Phishing Drainer Contract',
    address: '0x72a5843cc08275C80f1AEdC000b847Db8eb88584',
    network: 'ETH (ERC-20)',
    type: 'fraud',
    desc: 'Malicious Permit2 phishing drainer (Fraud - Expected Risk 96/100)',
  },
  {
    id: 'scam-darknet',
    name: 'Darknet Vendor Launder Pool',
    address: 'TFRAUD9999999999999999999999999999999',
    network: 'USDT (TRC-20)',
    type: 'fraud',
    desc: 'Chainalysis blacklisted narcotics & ransomware pool (Fraud - Expected Risk 94/100)',
  },
];

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream when open in camera tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;

    async function startCamera() {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported in this browser environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        // Camera connected — clear any previous error
        setCameraError(null);
      } catch (err: any) {
        if (!isMounted) return;
        setCameraError(err?.message || 'Unable to access video camera.');
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleSelectPreset = (preset: TestPreset) => {
    playRadarChirp();
    setIsSimulatingScan(true);
    setTimeout(() => {
      setIsSimulatingScan(false);
      onScanComplete(preset.address, preset.network);
      onClose();
    }, 500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    playRadarChirp();
    onScanComplete(manualInput.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity animate-fade-in"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-[540px] bg-[#070A1C]/90 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_60px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30 z-10 animate-fade-scale">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08] pr-8">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-[17px] tracking-tight flex items-center gap-2">
              <span>Holographic QR Scanner</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                F.R.I.D.A.Y. HUD
              </span>
            </h3>
            <p className="text-white/40 text-[11px] font-mono">
              REAL-TIME OPTICAL SCANNING & AML REPUTATION CHECK
            </p>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="flex bg-black/40 border border-white/[0.1] rounded-xl p-1 my-4">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'bg-cyan-600/80 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Optical Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-cyan-600/80 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Presets (Clean vs Fraud)</span>
          </button>
        </div>

        {/* TAB 1: OPTICAL CAMERA SCANNER */}
        {activeTab === 'camera' && (
          <div className="flex flex-col items-center">
            <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black/60 border border-cyan-500/30 flex items-center justify-center">
              {/* Camera Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Holographic Scanner Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Targeting HUD Reticle */}
                <div className="relative w-44 h-44 rounded-2xl border-2 border-dashed border-cyan-400/60 flex items-center justify-center">
                  {/* Corner brackets */}
                  <div className="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

                  {/* Laser Scan line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06B6D4] animate-pulse" />
                </div>
              </div>

              {/* Error or Fallback Message if camera disabled */}
              {cameraError && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                  <h4 className="text-white font-bold text-sm mb-1">Camera Stream Inactive</h4>
                  <p className="text-white/50 text-xs mb-3 max-w-xs">
                    {cameraError}. You can switch to the <strong>Test Presets</strong> tab to test live fraud interception or paste an address below.
                  </p>
                  <button
                    onClick={() => setActiveTab('presets')}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Load Fraud & Clean Test Presets →
                  </button>
                </div>
              )}
            </div>

            <p className="text-white/40 text-[11px] font-mono mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Point camera at any QR code to extract recipient credentials automatically.
            </p>
          </div>
        )}

        {/* TAB 2: TEST PRESETS (CLEAN VS FRAUDULENT) */}
        {activeTab === 'presets' && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <p className="text-white/60 text-xs font-mono mb-2">
              Select a simulated payload to test F.R.I.D.A.Y.'s live fraud and AML interception:
            </p>
            {TEST_PRESETS.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start gap-3 ${
                  p.type === 'clean'
                    ? 'bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 hover:border-emerald-400/50'
                    : 'bg-rose-500/5 hover:bg-rose-500/15 border-rose-500/20 hover:border-rose-400/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    p.type === 'clean'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {p.type === 'clean' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-xs group-hover:text-cyan-300 transition-colors">
                      {p.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                        p.type === 'clean'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {p.type === 'clean' ? 'Safe / Audited' : 'Blacklist / Sanctioned'}
                    </span>
                  </div>
                  <p className="text-white/50 text-[11px] mt-0.5">{p.desc}</p>
                  <span className="text-cyan-400/70 font-mono text-[10px] block truncate mt-1">
                    {p.address}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual Paste Address Bar */}
        <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-white/[0.08]">
          <label className="block text-white/50 text-[11px] font-mono uppercase tracking-wider mb-1.5">
            Or Paste Destination Address / UPI / QR String
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste 0x... / TRC20 / VPA to scan"
                className="w-full bg-black/50 border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!manualInput.trim() || isSimulatingScan}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
