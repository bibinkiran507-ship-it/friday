import React, { useState } from 'react';
import { UserPlus, UserMinus, ChevronDown, X, ArrowLeft } from 'lucide-react';

interface GoogleAccount {
  name: string;
  email: string;
  initial: string;
  avatarBg: string;
  status?: string;
  picture?: string;
}

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: { name: string; email: string; picture?: string }) => void;
}

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [view, setView] = useState<'chooser' | 'another_account'>('chooser');
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [removeMode, setRemoveMode] = useState(false);

  const [accounts, setAccounts] = useState<GoogleAccount[]>([
    {
      name: 'bibin kiran',
      email: 'cuckoo162cbe@gmail.com',
      initial: 'b',
      avatarBg: '#2e7d32', // Authentic Google green
      status: 'Signed out',
    },
    {
      name: 'Gausik GPS',
      email: 'gausikgps@gmail.com',
      initial: 'G',
      avatarBg: '#1a73e8', // Authentic Google blue
      status: 'Signed out',
    },
  ]);

  if (!isOpen) return null;

  const handleSelectAccount = (acc: GoogleAccount) => {
    if (removeMode) {
      setAccounts(accounts.filter((a) => a.email !== acc.email));
      return;
    }

    setLoadingAccount(acc.email);
    setTimeout(() => {
      onAuthSuccess({
        name: acc.name,
        email: acc.email,
        picture: acc.picture,
      });
      onClose();
    }, 750);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setCustomError('Enter a valid Google email address.');
      return;
    }

    const calculatedName =
      customName.trim() ||
      customEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newAcc: GoogleAccount = {
      name: calculatedName,
      email: customEmail.trim(),
      initial: calculatedName[0].toUpperCase(),
      avatarBg: '#1a73e8',
      status: '',
    };

    setLoadingAccount(newAcc.email);
    setTimeout(() => {
      onAuthSuccess({
        name: newAcc.name,
        email: newAcc.email,
      });
      onClose();
    }, 750);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in">
      {/* Dark Ambient Backdrop */}
      <div
        className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-full max-w-[820px] z-10 flex flex-col items-center">
        {/* The Google Card matching the screenshot */}
        <div className="w-full bg-[#1e1f20] border border-[#3c4043]/70 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-200">
          {/* Animated Google Progress Loading Bar */}
          {loadingAccount && (
            <div className="h-1 w-full bg-[#282a2c] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] animate-pulse w-full" />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-white/[0.08] transition-colors z-20"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {view === 'chooser' ? (
            /* ── Two-Column Layout (Matching Screenshot 2) ── */
            <div className="p-8 sm:p-12 sm:py-14 flex flex-col md:flex-row md:items-start justify-between gap-8 md:gap-12">
              {/* Left Column: Google Logo & "Choose an account" */}
              <div className="flex flex-col items-start md:max-w-[280px]">
                <svg width="40" height="40" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>

                <h2 className="text-[32px] sm:text-[36px] font-normal text-[#e3e3e3] leading-[1.18] tracking-tight mt-4 font-sans">
                  Choose an account
                </h2>

                <p className="text-[#c4c7c5] text-sm mt-3 leading-relaxed hidden md:block">
                  to continue to <span className="text-white font-medium">Apogee Pro Terminal</span>
                </p>
              </div>

              {/* Right Column: Rounded Account List Card */}
              <div className="flex-1 w-full md:max-w-[420px]">
                <div className="bg-[#141414]/70 border border-[#3c4043]/80 rounded-[20px] overflow-hidden divide-y divide-[#3c4043]/60">
                  {/* Account Items */}
                  {accounts.map((acc) => (
                    <div
                      key={acc.email}
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-3.5 px-4 flex items-center justify-between hover:bg-[#282a2c] cursor-pointer transition-colors group ${
                        loadingAccount === acc.email ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Circle Avatar (e.g. green 'b' for bibin kiran) */}
                        <div
                          style={{ backgroundColor: acc.avatarBg }}
                          className="w-9 h-9 rounded-full text-white font-medium text-[16px] flex items-center justify-center shrink-0 uppercase shadow-sm"
                        >
                          {acc.initial}
                        </div>

                        {/* Name and Email */}
                        <div className="min-w-0 text-left">
                          <div className="text-[14.5px] font-medium text-[#e3e3e3] group-hover:text-white truncate">
                            {acc.name}
                          </div>
                          <div className="text-[12.5px] text-[#c4c7c5] truncate font-normal">
                            {acc.email}
                          </div>
                        </div>
                      </div>

                      {/* Right Tag (Signed out / Remove) */}
                      <div className="shrink-0 pl-3">
                        {removeMode ? (
                          <span className="text-rose-400 text-xs hover:underline font-medium">
                            Remove
                          </span>
                        ) : acc.status ? (
                          <span className="text-[#9aa0a6] text-[12px] font-normal">
                            {acc.status}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {/* Use another account */}
                  <div
                    onClick={() => {
                      setView('another_account');
                      setCustomError(null);
                    }}
                    className="p-3.5 px-4 flex items-center gap-3.5 hover:bg-[#282a2c] cursor-pointer transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full border border-[#5f6368] flex items-center justify-center text-[#c4c7c5] group-hover:text-white shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-medium text-[#e3e3e3] group-hover:text-white text-left">
                      Use another account
                    </span>
                  </div>

                  {/* Remove an account */}
                  <div
                    onClick={() => setRemoveMode(!removeMode)}
                    className="p-3.5 px-4 flex items-center gap-3.5 hover:bg-[#282a2c] cursor-pointer transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full border border-[#5f6368]/60 flex items-center justify-center text-[#c4c7c5] group-hover:text-white shrink-0">
                      <UserMinus className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-medium text-[#e3e3e3] group-hover:text-white text-left">
                      {removeMode ? 'Done removing' : 'Remove an account'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── "Use Another Account" Google Sign-In Form ── */
            <div className="p-8 sm:p-12 sm:py-14 max-w-[500px] mx-auto text-left">
              <button
                type="button"
                onClick={() => setView('chooser')}
                className="inline-flex items-center gap-2 text-xs text-[#c4c7c5] hover:text-white mb-5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to accounts</span>
              </button>

              <svg width="36" height="36" viewBox="0 0 24 24" className="shrink-0 mb-3">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>

              <h2 className="text-[28px] font-normal text-[#e3e3e3] leading-tight font-sans">
                Sign in with Google
              </h2>
              <p className="text-[#c4c7c5] text-sm mt-1 mb-6">
                to continue to <span className="text-white font-medium">Apogee Pro Terminal</span>
              </p>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#c4c7c5] mb-1.5">
                    Email or phone
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="e.g. gausikgps@gmail.com"
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-lg bg-black/40 border border-[#5f6368] focus:border-[#8ab4f8] text-white text-sm focus:outline-none transition-all placeholder:text-[#5f6368]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#c4c7c5] mb-1.5">
                    Your Full Name (optional)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Gausik GPS"
                    className="w-full px-4 py-3 rounded-lg bg-black/40 border border-[#5f6368] focus:border-[#8ab4f8] text-white text-sm focus:outline-none transition-all placeholder:text-[#5f6368]"
                  />
                </div>

                {customError && (
                  <p className="text-rose-400 text-xs">{customError}</p>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setView('chooser')}
                    className="text-[#8ab4f8] text-sm font-medium hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#202124] font-medium text-sm transition-colors shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Footer (Matching Screenshot 2) */}
        <div className="w-full mt-4 px-3 flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#c4c7c5] gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
            <span>English (United States)</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Help</span>
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
