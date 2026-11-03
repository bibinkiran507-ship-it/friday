import { useState, useEffect } from 'react';
import { ChevronDown, Menu, X, ArrowUpRight, LogOut } from 'lucide-react';
import { useTrading } from '@/context/TradingContext';
import { useAuth } from '@/App';

const BAR_HEIGHTS = [
  23, 40, 53, 40, 33, 14, 7, 17, 75, 65,
  88, 75, 65, 47, 33, 88, 4, 7, 9, 14,
  95, 65, 79, 37, 7, 40, 17, 20, 62, 47,
  92, 72,
];

interface AnimateProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
}

function Animate({
  children,
  delay = 0,
  className = '',
  direction = 'up',
}: AnimateProps) {
  const directionMap = {
    up: 'animate-fade-up',
    down: 'animate-fade-down',
    left: 'animate-fade-left',
    right: 'animate-fade-right',
    scale: 'animate-fade-scale',
  };
  const directionClass = directionMap[direction];

  return (
    <div
      className={`opacity-0 ${directionClass} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function RevenueCard() {
  const maxHeight = Math.max(...BAR_HEIGHTS);
  const { setViewMode } = useTrading();

  return (
    <Animate delay={900} direction="scale" className="w-full max-w-[405px] mx-auto lg:mx-0">
      <div
        onClick={() => setViewMode('terminal')}
        className="w-full rounded-[24px] sm:rounded-[33px] bg-[rgba(17,16,15,0.35)] backdrop-blur-[20px] p-5 sm:p-8 pb-5 sm:pb-6 cursor-pointer hover:border-white/20 border border-transparent transition-all group"
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-white text-[16px] sm:text-[20px] font-[450] leading-[20px]">
            Trading Portfolio
          </p>
          <span className="text-[11px] font-mono text-blue-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Terminal <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <p className="mb-2 sm:mb-3">
          <span className="text-white text-[28px] sm:text-[46px] font-[450] leading-[1]">$14,205,890</span>
          <span className="text-white/20 text-[28px] sm:text-[46px] font-[450] leading-[1]">.00</span>
        </p>

        <div className="flex items-center gap-[10px] mb-6 sm:mb-8">
          <span className="px-[6px] py-[7px] bg-white/20 rounded-[6px] text-white text-[12px] sm:text-[14px] font-[450] leading-[14px]">
            +32.4%
          </span>
          <span className="text-white/80 text-[12px] sm:text-[14px] font-[450] leading-[14px] opacity-70">
            vs. previous period ($10.7M)
          </span>
        </div>

        <div className="relative">
          {/* Bars */}
          <div className="flex items-end gap-[1.5px] h-[80px] sm:h-[100px]">
            {BAR_HEIGHTS.map((h, i) => {
              const isProjected = i >= 28;
              const heightPercent = (h / maxHeight) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-[0.5px] animate-bar-grow origin-bottom"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: isProjected ? 'rgba(255,255,255,0.1)' : 'white',
                    animationDelay: `${1100 + i * 30}ms`,
                  }}
                />
              );
            })}
          </div>

          {/* Vertical gridlines */}
          <div className="absolute inset-0 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-white/10"
                style={{ left: `${((i + 1) / 5) * 100}%` }}
              />
            ))}
          </div>

          {/* Time axis */}
          <div className="flex justify-between mt-3">
            {['10:00', '12:00', '14:00', '16:00', '16:00'].map((time, i) => (
              <span
                key={i}
                className="text-[9px] sm:text-[10px] font-[450] leading-[10px] text-white/80"
                style={{ opacity: i >= 3 ? 0.4 : 1 }}
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Animate>
  );
}

const handleScrollToMarkets = () => {
  const el = document.getElementById('market-ticker');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

export default function Hero() {
  const { setViewMode } = useTrading();

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-between">
      <div className="relative z-10 flex-1 flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center py-12 sm:py-16">
          <div className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-12">
            <div className="max-w-[593px]">
              <Animate delay={300} direction="up">
                <h1 className="text-white text-[36px] sm:text-[52px] md:text-[64px] lg:text-[72px] font-normal leading-[0.95] mb-5 sm:mb-8">
                  Elevate your trading data to new heights
                </h1>
              </Animate>
              <Animate delay={500} direction="up">
                <p className="text-white/80 text-[16px] sm:text-[18px] md:text-[20px] font-[450] leading-[1.3] max-w-[370px] mb-7 sm:mb-10">
                  Advanced reasoning systems and predictive execution models built for institutional markets
                </p>
              </Animate>
              <Animate delay={700} direction="up">
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button
                    onClick={() => setViewMode('terminal')}
                    className="h-[46px] sm:h-[51px] px-5 sm:px-[27px] bg-[#E9E9E9] rounded-[12px] text-[#0A0707] text-[14px] sm:text-[15.5px] font-[450] leading-[15.5px] transition-all hover:bg-white hover:scale-[1.02] shadow-xl"
                  >
                    Launch Terminal
                  </button>
                  <button
                    onClick={handleScrollToMarkets}
                    className="h-[46px] sm:h-[51px] px-5 sm:px-[27px] rounded-[12px] border border-white text-white text-[14px] sm:text-[15.5px] font-[450] leading-[15.5px] transition-opacity hover:opacity-80"
                  >
                    Explore Markets
                  </button>
                </div>
              </Animate>
            </div>
            <RevenueCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const { setViewMode } = useTrading();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavClick = (view: 'landing' | 'terminal') => {
    setViewMode(view);
    setIsOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 w-full z-50 transition-all duration-300 bg-transparent border-b border-transparent backdrop-blur-none py-4 sm:py-5">
        <div className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] flex items-center justify-between">
        {/* (i) Logo */}
        <Animate delay={0} direction="down">
          <div
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 256 256"
              fill="none"
              className="sm:w-[32px] sm:h-[32px]"
            >
              <path
                d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z"
                fill="white"
              />
            </svg>
            <span className="text-white text-[22px] sm:text-[26px] font-[450] leading-none tracking-[-0.02em]">
              Apogee
            </span>
          </div>
        </Animate>

        {/* (ii) Center nav pill */}
        <Animate delay={100} direction="down" className="hidden lg:block">
          <div className="h-[52px] px-6 flex items-center gap-[30px] bg-[rgba(10,7,7,0.35)] rounded-[11px] backdrop-blur-[17px] border border-white/[0.06]">
            <button
              onClick={() => handleNavClick('terminal')}
              className="flex items-center gap-[5px] text-white/80 text-[14px] font-[450] leading-[14px] hover:text-white transition-colors"
            >
              <span>Terminal</span>
              <ChevronDown className="w-[10px] h-[10px] opacity-80" />
            </button>
            <span
              onClick={() => {
                const el = document.getElementById('market-ticker');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="cursor-pointer text-white/80 text-[14px] font-[450] leading-[14px] hover:text-white transition-colors"
            >
              Markets
            </span>
            <span
              onClick={() => handleNavClick('terminal')}
              className="cursor-pointer text-white/80 text-[14px] font-[450] leading-[14px] hover:text-white transition-colors"
            >
              AI Signals
            </span>
            <span
              onClick={() => {
                setViewMode('architecture');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer text-white/80 text-[14px] font-[450] leading-[14px] hover:text-white transition-colors"
            >
              Architecture
            </span>
          </div>
        </Animate>

        {/* (iii) Right auth pill */}
        <Animate delay={200} direction="down" className="hidden lg:block">
          <div className="h-[52px] p-[3px] bg-[rgba(0,0,0,0.35)] rounded-[13px] backdrop-blur-[17px] border border-white/[0.06] flex items-center gap-[6px]">
            {user && (
              <div className="flex items-center gap-2 px-3 text-white/80 text-[13px]">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-[11px] overflow-hidden shrink-0">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-medium max-w-[120px] truncate">{user.name}</span>
              </div>
            )}
            <button
              onClick={() => handleNavClick('terminal')}
              className="h-[46px] px-6 bg-[#E9E9E9] rounded-[11px] text-[#0A0707] text-[14px] font-[450] leading-[14px] hover:bg-white transition-colors"
            >
              Launch Terminal
            </button>
            {user && (
              <button
                onClick={signOut}
                title="Sign Out"
                className="h-[46px] px-3.5 rounded-[11px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 text-[13px] font-[450] transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            )}
          </div>
        </Animate>

        {/* (iv) Mobile hamburger */}
        <Animate delay={100} direction="down" className="lg:hidden">
          <button
            className="w-[44px] h-[44px] flex items-center justify-center rounded-[11px] bg-[rgba(10,7,7,0.35)] backdrop-blur-[17px] border border-white/[0.06] transition-colors hover:bg-white/10"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-5">
              <Menu
                className={`w-5 h-5 text-white absolute inset-0 transition-all duration-300 ease-out ${
                  isOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                className={`w-5 h-5 text-white absolute inset-0 transition-all duration-300 ease-out ${
                  isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                }`}
              />
            </div>
          </button>
        </Animate>
        </div>
      </nav>

      {/* (v) Mobile menu overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'visible' : 'invisible'
        }`}
      >
        <div
          className={`absolute inset-0 bg-[#080A19]/90 backdrop-blur-[24px] transition-opacity duration-500 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`absolute top-[76px] sm:top-[86px] left-4 right-4 sm:left-6 sm:right-6 bg-[rgba(17,16,15,0.6)] backdrop-blur-[30px] rounded-[20px] border border-white/[0.06] p-6 sm:p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-top ${
            isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-[0.97]'
          }`}
        >
          <div className="flex flex-col gap-1">
            {[
              { name: 'Live Terminal', action: () => handleNavClick('terminal') },
              { name: 'Markets', action: () => { setIsOpen(false); handleScrollToMarkets(); } },
              { name: 'AI Reasoning', action: () => handleNavClick('terminal') },
              { name: 'Architecture', action: () => { setIsOpen(false); setViewMode('architecture'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
            ].map((item, i) => (
              <button
                key={item.name}
                onClick={item.action}
                className={`flex items-center justify-between px-4 py-4 rounded-[12px] text-white/90 text-[18px] font-[450] hover:bg-white/[0.06] transition-all duration-300 text-left ${
                  isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'
                }`}
                style={{ transitionDelay: isOpen ? `${100 + i * 50}ms` : '0ms' }}
              >
                <span>{item.name}</span>
                {item.name === 'Live Terminal' && <ChevronDown className="w-4 h-4 opacity-50" />}
              </button>
            ))}
          </div>
          <div className="h-px bg-white/10 my-5" />
          <div
            className={`flex flex-col gap-3 transition-all duration-300 ${
              isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            style={{ transitionDelay: isOpen ? '350ms' : '0ms' }}
          >
            {user && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-[12px] bg-white/[0.05] border border-white/[0.08] text-white text-[14px]">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-[12px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium leading-none">{user.name}</span>
                  <span className="text-white/40 text-[11px] leading-none mt-1">{user.email}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => handleNavClick('terminal')}
              className="w-full h-[50px] bg-[#E9E9E9] rounded-[12px] text-[#0A0707] text-[15px] font-[450] transition-colors hover:bg-white"
            >
              Launch Terminal
            </button>
            {user && (
              <button
                onClick={() => { setIsOpen(false); signOut(); }}
                className="w-full h-[50px] rounded-[12px] border border-rose-500/30 text-rose-300 bg-rose-500/10 text-[15px] font-[450] transition-colors hover:bg-rose-500/20 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
