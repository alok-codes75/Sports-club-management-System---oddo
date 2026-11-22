import React from 'react';
import { CLUB_BRAND } from '@/src/config/clubBrand';

interface ClubLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const MARK_SIZES = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
} as const;

const TEXT_SIZES = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
} as const;

export function ClubLogo({
  variant = 'light',
  size = 'md',
  showWordmark = true,
  className = '',
}: ClubLogoProps) {
  const uid = React.useId().replace(/:/g, '');
  const bgId = `usc-bg-${uid}`;
  const wingId = `usc-wing-${uid}`;

  return (
    <span className={`group/logo inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={`${MARK_SIZES[size]} shrink-0 transition-transform duration-200 ease-out group-hover/logo:-translate-y-0.5 group-hover/logo:scale-105`}
      >
        <defs>
          <linearGradient id={bgId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id={wingId} x1="16" y1="46" x2="50" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
        </defs>

        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="15"
          fill={`url(#${bgId})`}
          stroke={variant === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(29,78,216,0.22)'}
          strokeWidth="2"
        />

        {/* Secondary rising flight feather */}
        <path
          d="M17 29.5C22.2 29.2 27.2 26.2 32.8 20.6C36.4 17 40.2 14.6 44 13.5C41.8 18.4 38.2 23.8 33 28.4C27.8 32.9 22.4 34.8 17 34.2V29.5Z"
          fill="#93C5FD"
          fillOpacity="0.92"
          className="transition-transform duration-200 ease-out group-hover/logo:translate-x-[1px] group-hover/logo:-translate-y-[1px]"
        />

        {/* Primary soaring wing representing Udaan */}
        <path
          d="M15 39.5C21.5 39.5 27.5 35.5 34.5 27.5C39.2 22.1 44.5 18.2 50 16.5C47.5 23.2 43.2 30.8 36.2 37.2C29.5 43.3 21.8 46.2 15 45.5V39.5Z"
          fill={`url(#${wingId})`}
          className="transition-transform duration-200 ease-out group-hover/logo:translate-x-[1.5px] group-hover/logo:-translate-y-[1.5px]"
        />

        {/* Athletic Lime court trajectory & match ball */}
        <path
          d="M16 49.5C25.5 49.5 35.8 45.2 46.5 34.5"
          stroke="#84CC16"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle
          cx="46.5"
          cy="24.5"
          r="4.2"
          fill="#84CC16"
          className="transition-transform duration-200 ease-out origin-center group-hover/logo:scale-110"
        />
      </svg>

      {showWordmark && (
        <span
          className={`font-display ${TEXT_SIZES[size]} font-bold tracking-tight transition-colors duration-200 ${
            variant === 'dark'
              ? 'text-white group-hover/logo:text-lime-300'
              : 'text-slate-900 group-hover/logo:text-blue-700'
          }`}
        >
          {CLUB_BRAND.name}
        </span>
      )}
    </span>
  );
}
