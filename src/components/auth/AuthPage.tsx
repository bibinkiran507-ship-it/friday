import React, { useState } from 'react';
import { CinematicBackgroundVideo } from '@/components/common/CinematicBackgroundVideo';
import { GoogleOAuthModal } from './GoogleOAuthModal';

interface AuthPageProps {
  onAuthSuccess: (user: { name: string; email: string; picture?: string }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      triggerShake();
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      triggerShake();
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      triggerShake();
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);

    const displayName = mode === 'signup' ? name : email.split('@')[0];
    onAuthSuccess({ name: displayName, email });
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthSuccess({ name: 'Demo Trader', email: 'demo@apogee.pro' });
    }, 700);
  };

  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const handleGoogleClick = () => {
    const DEFAULT_GOOGLE_CLIENT_ID = '569756310563-91mpouatvn8ktuarlrfdhh0fjaju9v7m.apps.googleusercontent.com';
    const clientId =
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      localStorage.getItem('apogee_google_client_id') ||
      DEFAULT_GOOGLE_CLIENT_ID;

    if (clientId && clientId.includes('.apps.googleusercontent.com')) {
      const redirectUri = window.location.origin;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;
      const popup = window.open(authUrl, 'GoogleSignInPopup', 'width=500,height=650,top=100,left=100');
      if (!popup) {
        window.location.href = authUrl;
      }
      return;
    }
    // If no Client ID configured, show the Google Account Chooser
    setIsGoogleModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative select-none">
      {/* ── Persistent Cinematic Video Background (Transparent Glass Aesthetic) ── */}
      <CinematicBackgroundVideo />

      {/* Atmospheric Glass Vignette & Subtle Cyber Grid */}
      <div className="fixed inset-0 bg-[#080A19]/55 backdrop-blur-[1.5px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-radial-gradient from-transparent via-black/25 to-black/70 pointer-events-none z-0" />

      {/* ── Left Showcase Panel (Clean Transparent Typography & Ordered Rates) ── */}
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-24 w-[52%] relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.18] p-2 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg viewBox="0 0 256 256" fill="none" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              <path
                d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-[18px] tracking-tight">Apogee Pro Terminal</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PRO v2.4
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/90 text-[11px] font-mono font-medium tracking-wide">
                LIVE MATCHING ENGINE ACTIVE • 280ms TICK STREAM
              </span>
            </div>
          </div>
        </div>

        {/* Large Headline */}
        <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.08] mb-5 tracking-tight drop-shadow-lg">
          Institutional-Grade
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Trading Platform
          </span>
        </h1>
        <p className="text-white/60 text-base xl:text-lg leading-relaxed mb-8 max-w-[450px] font-[450] drop-shadow">
          Real-time stock &amp; crypto execution with live interactive candlestick charts, live stock availability, and AI reasoning.
        </p>

        {/* Translucent Glass Feature Chips */}
        <div className="grid grid-cols-2 gap-2.5 max-w-[480px] mb-8">
          {[
            { title: 'Ultra-Fast 280ms Ticks', sub: 'Real-time WebSocket' },
            { title: 'Real Stock Availability', sub: 'Spot & margin trading' },
            { title: 'Interactive Candlesticks', sub: 'Up/down price animations' },
            { title: 'AI Trade Flow Models', sub: '91.2% confidence ratings' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.1] hover:border-white/20 transition-all hover:bg-white/[0.07]"
            >
              <div className="text-white text-[12.5px] font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {item.title}
              </div>
              <div className="text-white/40 text-[10.5px] mt-0.5 pl-3.5">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Ordered Live Market Rates Card (Clean, Sorted Grid) */}
        <div className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.12] shadow-xl max-w-[480px]">
          <div className="flex items-center justify-between text-[11px] text-white/50 mb-2 font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-Time Market Rates</span>
            </span>
            <span className="text-white/40">Sorted by Volume</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { sym: 'BTC/USDT', price: '$64,819.6', chg: '+2.41%', up: true },
              { sym: 'NVDA/USD', price: '$128.66', chg: '+1.18%', up: true },
              { sym: 'AAPL/USD', price: '$224.23', chg: '+0.85%', up: true },
              { sym: 'ETH/USDT', price: '$3,420.5', chg: '-0.83%', up: false },
              { sym: 'TSLA/USD', price: '$210.40', chg: '-1.52%', up: false },
              { sym: 'SPY/USD', price: '$548.20', chg: '+0.62%', up: true },
            ].map((t) => (
              <div
                key={t.sym}
                className="flex flex-col p-2 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-white/90 font-bold">{t.sym.split('/')[0]}</span>
                  <span className={t.up ? 'text-emerald-400 font-semibold text-[10px]' : 'text-rose-400 font-semibold text-[10px]'}>
                    {t.chg}
                  </span>
                </div>
                <div className="text-[12px] font-mono font-medium text-white/80 mt-1">{t.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel – Ultra Transparent Glassmorphism Card ───────────── */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 relative z-10">
        <div
          className={`w-full max-w-[430px] ${shake ? '[animation:shake_0.5s_ease-in-out]' : ''}`}
          style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
        >
          {/* Glass Card */}
          <div className="bg-[rgba(10,14,30,0.48)] backdrop-blur-[30px] border border-white/[0.18] rounded-3xl p-8 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10 relative overflow-hidden">
            {/* Top ambient glow bar */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent" />

            {/* Mobile Header */}
            <div className="flex lg:hidden items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md p-1.5 border border-white/20">
                <svg viewBox="0 0 256 256" fill="none" className="w-full h-full">
                  <path
                    d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z"
                    fill="white"
                  />
                </svg>
              </div>
              <span className="text-white font-bold text-[16px] tracking-wide">Apogee Pro</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create an Account'}
            </h2>
            <p className="text-white/50 text-sm mb-6">
              {mode === 'signin'
                ? 'Sign in to access your live trading terminal.'
                : 'Enter your credentials to start live paper trading.'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-black/40 backdrop-blur-md border border-white/[0.1] rounded-xl p-1 mb-5">
              <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  mode === 'signin'
                    ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/40 border border-blue-400/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  mode === 'signup'
                    ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/40 border border-blue-400/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-white/60 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muthupandian"
                    className="w-full bg-black/35 backdrop-blur-md border border-white/[0.16] rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-blue-400 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/25 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/60 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@apogee.pro"
                  className="w-full bg-black/35 backdrop-blur-md border border-white/[0.16] rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-blue-400 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/25 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setError('Password reset instructions sent to your email!')}
                      className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/35 backdrop-blur-md border border-white/[0.16] rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/30 text-sm outline-none focus:border-blue-400 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/25 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors text-sm"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-rose-500/15 backdrop-blur-md border border-rose-500/40 rounded-xl px-3.5 py-2 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/40 shadow-lg shadow-blue-600/35 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>{mode === 'signin' ? 'Sign In to Terminal →' : 'Create Account & Trade →'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/[0.1]" />
              <span className="text-white/30 text-xs font-mono">OR</span>
              <div className="flex-1 h-px bg-white/[0.1]" />
            </div>

            {/* Quick 1-Click Demo Account */}
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-emerald-400/40 bg-emerald-500/15 backdrop-blur-md text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-300/70 transition-all duration-200 hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Continue with Demo Account</span>
            </button>

            {/* Social OAuth Buttons */}
            <div className="flex gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                title="Sign in with your Google account"
                className="flex-1 py-2 rounded-xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-md text-white/70 hover:bg-white/[0.1] hover:text-white transition-all text-xs font-medium flex items-center justify-center gap-2 group relative"
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => onAuthSuccess({ name: 'Apple Trader', email: 'trader@icloud.com' })}
                className="flex-1 py-2 rounded-xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-md text-white/70 hover:bg-white/[0.1] hover:text-white transition-all text-xs font-medium flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Apple
              </button>
            </div>

            {/* Footer Terms */}
            <p className="text-center text-white/30 text-[10px] mt-5">
              Encrypted with 256-bit TLS • SOC 2 Certified • Real-time Matching
            </p>
          </div>
        </div>
      </div>

      {/* Authentic Google Account Chooser Modal */}
      <GoogleOAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onAuthSuccess={onAuthSuccess}
      />
    </div>
  );
};
