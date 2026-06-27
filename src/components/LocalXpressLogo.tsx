import React from 'react';

interface LocalXpressLogoProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'color' | 'white' | 'dark';
}

export default function LocalXpressLogo({
  className = '',
  width = '100%',
  height = '100%',
  variant = 'color'
}: LocalXpressLogoProps) {
  // Define color palette based on variant
  const isWhite = variant === 'white';
  const isDark = variant === 'dark';
  
  const blueColor = isWhite ? '#FFFFFF' : isDark ? '#171717' : '#002855';
  const orangeColor = isWhite ? '#FFFFFF' : isDark ? '#E5531B' : '#FF6321';
  const accentBlue = isWhite ? '#FFFFFF' : isDark ? '#262626' : '#0D3E73';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 520 120"
      width={width}
      height={height}
      className={`select-none ${className}`}
      id="local-xpress-svg-logo"
    >
      {/* 1. "Local" Text Section */}
      <text
        x="15"
        y="80"
        fontFamily='"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        fontSize="54"
        fontWeight="900"
        fontStyle="italic"
        fill={blueColor}
        letterSpacing="-1.5"
      >
        Local
      </text>

      {/* 2. Speed Lines under "Local" */}
      {/* Line 1 (Top, Longest) */}
      <polygon 
        points="35,91 165,91 165,87 48,87" 
        fill={blueColor} 
        opacity="0.9"
      />
      {/* Line 2 (Middle) */}
      <polygon 
        points="55,97 150,97 150,94 68,94" 
        fill={blueColor} 
        opacity="0.75"
      />
      {/* Line 3 (Bottom, Shortest) */}
      <polygon 
        points="75,103 130,103 130,101 88,101" 
        fill={blueColor} 
        opacity="0.5"
      />

      {/* 3. The Stylized "X" & Orbit Loop */}
      <g transform="translate(15, 0)">
        {/* Orbital Loop - Blue Upper Portion */}
        <path 
          d="M 185,92 C 205,15 285,5 318,32" 
          stroke={accentBlue} 
          strokeWidth="4" 
          strokeLinecap="round" 
          fill="none" 
        />
        
        {/* Orbital Loop - Orange Lower Portion */}
        <path 
          d="M 318,32 C 298,112 212,120 185,92" 
          stroke={orangeColor} 
          strokeWidth="4" 
          strokeLinecap="round" 
          fill="none" 
        />

        {/* Diagonal Slash 1: Blue Curved Swoosh (top-left to bottom-right) */}
        <path 
          d="M 195,25 C 220,35 235,68 258,95 L 236,95 C 215,68 205,35 182,25 Z" 
          fill={blueColor} 
        />

        {/* Diagonal Slash 2: Orange Straight Bar (bottom-left to top-right) */}
        <polygon 
          points="212,95 264,25 285,25 233,95" 
          fill={orangeColor} 
        />
      </g>

      {/* 4. "press" Text Section */}
      <text
        x="315"
        y="80"
        fontFamily='"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        fontSize="54"
        fontWeight="900"
        fontStyle="italic"
        fill={orangeColor}
        letterSpacing="-1.5"
      >
        press
      </text>
    </svg>
  );
}
