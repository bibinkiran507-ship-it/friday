import React, { memo, useRef, useEffect, useState } from 'react';

interface CinematicBackgroundVideoProps {
  opacityClass?: string;
}

export const CinematicBackgroundVideo: React.FC<CinematicBackgroundVideoProps> = memo(
  function CinematicBackgroundVideo({ opacityClass = 'opacity-100' }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Handle visibility changes to conserve GPU/CPU when tab is inactive
      const handleVisibilityChange = () => {
        if (document.hidden) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Attempt immediate play
      video.play().catch(() => {
        // Autoplay may require user interaction or muted guarantee
      });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);

    return (
      <div className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#080A19] transition-opacity duration-700 ${opacityClass}`}>
        {/* Instant WebP poster backdrop to eliminate any flash or buffer freeze */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            backgroundImage: 'url(/videos/hero-poster.webp)',
          }}
        />

        {/* Faststart hardware-accelerated background video */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/videos/hero-poster.webp"
          onPlaying={() => setIsLoaded(true)}
          onLoadedData={() => setIsLoaded(true)}
        >
          {/* Web-optimized local faststart MP4 (moov at byte 36) */}
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
          {/* CDN fallback */}
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_092641_de52eb87-daf2-41db-92cb-7a56eae012a5.mp4"
            type="video/mp4"
          />
        </video>
      </div>
    );
  }
);
