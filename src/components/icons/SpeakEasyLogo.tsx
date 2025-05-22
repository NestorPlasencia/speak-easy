// src/components/icons/SpeakEasyLogo.tsx
import type { SVGProps } from 'react';

export function SpeakEasyLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="150"
      height="37.5"
      aria-label="SpeakEasy Logo"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
          .logo-text { font-family: 'Quicksand', sans-serif; fill: url(#logoGradient); }
        `}
      </style>
      <text x="10" y="35" className="logo-text" fontSize="30" fontWeight="bold">
        SpeakEasy
      </text>
      {/* Optional: Small sound wave icon next to text */}
      <path d="M165 20 Q170 10, 175 20 T185 20 M170 30 Q175 40, 180 30 T190 30" stroke="hsl(var(--primary) / 0.7)" strokeWidth="2" fill="none" />
    </svg>
  );
}
