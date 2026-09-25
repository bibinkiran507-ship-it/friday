import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
  Volume2,
  VolumeX,
  Lock,
  Flame,
  Fingerprint,
} from 'lucide-react';
import { playFraudAlertSiren, playVerifiedChime, speakFriday, stopSpeaking } from '@/utils/speechAndAudio';

export interface FraudCheckItem {
  id: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface FraudReport {
  accountOrAddress: string;
  rail: string;
  network?: string;
  amount?: number;
  riskScore: number;
  riskLevel: 'clean' | 'low' | 'moderate' | 'high' | 'critical_fraud';
  isBlocked: boolean;
  status: 'APPROVED' | 'CAUTION' | 'BLOCKED_FRAUD';
  classification: string;
  checks: FraudCheckItem[];
  flags: string[];
  fridayVerdict: string;
  sanctionsListMatched: boolean;
  darknetTaintScore: number;
  entityName?: string;
  verificationHash: string;
  timestamp: number;
}

interface FraudShieldHUDProps {
  report: FraudReport | null;
  isScanning: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
}

export const FraudShieldHUD: React.FC<FraudShieldHUDProps> = ({
  report,
  isScanning,
  onConfirm,
  onCancel,
  confirmLabel = 'Authorize & Settle Funds',
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  // Scanning progression animation
  useEffect(() => {
    if (isScanning) {
      setScanStep(0);
      const t1 = setTimeout(() => setScanStep(1), 350);
      const t2 = setTimeout(() => setScanStep(2), 750);
      const t3 = setTimeout(() => setScanStep(3), 1150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isScanning]);

  // Audio trigger on report arrival
  useEffect(() => {
    if (report && !isScanning) {
      if (report.isBlocked) {
        playFraudAlertSiren();
      } else {
        playVerifiedChime();
      }
    }
  }, [report, isScanning]);

  const handleToggleVoice = () => {
    if (!report) return;
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakFriday(report.fridayVerdict, {
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  if (isScanning) {
    return (
      <div className="p-5 rounded-2xl bg-black/60 border border-cyan-500/40 relative overflow-hidden backdrop-blur-xl animate-fade-scale text-center">
        {/* Holographic scanning laser */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-cyan-400/20 to-transparent animate-pulse pointer-events-none" />
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 relative shadow-[0_0_30px_rgba(6,182,212,0.4)]">
          <Fingerprint className="w-8 h-8 animate-pulse" />
          <span className="absolute -inset-1 rounded-2xl border border-dashed border-cyan-400/60 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        <h4 className="text-cyan-300 font-mono font-bold text-sm tracking-widest uppercase mb-1">
          F.R.I.D.A.Y. Neural Fraud Audit
        </h4>
        <p className="text-white/60 text-xs font-mono mb-4">
          Conducting Deep Chainalysis & Global Sanctions Verification...
        </p>

        {/* Step Indicator */}
        <div className="space-y-2 text-left max-w-[340px] mx-auto text-xs font-mono">
          {[
            'Querying OFAC, Interpol & EU Sanctions List',
            'Tracing Illicit Mixers & Darknet Taint Flow',
            'Evaluating Velocity & Phishing Signatures',
          ].map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 transition-all duration-300 ${
                scanStep >= idx ? 'text-cyan-300 opacity-100' : 'text-white/20 opacity-50'
              }`}
            >
              {scanStep > idx ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : scanStep === idx ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
              )}
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const isBlocked = report.isBlocked;
  const isCaution = report.riskScore >= 25 && !isBlocked;

  // Colors
  const accentBorder = isBlocked
    ? 'border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.35)]'
    : isCaution
    ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
    : 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]';

  const badgeBg = isBlocked
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
    : isCaution
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';

  const riskStroke = isBlocked ? '#F43F5E' : isCaution ? '#F59E0B' : '#10B981';

  // SVG Gauge calculations
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (report.riskScore / 100) * circumference;

  return (
    <div className={`p-5 rounded-2xl bg-[#090D22]/90 border ${accentBorder} backdrop-blur-2xl relative overflow-hidden animate-fade-scale transition-all select-none`}>
      {/* Top Banner Alert */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${badgeBg}`}>
            {isBlocked ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
            ) : isCaution ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeBg} uppercase`}>
                {isBlocked ? 'THREAT DETECTED • BLOCKED' : isCaution ? 'CAUTION ADVISED' : 'CLEAN & AUDITED'}
              </span>
              <span className="text-white/40 text-[10px] font-mono">
                AML Engine v3.4
              </span>
            </div>
            <h4 className="text-white font-bold text-[14px] mt-0.5 tracking-tight">
              {report.entityName || (isBlocked ? 'Blacklisted Counterparty Identified' : 'Verified Counterparty Destination')}
            </h4>
          </div>
        </div>

        {/* Circular Risk Score Gauge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                className="text-white/10"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={riskStroke}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[14px] font-mono font-bold text-white leading-none">
                {report.riskScore}
              </span>
              <span className="text-[8px] font-mono text-white/50 uppercase">
                Risk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* F.R.I.D.A.Y. Verdict Persona Box */}
      <div className="my-3.5 p-3.5 rounded-xl bg-black/40 border border-white/[0.08] relative">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-mono font-bold text-[11px] uppercase tracking-wider">
              F.R.I.D.A.Y. Security Verdict
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleVoice}
            className="flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Read verdict aloud"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3 h-3 text-rose-400 animate-pulse" />
                <span className="text-rose-400">Stop Voice</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-cyan-400" />
                <span>Hear Verdict</span>
              </>
            )}
          </button>
        </div>
        <p className="text-white/85 text-[12px] leading-relaxed font-sans">
          {report.fridayVerdict}
        </p>

        {report.flags.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
            {report.flags.map((flag, fIdx) => (
              <span
                key={fIdx}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1"
              >
                <Flame className="w-2.5 h-2.5 text-rose-400" />
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Security Checks Matrix */}
      <div className="space-y-1.5 mb-4">
        {report.checks.map((chk) => (
          <div
            key={chk.id}
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5 text-[11px] font-mono"
          >
            {chk.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {chk.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {chk.status === 'fail' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white/90">{chk.name}</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                    chk.status === 'pass'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : chk.status === 'warn'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {chk.status}
                </span>
              </div>
              <p className="text-white/50 text-[10px] mt-0.5 leading-tight">{chk.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cryptographic Proof Receipt */}
      <div className="flex items-center justify-between text-[10px] font-mono text-white/40 mb-4 px-1">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-400" />
          Audit Hash: {report.verificationHash.slice(0, 14)}...
        </span>
        <span>Chainalysis & OFAC Synchronized</span>
      </div>

      {/* Interactive Action Buttons */}
      <div className="flex items-center gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white font-mono text-xs font-semibold transition-all border border-white/10"
          >
            {isBlocked ? 'Abort Transaction' : 'Back / Re-scan'}
          </button>
        )}

        {isBlocked ? (
          <button
            type="button"
            disabled
            className="flex-1 py-2.5 rounded-xl bg-rose-600/30 text-rose-300/80 font-mono text-xs font-bold border border-rose-500/30 cursor-not-allowed flex items-center justify-center gap-1.5"
            title="Transfer permanently disabled due to fraud detection"
          >
            <Lock className="w-3.5 h-3.5" />
            Transfer Blocked by AI Guard
          </button>
        ) : (
          onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-500/25 border border-emerald-400/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {confirmLabel}
            </button>
          )
        )}
      </div>
    </div>
  );
};
